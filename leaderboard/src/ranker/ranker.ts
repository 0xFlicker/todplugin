/*
 * Converted to Typescript from https://github.com/Ruberik/google-app-engine-ranklist
 *
 * License: Apache 2.0 (Open source w/ attribution)
 *
 * Modifications:
 *  - Python tuples generally converted to spread arrays
 *  - Javascript version of Python array equality and range function
 *  - Use DynamoDB instead of Firestore for storage
 *  - Safe batching of writes
 *  - Using debounce queue instead of transaction decorators
 *  - Separately keeps track of a leaderboard as well as a ranking tree
 *  - Scores support additional meta data past name and value
 *
 */

import logger from "../utils/debug";
import { scoreLT, scoreSort } from "../utils/score";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { TableLeaderboards, TableNodes, TableScores } from "../db/dynamodb";

const log = logger("trace:ranker");

export interface RankerOpts {
  rootKey: string;
  scoreRange: number[];
  branchingFactor: number;
  debounceOptions?: {
    delay?: number;
    maxDelay?: number;
    maxSize?: number;
  };
  period?: number;
  leaderboardSize?: number;
  db: DocumentClient;
}

export interface Ranker {
  expireScores(): Promise<TableScores[]>;
  removeScores(scores: string[]): Promise<TableScores[]>;
  setScores(
    scores: Partial<TableScores>[]
  ): Promise<[TableScores[], TableScores[]]>;
  totalRankedScore(): Promise<number>;
  fetchScore(playerId: string): Promise<TableScores | null>;
  findScore(rank: number): Promise<null | [number[], number]>;
  findRanks(scores: number[][]): Promise<number[]>;
  leaderboardUpdate(
    input: TableScores[],
    output: TableScores[]
  ): Promise<TableScores[]>;
  leaderboard(): Promise<TableScores[]>;
  rootPath(): string;
}

interface KeyToDataMap<T> {
  [key: string]: T;
}
function arrayEq(a1: Array<any>, a2: Array<any>): boolean {
  return a1.length === a2.length && a1.every((a, i) => a === a2[i]);
}

function pRange(array: any[], start?: number, stop?: number, step?: number) {
  return array.filter((_: any, i: number) => {
    return (
      (typeof start === "undefined" || start <= i) &&
      (typeof stop === "undefined" || i <= stop) &&
      (typeof step === "undefined" || (i - (start || 0)) % step === 0)
    );
  });
}

function sum(arr: number[]): number {
  return arr.reduce((a: number, b: number) => a + b, 0);
}

interface ScoreDeltaMap {
  get(score: (number | string)[]): undefined | number;
  has(score: (number | string)[]): boolean;
  set(score: (number | string)[], delta: number): void;
  entries(): IterableIterator<[(number | string)[], number]>;
}

/**
 * Original implemention used a Python map of tuples (array of numbers) to scores. Because of the differences in array equality between python an JS we need this
 */
function createScoreDeltaMap(): ScoreDeltaMap {
  const map = new Map<string, number>();
  const keyCache = new Map<(number | string)[], string>();
  function resolveKey(score: (number | string)[]): string {
    let key: string;
    if (keyCache.has(score)) {
      key = <string>keyCache.get(score);
    } else {
      key = JSON.stringify(score);
      keyCache.set(score, key);
    }
    return key;
  }
  const selfie: ScoreDeltaMap = {
    get(score: (number | string)[]) {
      return map.get(resolveKey(score));
    },
    has(score: (number | string)[]) {
      return map.has(resolveKey(score));
    },
    set(score: (number | string)[], value: number) {
      return map.set(resolveKey(score), value);
    },
    entries() {
      const mapItr = map.entries();
      const selfieItr: IterableIterator<[number[], number]> = {
        next() {
          const next = mapItr.next();
          if (next.done) {
            return {
              value: <[number[], number]>(<unknown>undefined),
              done: true,
            };
          }
          const [score, delta] = next.value;
          return {
            value: [<number[]>JSON.parse(score), delta],
            done: false,
          };
        },
        [Symbol.iterator]() {
          return selfieItr;
        },
      };
      return selfieItr;
    },
  };
  return selfie;
}

function leaderboardRemove(scores: TableScores[], scoreEntsDel: string[]) {
  return scores.filter(({ Player_ID }) => !scoreEntsDel.includes(Player_ID));
}

/**
 * Creates a leaderboard and score ranker capable of quickly ranking scores and tracking players on a leaderboard
 *
 * @param opts Leaderboard configuration
 * @param opts.rootKey The name of this leaderboard to namespace it from all other leaderboards
 * @param opts.scoreRange The range of scores allowed. Should always be in pairs
 * @param opts.branchingFactor An optimization strategy for tree branching. How many scores does each node contain
 * @param opts.leaderboardSize The number of names belonging to scores to track. Default is Infinity (track the names of all scores)
 * @param opts.period The time in seconds that a score will remain on the leaderboard
 * @param opts.db A Firestore like DB to store data
 *
 * @returns A Ranker
 */
