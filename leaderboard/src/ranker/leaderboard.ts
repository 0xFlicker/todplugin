import {
  keys,
  toPairs,
  map,
  compose,
  reduceBy,
  reduce,
  mapObjIndexed,
  unnest,
} from "ramda";
import batched, { DebounceQueueOptions } from "../utils/batched";
import { Ranker } from ".";
import { TableScores } from "../db/dynamodb";
import { DocumentClient } from "aws-sdk/clients/dynamodb";

// Assigns a type to score data for organization purposes
interface ScoreModeData extends TableScores {
  mode: string;
}
// The public stat object. All stats include an id and a name and after that contain any fields with numbers
export type Stat = {
  id: string;
  name: string;
  eventId: string;
} & {
  [key in Exclude<string, "id" | "name" | "eventId">]: number;
};

// Maps ids to stats, for performance
type StatHash = {
  [key: string]: Stat;
};

// And field name with an array of ids. These are the different leaderboards
type LeaderboardStatComponents = {
  [key: string]: string[];
};

// The public status object is an array of player stats and all leaderboard arrays which are lists of ids
export type LeaderboardStats = {
  includes: Stat[];
} & LeaderboardStatComponents;

// Input type. A tuple of a new sorted leaderboard and all new scores for this new leaderboard
type StatMutation = [
  TableScores[],
  TableScores[]
]; /* sorted leaderboard, new scores */

// Input type, a hash of modes to mutations
export type StatMutationHash = {
  [key: string]: StatMutation;
};

// Concatantes TableScoress that belong to the same player
const groupIds = (acc: ScoreModeData[], scoreMode: ScoreModeData) =>
  acc.concat(scoreMode);
// For grouping together same players in different leaderboards
const toScoreModeId = (scoreMode: ScoreModeData) => scoreMode.Player_ID;
// Decoaretes TableScores with mode
const mapScoreMode =
  (mode: string) =>
  (scoreData: TableScores): ScoreModeData => ({
    ...scoreData,
    mode,
  });
// Maps TableScores to just their ids
const mapIds = map((scoreData: TableScores) => scoreData.Player_ID);
// Generates an existance hash of ids (for lookup performance)
const reduceId = reduce((acc: { [key: string]: boolean }, id: string) => {
  acc[id] = true;
  return acc;
});

// Makes a default leaderboard stats object from a statmutation hash. The Leaderboard will have empty arrays for all modes
const leaderboardStatsDefaults = (s: StatMutationHash) =>
  compose(
    reduce(
      (acc, key) => {
        acc[key] = [];
        return acc;
      },
      { includes: [] } as LeaderboardStats
    ),
    keys
  )(s);

export const stats = (
  statMutations: StatMutationHash,
  oldLeaderboard?: LeaderboardStats
): LeaderboardStats => {
  const statPairs = toPairs(statMutations);
  const modes = statPairs.map(([a]) => a);
  // A hash mapping new stats to their ids
  const newStatsHash = compose<
    [string, StatMutation][],
    ScoreModeData[][],
    ScoreModeData[],
    StatHash
  >(
    // Turns a giant list of separate leaderboard TableScores into a hash of player ids to their leaderboard stats
    compose(
      mapObjIndexed<ScoreModeData[], Stat>(
        // Builds a stat object from a list of TableScoress that belong to a single player
        (scoreModes: ScoreModeData[]): Stat =>
          ({
            id: scoreModes[0].Player_ID,
            ...reduce(
              // Takes a each score from a ScoreModeData and attaches to a Stat object
              (acc: any, { mode, Score }: ScoreModeData) => {
                acc[mode] = Score[0];
                return acc;
              },
              {},
              scoreModes
            ),
          } as Stat)
      ),
      reduceBy(groupIds, [], toScoreModeId)
    ),
    // Flattens (ScoreModeStats grouped by mode => single list)
    unnest,
    // Annotates all new scores with their mode, to aid in future bucketing
    map(([mode, statMutation]: [string, StatMutation]) =>
      map(mapScoreMode(mode))(statMutation[1])
    )
  )(statPairs);

  // Use previous leaderboard or generate a new one from incoming
  const oldDocData: LeaderboardStats =
    oldLeaderboard || leaderboardStatsDefaults(statMutations);

  // Object of new leaderboards
  const leaderboardStats = compose<
    [string, StatMutation][],
    [string, [string[], TableScores[]]][],
    LeaderboardStatComponents
  >(
    // Reduces to a leaderboard stat component (everything but the includes)
    reduce(
      (acc, [mode, [leaderboard]]: [string, [string[], TableScores[]]]) => {
        acc[mode] = leaderboard;
        return acc;
      },
      {} as LeaderboardStatComponents
    ),
    // Maps [mode, StatMutation][] (object entries of a StatMutationHash)
    // => [mode, [ids[], TableScores[]][] (list of tuple of the mode and a tuple of the leaderboard of ids and the new TableScoress)
    map(
      ([mode, [newLeaderboard, newScores]]: [string, StatMutation]): [
        string,
        [string[], TableScores[]]
      ] => [mode, [mapIds(newLeaderboard), newScores]]
    )
  )(statPairs);

  // Update leaderboards
  const { includes: oldStats = [] } = oldDocData as { includes: Stat[] };
  // A hash of all stat ids to remove for filtering
  const statIdsToRemoveHash = reduceId(
    {} as { [key: string]: boolean },
    compose<string[], string[][], string[], string[]>(
      (ids: string[]) => ids.filter((id: string) => !newStatsHash[id]),
      unnest,
      map((mode: string) => oldDocData[mode])
    )(modes)
  );
  // Remove stale stats not present on any leaderboard and add new stats
  const includes = oldStats
    .filter((stat: Stat) => !!statIdsToRemoveHash[stat.id])
    .concat(Object.values(newStatsHash));

  // yay!
  const stat = {
    includes,
    ...leaderboardStats,
  } as LeaderboardStats;
  return stat;
};

