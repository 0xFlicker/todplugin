import initRanker, { ScoreInput } from "./ranker";
import createDb from "../db/dynamodb";
import {
  createRankAndStack,
  scoreMapToTableScores,
} from "./ranker.testMatchers";
import createUuid from "uuid/v4";

describe("Ranker", () => {
  it("can be created", async () => {
    expect(
      await initRanker({
        rootKey: "foo",
        scoreRange: [0, 100],
        branchingFactor: 20,
        db: createDb(),
      })
    ).toBeDefined();
  });

  it("can save a score", async () => {
    const rootKey = createUuid();
    const db = createDb();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 100],
      branchingFactor: 20,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    await rankAndStack([
      {
        playerId: "foo",
        score: [5],
        date: new Date().toUTCString(),
      },
      {
        playerId: "bar",
        score: [10],
        date: new Date().toUTCString(),
      },
    ] as ScoreInput[]);
    const scores = await db
      .batchGet({
        RequestItems: {
          scores: {
            Keys: [
              {
                Player_ID: `foo`,
                Board_Name: rootKey,
              },
              {
                Player_ID: `bar`,
                Board_Name: rootKey,
              },
            ],
          },
        },
      })
      .promise();
    expect(scores.Responses?.scores[0]).toBeDefined();
    expect(scores.Responses?.scores[1]).toBeDefined();
  });

  it("has expected scores", async () => {
    const db = createDb();
    const rootKey = createUuid();

    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 100],
      branchingFactor: 20,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    const leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [5],
        bar: [10],
      })
    );
    expect(await ranker.totalRankedScore()).toEqual(2);
    await expect(ranker).toHaveRanks([[10], [5]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `bar`, score: [10] },
      { playerId: `foo`, score: [5] },
    ]);
  });

  it("has expected ranks", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 100],
      branchingFactor: 100,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    const leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [5],
        bar: [10],
        baz: [15],
        fizz: [20],
      })
    );
    await ranker.findRanks([[5], [10]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `fizz`, score: [20] },
      { playerId: `baz`, score: [15] },
      { playerId: `bar`, score: [10] },
      { playerId: `foo`, score: [5] },
    ]);
  }, 300000);

  it("can update scores", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [15],
        bar: [16],
        baz: [45],
        fizz: [60],
      })
    );
    await expect(ranker).toHaveRanks([[60], [45], [16], [15]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `fizz`, score: [60] },
      { playerId: `baz`, score: [45] },
      { playerId: `bar`, score: [16] },
      { playerId: `foo`, score: [15] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [25],
        bar: [16],
        baz: [5],
        fizz: [600],
      })
    );

    await expect(ranker).toHaveRanks([[600], [25], [16], [5]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `fizz`, score: [600] },
      { playerId: `foo`, score: [25] },
      { playerId: `bar`, score: [16] },
      { playerId: `baz`, score: [5] },
    ]);
  });

  it("can remove scores", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [15],
        bar: [45],
        baz: [45],
        fizz: [60],
      })
    );
    await expect(ranker).toHaveRanks([[60], [45], [45], [15]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `fizz`, score: [60] },
      { playerId: `baz`, score: [45] },
      { playerId: `bar`, score: [45] },
      { playerId: `foo`, score: [15] },
    ]);

    const removed = await ranker.removeScores(["bar", "fizz"]);
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Player_ID: "bar",
          Score: [45],
        }),
        expect.objectContaining({
          Player_ID: "fizz",
          Score: [60],
        }),
      ])
    );

    await ranker.leaderboardUpdate([], removed);

    await expect(ranker).toHaveRanks([[45], [15]]);
    expect(await ranker.leaderboard()).toHaveLeaderboard([
      { playerId: `baz`, score: [45] },
      { playerId: `foo`, score: [15] },
    ]);
  }, 300000);

  it("supports tie breakers", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000, 0, 50],
      branchingFactor: 100,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [333, 48],
        bar: [500, 15],
        baz: [750, 45],
        fizz: [750, 40],
      })
    );
    await expect(ranker).toHaveRanks([
      [750, 45],
      [750, 40],
      [500, 15],
      [333, 48],
    ]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `baz`, score: [750, 45] },
      { playerId: `fizz`, score: [750, 40] },
      { playerId: `bar`, score: [500, 15] },
      { playerId: `foo`, score: [333, 48] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [600, 20],
        bar: [600, 25],
        baz: [150, 45],
        fizz: [150, 40],
      })
    );
    await expect(ranker).toHaveRanks([
      [600, 25],
      [600, 20],
      [150, 45],
      [150, 40],
    ]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `bar`, score: [600, 25] },
      { playerId: `foo`, score: [600, 20] },
      { playerId: `baz`, score: [150, 45] },
      { playerId: `fizz`, score: [150, 40] },
    ]);
  });

  it("can add scores", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        foo: [15],
        bar: [16],
        baz: [45],
        fizz: [60],
      })
    );
    await expect(ranker).toHaveRanks([[60], [45], [16], [15]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `fizz`, score: [60] },
      { playerId: `baz`, score: [45] },
      { playerId: `bar`, score: [16] },
      { playerId: `foo`, score: [15] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        baz: [5],
        fizz: [600],
        buzz: [900],
      })
    );
    await expect(ranker).toHaveRanks([[900], [600], [16], [15], [5]]);
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `buzz`, score: [900] },
      { playerId: `fizz`, score: [600] },
      { playerId: `bar`, score: [16] },
      { playerId: `foo`, score: [15] },
      { playerId: `baz`, score: [5] },
    ]);
  });

  it("Can insert one", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      leaderboardSize: 1,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    const leaderboard = await rankAndStack(
      scoreMapToTableScores({
        a: [0],
      })
    );
    expect(leaderboard).toHaveLeaderboard([{ playerId: `a`, score: [0] }]);
  });

  it("Can insert several past max", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      leaderboardSize: 2,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        a: [1],
      })
    );
    expect(leaderboard).toHaveLeaderboard([{ playerId: `a`, score: [1] }]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        b: [2],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `b`, score: [2] },
      { playerId: `a`, score: [1] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        c: [3],
        d: [0],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `c`, score: [3] },
      { playerId: `b`, score: [2] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        a: [0],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { playerId: `c`, score: [3] },
      { playerId: `b`, score: [2] },
    ]);
  });

  it("Can replace entire leaderboard", async () => {
    const db = createDb();
    const rootKey = createUuid();
    const ranker = await initRanker({
      rootKey,
      scoreRange: [0, 1000],
      branchingFactor: 100,
      leaderboardSize: 3,
      db,
    });
    const rankAndStack = createRankAndStack(ranker);
    let leaderboard = await rankAndStack(
      scoreMapToTableScores({
        a: [100],
        b: [90],
        c: [80],
      })
    );
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        d: [200],
        e: [150],
        f: [180],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      {
        playerId: `d`,
        score: [200],
      },
      {
        playerId: `f`,
        score: [180],
      },
      {
        playerId: `e`,
        score: [150],
      },
    ]);
  });
});