async function createRanker({
  rootKey,
  scoreRange,
  branchingFactor,
  leaderboardSize = 1000,
  period = -1,
  db,
}: RankerOpts): Promise<Ranker> {
  if (!db) {
    throw new Error("Must define a db for the ranker");
  }
  let isInitializing: boolean | Promise<void> = false;
  async function lazy() {
    await db
      .put({
        TableName: "boards",
        Item: {
          Name: rootKey,
          Score_Range: scoreRange,
          Branching_Factor: branchingFactor,
          Leaderboard_Size: leaderboardSize,
          Period: period,
        },
      })
      .promise();
  }

  function lazyInit<T extends Function>(func: T) {
    return async (...args: any[]) => {
      if (!isInitializing) {
        isInitializing = lazy();
      }
      if (typeof isInitializing !== "boolean") {
        await isInitializing;
        isInitializing = true;
      }
      return func(...args);
    };
  }

  const bf = BigInt(branchingFactor);

  // Sanity checking
  if (scoreRange.length <= 1) {
    throw new Error("Rankings must be a ranger of at least than 2");
  }
  if (scoreRange.length % 2 !== 0) {
    throw new Error("Rankings must be in pairs");
  }
  for (let i = 0; i < scoreRange.length; i += 2) {
    if (scoreRange[i] > scoreRange[i + 1]) {
      throw new Error(
        `Score pairs must be in ascending order and not ${scoreRange[i]}, ${
          scoreRange[i + 1]
        }`
      );
    }
  }
  if (branchingFactor <= 1) {
    throw new Error("Branching factor must be greater than 1");
  }

  /*
   * private methods
   */

  /**
   * Calculates the score_range for a node's child.
   *
   * @param scoreRange A score range [min0, max0, min1, max1, ...]
   * @param child Which child of the node with score range score_range we're calculating the score range of.
   * @returns A score range [min0', max0', min1', max1', ...] for that child.
   */
  function childScoreRange(
    scoreRange: Array<number>,
    child: number
  ): Array<number> {
    const bChild = BigInt(child);
    for (let i = 1; i < scoreRange.length; i += 2) {
      if (scoreRange[i] > scoreRange[i - 1] + 1) {
        const childScoreRange = Array(scoreRange.length);
        const low = BigInt(scoreRange[i - 1]);
        const high = BigInt(scoreRange[i]);
        childScoreRange[i - 1] = Number(low + (bChild * (high - low)) / bf);
        childScoreRange[i] = Number(low + ((bChild + 1n) * (high - low)) / bf);
        return childScoreRange;
      }
    }
    throw Error(`Node with score range ${scoreRange} has no children`);
  }

  /**
   * Determines which child of the range [low, high) 'want' belongs to.
   *
   * @param low the low end of the range
   * @param high the high end of the range
   * @param want the score we're trying to determine a child for
   *
   * @returns A tuple, (child, [child's score range]).  Note that in general a score has multiple sub-scores, written in order of decreasing significance; this function divides up a single sub-score.
   */
  function whichChild(
    low: number,
    high: number,
    want: number
  ): [number, number[]] {
    log(() => `-> whichChild(low: ${low}, high: ${high}, want: ${want})`);
    const bLow = BigInt(low);
    const bHigh = BigInt(high);
    const bWant = BigInt(want);
    // Need to find x such that (using integer division):
    //     x  *(high-low)/branching_factor <= want - low <
    //   (x+1)*(high-low)/branching_factor
    // Which is the least x such that (using integer division):
    //   want - low < (x+1)*(high-low)/branching_factor
    // Which is the ceiling of x such that (using floating point division):
    //   want - low + 1 == (x+1)*(high-low)/branching_factor
    //   x = -1 + math.ceil((want-low+1) * branching_factor / (high - low))
    // We get ceil by adding high - low - 1 to the numerator.
    if (!(bLow <= want && want < bHigh)) {
      throw new Error(
        `Invalid operation bLow: ${bLow}, bWant: ${bWant}, bHigh: ${bHigh}`
      );
    }
    const x =
      -1n + ((bWant - bLow + 1n) * bf + bHigh - bLow - 1n) / (bHigh - bLow);
    if (
      !(
        x * ((bHigh - bLow) / bf) <= bWant - bLow &&
        bWant - bLow < ((x + 1n) * (bHigh - bLow)) / bf
      )
    ) {
      log(
        () =>
          `WARNING: ${(x * (bHigh - bLow)) / bf} <= ${bWant - bLow} < ${
            (x + 1n) * ((bHigh - bLow) / bf)
          }`
      );
      throw new Error(
        `Invalid operation x: ${x}, bLow: ${bLow}, bWant: ${bWant}, bHigh: ${bHigh}`
      );
    }
    const nx = Number(x);
    log(
      () =>
        `<- whichChild: ${JSON.stringify([
          nx,
          childScoreRange([low, high], nx),
        ])}`
    );
    return [nx, childScoreRange([low, high], nx)];
  }

  /**
   * Calculates the node id for a known node id's child.
   *
   * @param nodeId The parent node's node_id
   * @param child Which child of the parent node we're finding the id for
   * @returns The node_id for the child'th child of node_id.
   */
  function childNodeId(nodeId: number, child: number): number {
    return nodeId * branchingFactor + 1 + child;
  }

  /**
   * Finds the nodes along the path from the root to a certain score.
   *
   * Nodes are numbered row-by-row: the root is 0, its children are in the range
   * `[1, self.branching_factor + 1)`, its grandchildren are in the range
   * `[self.branching_factor + 1, self.branching_factor**2 + self.branching_factor + 1)`, etc.
   *
   * Score ranges are lists of the form: [min_0, max_0, min_1, max_1, ...]
   * A node representing a score range will be divided up by the first index
   * where `max_i != min_i + 1` (score ranges are [inclusive, exclusive)).
   *
   * Child x (0-indexed) of a node [a,b) will get the range:
   * `[a+x*(b-a)/branching_factor, a+(x+1)*(b-a)/branching_factor)`;
   * Thus not all nodes will have nonzero ranges.  Nodes with zero range will
   * never be visited, but they and their descendants will be counted in the node
   * numbering scheme, so row x still has `branchingFactor**x` nodes.
   *
   * @param score A single score value
   * @returns A sorted list of (node_id, child) tuples, indicating that node_id is the node id of a node on the path, and child is which child of that node is next.  Note that the lowest child node (which would be a leaf node) does not actually exist, since all its relevant information (number of times that score was inserted) is stored in its parent.
   */
  function findNodeIds(score: number[]) {
    log(() => `-> findNodeIds([${score.join(", ")}])`);
    const nodes: Array<[number, number]> = [];
    let node = 0;
    const curRange = [...scoreRange];
    for (let index = 0; index <= curRange.length; index += 2) {
      log(() => `Checking index: ${index}`);
      while (curRange[index + 1] - curRange[index] > 1) {
        const wChild = whichChild(
          curRange[index],
          curRange[index + 1],
          score[Number(BigInt(index) / BigInt(2))]
        );
        log("Checking wChild:", wChild);
        const [child] = wChild;
        curRange[index] = wChild[1][0];
        curRange[index + 1] = wChild[1][1];
        if (!(0 <= child && child < branchingFactor)) {
          throw new Error("Invalid child range");
        }
        nodes.push([node, child]);
        node = childNodeId(node, child);
      }
    }
    log(() => `<- findNodeIds [${nodes.join(",")}]`);
    return nodes;
  }

  /**
   * Creates a (named) key for the node with a given id. The key will have the ranker as a parent element to guarantee uniqueness (in the presence of multiple rankers) and to put all nodes in a single entity group.
   *
   * @param nodeId
   */
  function keyFromNodeId(nodeId: number): string {
    return `node_${nodeId}`;
  }

  /**
   *  Retrives nodes from DB
   *
   * @param nodeIds A list of node ids we want to get.
   * @returns Map of node id paths to nodes
   */
  async function getMultipleNodes(
    nodeIds: number[]
  ): Promise<{ [key: number]: TableNodes }> {
    log(() => `-> getMultipleNodes(nodeIds: ${JSON.stringify(nodeIds)})`);
    if (nodeIds.length === 0) {
      return Promise.resolve({});
    }
    // Make sure all values are uniqe
    const nodeIdsSet = new Set(nodeIds);
    const keys = [...nodeIdsSet].map(keyFromNodeId).map((key) => ({
      Node_ID: key,
      Board_Name: rootKey,
    }));
    const nodeRequest = await db
      .batchGet({
        RequestItems: {
          nodes: {
            Keys: keys,
          },
        },
      })
      .promise();
    const nodes = nodeRequest.Responses?.nodes
      ? (nodeRequest.Responses?.nodes as DocumentClient.AttributeMap[]).reduce(
          (memo, result) => {
            memo[result.Node_ID] = result;
            return memo;
          },
          {}
        )
      : {};
    return nodes;
  }

  /**
   * Changes child counts for given nodes.
   *
   * This method will create nodes as needed.
   *
   * @param nodesWithChildren A dict of (node_key, child) tuples to deltas
   * @param scores Additional score entities to persist as part of this transaction
   * @param scoresToDelete Additional scores to delete
   */
  async function increment(
    nodesWithChildren: ScoreDeltaMap,
    scores: KeyToDataMap<TableScores>,
    scoresToDelete: string[]
  ) {
    log(
      () =>
        `-> increment nodesWithChildren: ${JSON.stringify([
          ...nodesWithChildren.entries(),
        ])} scores: ${JSON.stringify(scores)} scoresToDelete: ${JSON.stringify(
          scoresToDelete
        )}`
    );
    const nodeChildrenEntries = [...nodesWithChildren.entries()];
    log("nodeChildrenEntries:", nodeChildrenEntries);
    const keys = [
      ...new Set(
        nodeChildrenEntries
          .filter((entry) => entry[1] !== 0)
          .map(([[key]]) => <string>key)
      ),
    ];
    if (keys.length === 0) {
      log("Nothing to do");
      return; // nothing to do
    }
    const nodeResponse = await db
      .batchGet({
        RequestItems: {
          nodes: {
            Keys: keys.map((key) => ({ Node_ID: key, Board_Name: rootKey })),
          },
        },
      })
      .promise();
    const nodes: Array<[string, TableNodes]> = (
      nodeResponse.Responses?.nodes || []
    ).map((result) => [<string>result.Node_ID, <TableNodes>result]);
    const nodeDict: KeyToDataMap<TableNodes> = {};
    for (let [key, node] of nodes) {
      nodeDict[key] = node;
    }
    for (let [[key, child], amount] of nodeChildrenEntries) {
      if (amount !== 0) {
        let node = nodeDict[key];
        if (!node) {
          node = {
            Node_ID: key.toString(),
            Board_Name: rootKey,
            Child_Counts: Array(branchingFactor).fill(0),
          };
        }
        node.Child_Counts[child] = node.Child_Counts[child] || 0;
        log(
          `Adjust: ${node.Child_Counts[child]} += ${amount} node: ${key} child: ${child}`
        );
        node.Child_Counts[child] += amount;
        if (node.Child_Counts[child] < 0) {
          log(
            `Invalid childCount value: ${node.Child_Counts[child]} amount: ${amount} node: ${key} child: ${child}`
          );
        }
        nodeDict[key] = node;
      }
    }

    // const [writeDbBatched, empty] = debounceQueue<
    //   DocumentClient.TransactWriteItem,
    //   void
    // >(
    const nodesToUpdate = Object.values(nodeDict);
    let scoresToUpdate = Object.values(scores);

    // Remove any scoresToUpdate that are also marked for deletion
    scoresToUpdate = scoresToUpdate.filter(
      (score) => !scoresToDelete.includes(score.Player_ID)
    );

    if (
      nodesToUpdate.length ||
      scoresToUpdate.length ||
      scoresToDelete.length
    ) {
      const writeRequest = {
        RequestItems: {
          ...(nodesToUpdate.length
            ? {
                nodes: nodesToUpdate.map((data) => {
                  return {
                    PutRequest: {
                      Item: data,
                    },
                  };
                }),
              }
            : {}),
          ...(scoresToUpdate.length || scoresToDelete.length
            ? {
                scores: [
                  ...scoresToUpdate.map((data) => {
                    return {
                      PutRequest: {
                        Item: data,
                      },
                    };
                  }),
                  ...scoresToDelete.map((key) => ({
                    DeleteRequest: {
                      Key: {
                        Player_ID: key,
                        Board_Name: rootKey,
                      },
                    },
                  })),
                ],
              }
            : {}),
        },
      };
      try {
        await db.batchWrite(writeRequest).promise();
      } catch (e) {
        log(() => `Error updating nodes: ${e}`);
        console.error(JSON.stringify(writeRequest), e);
        throw e;
      }
    }
    //   async (work: DocumentClient.TransactWriteItem[]) => {
    //     const batch = db.transactWrite({
    //       TransactItems: work,
    //     });
    //     await batch.promise();
    //   },
    //   {
    //     maxSize: 25,
    //     delay: 0,
    //   }
    // );
    // Object.entries(nodeDict).forEach(([key, data]) =>
    //   writeDbBatched({
    //     Put: {
    //       TableName: "nodes",
    //       Item: data,
    //     },
    //   })
    // );
    // Object.entries(scores).forEach(([key, data]) =>
    //   writeDbBatched({
    //     Put: {
    //       TableName: "scores",
    //       Item: data,
    //     },
    //   })
    // );
    // scoresToDelete.forEach((key) =>
    //   writeDbBatched({
    //     Delete: {
    //       TableName: "scores",
    //       Key: {
    //         Player_ID: key,
    //       },
    //     },
    //   })
    // );
    // await empty();
  }

  /**
   * Compute which scores have to be incremented and decremented
   *
   * @param scores A dict mapping entity names to scores
   *
   * @returns A tuple (score_deltas, score_entities, score_entities_to_delete).
   *
   * 'score_deltas' is a dict, mapping scores (represented as tuples)
   *  to integers. 'score_deltas[s]' represents how many times the
   *  score 's' has to be incremented (or decremented).
   *  'score_entities' is a list of 'ranker_score' entities that have
   *  to be updated in the same transaction as modifying the ranker
   *  nodes. The entities already contain the updated score.
   *  Similarly, 'score_entities_to_delete' is a list of entities that
   *  have to be deleted in the same transaction as modifying the ranker
   *  nodes.
   */
  async function computeScoreDeltas(
    scores: TableScores[],
    scoresToRemove: TableScores[]
  ): Promise<
    [
      ScoreDeltaMap,
      {
        [key: string]: TableScores;
      },
      string[]
    ]
  > {
    log(
      () =>
        `-> computeScoreDeltas scores: ${JSON.stringify(
          scores
        )} scoresToRemove: ${JSON.stringify(scoresToRemove)}`
    );
    const scoreKeys = scores.map(({ Player_ID: id }) => id);
    const scoreDocs = scoreKeys.length
      ? await db
          .batchGet({
            RequestItems: {
              scores: {
                Keys: scoreKeys.map((key) => ({
                  Player_ID: key,
                  Board_Name: rootKey,
                })),
              },
            },
          })
          .promise()
      : { Responses: { scores: [] } };

    const saveNodes: Array<[string, TableScores]> = scoreDocs?.Responses?.scores
      ? (scoreDocs?.Responses?.scores as DocumentClient.AttributeMap[]).map(
          (result) => [result.Player_ID, <TableScores>result]
        )
      : [];
    const oldScores = {};
    for (let [key, oldScore] of saveNodes) {
      if (oldScore) {
        oldScores[key] = oldScore;
      }
    }
    const scoreDeltas = createScoreDeltaMap();
    const scoreEnts = {};
    const scoreEntsDel: Array<string> = [];
    for (let { Player_ID: id, Score: value } of scoresToRemove) {
      scoreDeltas.set(value, (scoreDeltas.get(value) || 0) - 1);
      scoreEntsDel.push(id);
    }
    for (let { Player_ID: id, Date: date, Score: value } of scores) {
      let newScore: TableScores;
      log(() => `computing ${id}: [${value.join(", ")}]`);
      const scoreKey = id;
      if (scoreKey in oldScores) {
        newScore = oldScores[scoreKey];
        log(() => `creating -1 delta for ${JSON.stringify(newScore.Score)}`);
        scoreDeltas.set(
          newScore.Score,
          (scoreDeltas.get(newScore.Score) || 0) - 1
        );
      } else {
        log("new score");
        newScore = {
          Board_Name: rootKey,
          Player_ID: id,
          Score: [],
          Date: date,
        };
      }
      if (value) {
        log(() => `creating +1 delta for ${JSON.stringify(value)}`);
        scoreDeltas.set(value, (scoreDeltas.get(value) || 0) + 1);
        newScore.Score = value;
        newScore.Date = date;
        scoreEnts[scoreKey] = newScore;
      } else if (id in oldScores) {
        log(`delete ${scoreKey}`);
        scoreEntsDel.push(scoreKey);
      }
    }
    log(
      () =>
        `<- computeScoreDeltas ${JSON.stringify([
          [...scoreDeltas.entries()],
          scoreEnts,
          scoreEntsDel,
        ])}`
    );
    return Promise.resolve([scoreDeltas, scoreEnts, scoreEntsDel]);
  }

  /**
   * Computes modifications to ranker nodes.
   *
   * Given score deltas, computes which nodes need to be modified and by
   * how much their child count has to be incremented / decremented.
   *
   * @param scoreDeltas A dict of scores to integers, as returned by computeScoreDeltas.
   *
   * @returns A dict of nodes (represented as node_key, child tuples) to integers.
   * 'result[(node_key, i)]' represents the amount that needs to be added to the i-th
   * child of node node_key.
   */
  function computeNodeModifications(scoreDeltas: ScoreDeltaMap): ScoreDeltaMap {
    log(
      () =>
        `-> computeNodeModifications ${JSON.stringify([
          ...scoreDeltas.entries(),
        ])}`
    );
    const nodeToDeltas = createScoreDeltaMap();
    for (let [score, delta] of scoreDeltas.entries()) {
      log(() => `Computing node score: ${score}, delta: ${delta}`);
      for (let [nodeId, child] of findNodeIds(score as number[])) {
        const node = [keyFromNodeId(nodeId), child];
        nodeToDeltas.set(node, (nodeToDeltas.get(node) || 0) + delta);
      }
    }
    log(
      () =>
        `<- computeNodeModifications ${JSON.stringify([
          ...nodeToDeltas.entries(),
        ])}`
    );
    return nodeToDeltas;
  }

  /**
   * Utility function.  Finds the rank of a score.
   *
   * @param nodeIdsWithChildren A list of node ids down to that score, paired with which child links to follow.
   * @param nodes A dict mapping node id to node entity
   *debounceQueue
   * @returns The score's rank.
   */
  function findRankForNodes(
    nodeIdsWithChildren: [number, number][],
    nodes: { [key: number]: TableNodes }
  ): number {
    let tot = 0;
    for (let [nodeId, child] of nodeIdsWithChildren) {
      const key = keyFromNodeId(nodeId);
      if (key in nodes) {
        const node = nodes[key];
        for (let i = child + 1; i <= branchingFactor; i++) {
          if (node.Child_Counts[i]) {
            tot += node.Child_Counts[i];
          }
        }
      }
    }
    return tot;
  }

  /**
   * Calculates the scoreRange for a node's child.
   *
   * @param scoreRange A score range [min0, max0, min1, max1, ...]
   * @param child Which child of the node with score range score_range we're calculating the score range of.
   *
   * @returns A score range [min0', max0', min1', max1', ...] for that child.
   */
  function calcChildScoreRange(scoreRange: number[], child: number): number[] {
    log(
      () =>
        `-> calcChildScoreRange(scoreRange: ${JSON.stringify(
          scoreRange
        )} child: ${child})`
    );
    const bChild = BigInt(child);
    for (let i = 1; i <= scoreRange.length; i += 2) {
      if (scoreRange[i] > scoreRange[i - 1] + 1) {
        const childScoreRange = [...scoreRange];
        const low = BigInt(scoreRange[i - 1]);
        const high = BigInt(scoreRange[i]);

        childScoreRange[i - 1] = Number(low + (bChild * (high - low)) / bf);
        childScoreRange[i] = Number(low + ((bChild + 1n) * (high - low)) / bf);
        log(() => `<- calcChildScoreRange: ${JSON.stringify(childScoreRange)}`);
        return childScoreRange;
      }
    }
    throw new Error(
      `Node with score range [${scoreRange.join(", ")}] has no children`
    );
  }

  /**
   * Calculates the node id for a known node id's child.
   *
   * @param nodeId The parent node's node_id
   * @param child Which child of the parent node we're finding the id for
   *
   * @returns The node_id for the child'th child of node_id.
   */
  function getChildNodeId(nodeId: number, child: number): number {
    const ret = nodeId * branchingFactor + 1 + child;
    log(() => `getChildNodeId(nodeId: ${nodeId} child:${child}) => ${ret}`);
    return ret;
  }

  /**
   * To be run in a transaction.  Finds the score ranked 'rank' in the subtree defined by node 'nodekey.'
   *
   * @param nodeId The id of the node whose subtree we wish to find the score of rank 'rank' in.
   * @param rank The rank (within this subtree) of the score we wish to find.
   * @param scoreRange The score range for this particular node, as a list. Derivable from the node's node_id, but included for convenience.
   * @param approximate Do we have to return an approximate result, or an exact one? See the docstrings for findScore and findScoreApproximate.
   *
   * @returns An array [score, rank_of_tie], indicating the score's rank within nodeid's subtree.  The way it indicates rank is defined in the dosctrings of findScore and findScoreApproximate, depending on the value of 'approximate'.
   */
  async function findScoreRecursive(
    nodeId: number,
    rank: number,
    scoreRange: number[],
    approximate: boolean,
    depth: number = 0
  ): Promise<null | [number[], number]> {
    log(
      () =>
        `${" ".repeat(
          depth
        )}-> findScoreRecursive(nodeId: ${nodeId} rank: ${rank} scoreRange: ${scoreRange})`
    );
    if (approximate && rank === 0) {
      return Promise.resolve([
        pRange(scoreRange, 1, undefined, 2).map((s: number) => s - 1),
        0,
      ]);
    }
    const node = await db
      .get({
        TableName: "nodes",
        Key: {
          Node_ID: keyFromNodeId(nodeId),
          Board_Name: rootKey,
        },
      })
      .promise();

    // log(() => `${' '.repeat(depth)}childCounts: ${JSON.stringify(childCounts)}`)
    const initialRank = rank;
    for (let i = branchingFactor - 1; i >= 0; i--) {
      // log(() => `${' '.repeat(depth)}loop: ${i} rank: ${rank} childCounts[i]: ${childCounts[i]}`)
      if (node.Item) {
        const nodeData = <TableNodes>node.Item;
        const { Child_Counts: childCounts } = nodeData;
        const childElement =
          childCounts[(i < 0 ? childCounts.length - 1 : 0) + i];
        if (rank - childElement < 0) {
          const childScoreRange = calcChildScoreRange(scoreRange, i);
          if (isSingletonRange(childScoreRange)) {
            log(() => `${" ".repeat(depth)}Base case`);
            return Promise.resolve([
              pRange(childScoreRange, 0, undefined, 2),
              initialRank - rank,
            ]);
          }
          const ans = await findScoreRecursive(
            getChildNodeId(nodeId, i),
            rank,
            childScoreRange,
            approximate,
            depth + 1
          );
          if (!ans) {
            throw new Error(
              `broken with childScoreRange: ${childScoreRange} i: ${i}`
            );
          }
          log(
            () =>
              `${" ".repeat(depth)}<- findScoreRecursive: ${JSON.stringify([
                ans[0],
                ans[1] + (initialRank - rank),
              ])}`
          );
          return Promise.resolve([ans[0], ans[1] + (initialRank - rank)]);
        } else {
          if (childElement) {
            rank -= childElement;
          }
        }
      } else {
        log(() => `No node ${nodeId} exists`);
      }
    }
    log(() => `${" ".repeat(depth)}<- findScoreRecursive: null`);
    return Promise.resolve(null);
  }

  /**
   * Returns whether a range contains exactly one score.
   *
   * @param scoreRange
   */
  function isSingletonRange(scoreRange: number[]): boolean {
    const first = pRange(scoreRange, 0, undefined, 2);
    const second = pRange(scoreRange, 1, undefined, 2);
    const ret = arrayEq(
      first.map((s) => s + 1),
      second
    );
    log(
      () =>
        `-> isSingletonRange(scoreRange: ${JSON.stringify(
          scoreRange
        )}) => ${ret}`
    );
    return ret;
  }

  async function expireScores() {
    const expiredLeaderboardEntries = await expiredScores();
    await leaderboardUpdate([], expiredLeaderboardEntries);
    return expiredLeaderboardEntries;
  }

  async function expiredScores(): Promise<TableScores[]> {
    const now = Date.now() / 1000;
    const rootResponse = await db
      .get({
        TableName: "leaderboards",
        Key: {
          Board_Name: rootKey,
        },
      })
      .promise();
    const { Scores: scores = [] }: { Scores?: TableScores[] } =
      rootResponse.Item || {};
    log(
      () =>
        `Checking ${
          scores.length
        } scores for expiration period ${period}: ${scores.map(
          ({ Date: date }) => {
            const scoreDataDate = new Date(date);
            return scoreDataDate.getTime() / 1000;
          }
        )} now: ${now}`
    );

    const oldScores = scores.filter((scoreData: TableScores) => {
      if (period === -1) {
        return false;
      }
      const scoreDataDate = new Date(scoreData.Date);
      return scoreDataDate.getTime() / 1000 + period < now;
    });
    log(() => `Expiring ${oldScores.length} scores at ${now}`);
    return oldScores;
  }

  /*
   * Public methods
   */

  /**
   * For a given score, return the ranking on the leadboard
   *
   * @param rank A numeric rank
   *
   * @returns The score for that rank
   */
  async function findScore(rank: number) {
    return findScoreRecursive(0, rank, scoreRange, false);
  }

  async function fetchScore(playerId: string): Promise<TableScores | null> {
    const response = await db
      .get({
        TableName: "scores",
        Key: {
          Player_ID: playerId,
          Board_Name: rootKey,
        },
      })
      .promise();
    if (!response.Item) {
      return null;
    }
    return response.Item as TableScores;
  }

  /**
   * Returns the total number of ranked scores.
   *
   * @returns {Promise<number>} The total number of ranked scores.
   */
  async function totalRankedScore(): Promise<number> {
    const rootResult = await db
      .get({
        TableName: "nodes",
        Key: {
          Node_ID: keyFromNodeId(0),
          Board_Name: rootKey,
        },
      })
      .promise();
    if (rootResult.Item) {
      const { Child_Counts: childCounts } = <TableNodes>rootResult.Item;
      return Promise.resolve(sum(childCounts));
    }
    return Promise.resolve(0);
  }

  /**
   * Changes multiple scores atomically.
   *
   * Sets the scores of the named entities in scores to new values. For named entities that have not been registered with a score before, a new score is created. For named entities that already had a score, the score is changed to reflect the new score. If a score is None, the named entity's score will be removed from the ranker.
   *
   * @param scores A dict mapping entity names (strings) to scores (integer lists)
   */
  async function setScores(
    scores: Partial<TableScores>[]
  ): Promise<[TableScores[], TableScores[]]> {
    // // Add ranker namespace to score if needed
    // scores = scores.map((score) => ({
    //   ...score,
    //   Player_ID: score.Player_ID.includes("|")
    //     ? score.Player_ID
    //     : `${rootKey}|${score.Player_ID}`,
    // }));
    log(
      () => `New scores ${JSON.stringify(scores.map((s) => `${s.Player_ID}`))}`
    );
    // Find any scores that are expired and not present in new batch
    const scoresToRemove = (await expiredScores()).filter(({ Player_ID }) =>
      scores.find((newScores) => newScores.Player_ID !== Player_ID)
    );
    log(
      () =>
        `Removing ${JSON.stringify(
          scoresToRemove.map((s) => `${s.Player_ID}`)
        )}`
    );
    const [scoreDeltas, scoreEnts, scoreEntsDel] = await computeScoreDeltas(
      scores,
      scoresToRemove
    );
    const nodeIdsToDeltas = computeNodeModifications(scoreDeltas);
    await increment(nodeIdsToDeltas, scoreEnts, scoreEntsDel);
    return [Object.values(scoreEnts), scoresToRemove];
  }

  async function removeScores(scores: string[]): Promise<TableScores[]> {
    const scoresToRemoveResponse = await db
      .batchGet({
        RequestItems: {
          scores: {
            Keys: scores.map((name) => ({
              Player_ID: name,
              Board_Name: rootKey,
            })),
          },
        },
      })
      .promise();
    const scoresToRemove = (
      scoresToRemoveResponse?.Responses?.scores || []
    ).filter((d) => !!d) as TableScores[];
    const [scoreDeltas, scoreEnts, scoreEntsDel] = await computeScoreDeltas(
      [],
      scoresToRemove
    );
    const nodeIdsToDeltas = computeNodeModifications(scoreDeltas);
    await increment(nodeIdsToDeltas, scoreEnts, scoreEntsDel);
    return Promise.resolve(scoresToRemove);
  }

  /**
   * Computes the ranks of scores
   *
   * @param scores An array of scores
   *
   * @returns The ranks of all supplied scores
   */
  async function findRanks(scores: number[][]): Promise<number[]> {
    log(() => `-> findRanks(scores: ${JSON.stringify(scores)})`);
    for (let score of scores) {
      if (score.length * 2 !== scoreRange.length) {
        throw new Error("Invalid score");
      }
    }
    const nodeIdsWithChildren = scores.map(findNodeIds); // .reduce((memo, curr) => [...memo, ...curr], [])
    const nodeIds = nodeIdsWithChildren.reduce(
      (memo: number[], curr) => [...memo, ...curr.map(([n]) => n)],
      []
    );
    const nodeDict = await getMultipleNodes(nodeIds);
    // Ranks are returned 0 index, so add 1 for humans
    const humanRanks = nodeIdsWithChildren
      .map((n) => findRankForNodes(n, nodeDict))
      .map((n) => (isNaN(n) && n) || n + 1);
    log(
      () =>
        `-> findRanks(scores: ${JSON.stringify(scores)}) -> ${JSON.stringify(
          humanRanks
        )}`
    );
    return humanRanks;
  }

  /**
   * Updates the existing leaderboard
   *
   * @param newScores New scores added to ranker
   *
   * @returns All scores in leaderboard in ranked order
   */
  async function leaderboardUpdate(
    inScores: TableScores[],
    outScores: TableScores[]
  ): Promise<TableScores[]> {
    const leaderboardResponse = await db
      .get({
        TableName: "leaderboards",
        Key: {
          Board_Name: rootKey,
        },
      })
      .promise();
    const { Scores: scores = [] }: Partial<TableLeaderboards> =
      leaderboardResponse.Item || {};
    log(
      () =>
        `Adding ${inScores.length}, removing ${
          outScores.length
        } from leaderboard of size ${
          leaderboard.length
        } for ${rootKey}. inScores: ${JSON.stringify(
          inScores
        )} outScores: ${JSON.stringify(outScores)}`
    );
    const newScoreNames = inScores.map(({ Player_ID: id }) => id);
    const outScoreNames = outScores.map(({ Player_ID: id }) => id);
    const oldScores = leaderboardRemove(
      scores,
      newScoreNames.concat(outScoreNames)
    );

    // Check if any new scores for leaderboard...
    let newScores: TableScores[] = [];
    if (oldScores.length > 0 && oldScores.length >= leaderboardSize) {
      const bottomScore = oldScores.slice(-1)[0];
      newScores = inScores.filter((s) => scoreLT(bottomScore.Score, s.Score));
    } else {
      newScores = [...inScores];
    }
    if (newScores.length === 0 && oldScores.length === scores.length) {
      // Return input array if no changes
      return scores;
    }
    newScores.sort((a, b) => scoreSort(a.Score, b.Score));

    /*
     * At this point we have two sorted arrays: oldScores and newScores
      return await leaderboardUpdate(input, output)
     *
     * To update the leaderboard, check the tip of each score array and pull
     * the highest ranking score until there are no more scores
     */
    let newLeaderboard: TableScores[] = [];
    for (let i = 0; i < leaderboardSize; i++) {
      const oldScore = oldScores[0];
      const oldScoreIsDefined = typeof oldScore !== "undefined";
      const newScore = newScores[0];
      const newScoreIsDefined = typeof newScore !== "undefined";

      if (!oldScoreIsDefined && !newScoreIsDefined) {
        // No more scores to injest
        break;
      } else if (!oldScoreIsDefined && newScoreIsDefined) {
        // New score is highest
        // As long as there are more new scores left, we have to keep checking old scores
        // to find a spot for each new score
        newLeaderboard.push(newScores.shift() as TableScores);
      } else if (oldScoreIsDefined && !newScoreIsDefined) {
        // Only old scores left
        // We can safely concant the rest of old scores
        // But first check if we need to chop any off to fit into leaderboard size
        const scoresToAdd =
          leaderboardSize - newLeaderboard.length < oldScores.length
            ? oldScores.slice(0, leaderboardSize - newLeaderboard.length)
            : oldScores;
        newLeaderboard = newLeaderboard.concat(scoresToAdd);
        // and we are done
        break;
      } else if (scoreLT(oldScore.Score, newScore.Score)) {
        // If new score > old score
        newLeaderboard.push(newScores.shift() as TableScores);
      } else {
        // if old score >= new score
        newLeaderboard.push(oldScores.shift() as TableScores);
      }
    }
    // Save the leaderboard
    await db
      .update({
        TableName: "leaderboards",
        Key: {
          Board_Name: rootKey,
        },
        UpdateExpression: "SET Scores = :s",
        ExpressionAttributeValues: {
          ":s": newLeaderboard,
        },
      })
      .promise();

    log(
      () =>
        `New leaderboard size ${
          newLeaderboard.length
        } for ${rootKey} contents: ${JSON.stringify(newLeaderboard)}`
    );
    return newLeaderboard;
  }

  /**
   * Returns the current leaderboard
   */
  async function leaderboard(): Promise<TableScores[]> {
    const leaderboardResponse = await db
      .get({
        TableName: "leaderboards",
        Key: {
          Board_Name: rootKey,
        },
      })
      .promise();
    const { Scores: scores = [] }: Partial<TableLeaderboards> =
      leaderboardResponse.Item || {};
    return scores;
  }

  const selfie: Ranker = {
    expireScores,
    removeScores,
    setScores,
    totalRankedScore,
    fetchScore,
    findScore,
    findRanks,
    leaderboardUpdate,
    leaderboard,
    rootPath: () => rootKey,
  };

  return Promise.resolve(
    Object.entries(selfie).reduce((memo, [key, value]) => {
      // Filter out non-async methods
      if (!["rootPath"].includes(key)) {
        memo[key] = lazyInit(value);
      }
      return memo;
    }, selfie)
  );
}

export default createRanker;