export type TableScoresHash = {
  [key: string]: TableScores[];
};

export type RankerMap = {
  [key: string]: Ranker;
};

export type LeaderboardDbReader = (
  leaderboardDocPath: string
) => (opts?: { start: number; count: number }) => Promise<any | undefined>;

export function leaderboardDbReader(db: DocumentClient) {
  return (leaderboardDocPath: string) =>
    async (opts?: { start: number; count: number }) => {
      const resultResponse = await db
        .get({
          TableName: "leaderboards",
          Key: {
            Board_Name: leaderboardDocPath,
          },
        })
        .promise();
      const result = resultResponse.Item;
      if (!result) {
        return undefined;
      }
      const metaProps = Object.keys(result).filter((r) => r !== "includes");
      const size = metaProps
        .map((p) => result[p].length)
        .reduce((acc: number, curr: number): number => Math.max(acc, curr), 0);
      result.meta = {
        size,
      };
      if (
        opts &&
        (typeof opts.start !== "undefined" || typeof opts.count !== "undefined")
      ) {
        const { start = 0, count = Infinity } = opts;
        const statsAvailable = {} as { [key: string]: boolean };
        for (let p of metaProps) {
          reduceId(
            statsAvailable,
            (result[p] = result[p].slice(start, start + count))
          );
        }
        result.includes = result.includes.filter(
          (stat: Stat) => statsAvailable[stat.id]
        );
      }
      return result;
    };
}

export type LeaderboardDbWriter = (
  debounceOptions: DebounceQueueOptions<TableScores>,
  rankerMap: RankerMap
) => (input: TableScoresHash) => Promise<void>;

export function leaderboardDbWriter() {
  return (debounceOptions: DebounceQueueOptions, rankerMap: RankerMap) => {
    const setMultiScores = async (scoreMaps: TableScoresHash[]) => {
      const scoreMap = compose(
        reduceBy(
          (acc: TableScores[], incoming: [string, TableScores[]]) =>
            acc.concat(incoming[1]),
          [] as TableScores[],
          ([mode]: [string, TableScores[]]) => mode
        ),
        unnest,
        map((scoreMap: TableScoresHash) => Object.entries(scoreMap))
      )(scoreMaps);

      const results = (await Promise.all(
        compose(
          map(([mode, scores]: [string, TableScores[]]) =>
            rankerMap[mode]
              .setScores(scores)
              .then(async ([inputs, outputs]) => [
                mode,
                await rankerMap[mode].leaderboardUpdate(inputs, outputs),
                inputs,
              ])
          ),
          (scoreMap: TableScoresHash) => Object.entries(scoreMap)
        )(scoreMap)
      )) as [string, TableScores[], TableScores[]][];

      return results;
    };

    const batchedWriter = batched<
      TableScoresHash,
      [string, TableScores[], TableScores[]][]
    >(setMultiScores, debounceOptions);

    return async (scoreMap: TableScoresHash) => {
      await batchedWriter([scoreMap]);
    };
  };
}
