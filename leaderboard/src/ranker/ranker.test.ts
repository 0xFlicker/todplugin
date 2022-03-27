import initRanker from "./ranker";
import createDb, { TableScores } from "../db/dynamodb";
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
        Player_ID: "foo",
        Score: [5],
        Date: new Date().toUTCString(),
      },
      {
        Player_ID: "bar",
        Score: [10],
        Date: new Date().toUTCString(),
      },
    ] as TableScores[]);
    const scores = await db
      .batchGet({
        RequestItems: {
          scores: {
            Keys: [
              {
                Player_ID: `${rootKey}|foo`,
              },
              {
                Player_ID: `${rootKey}|bar`,
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
    expect(ranker).toHaveRanks([[10], [5]]);
    expect(leaderboard).toHaveLeaderboard([
      { Player_ID: `${rootKey}|bar`, Score: [10] },
      { Player_ID: `${rootKey}|foo`, Score: [5] },
    ]);
  });

  it.only("has expected ranks", async () => {
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
      { Player_ID: `${rootKey}|fizz`, Score: [20] },
      { Player_ID: `${rootKey}|baz`, Score: [15] },
      { Player_ID: `${rootKey}|bar`, Score: [10] },
      { Player_ID: `${rootKey}|foo`, Score: [5] },
    ]);
  });

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
    expect(ranker).toHaveRanks([[60], [45], [16], [15]]);
    expect(leaderboard).toHaveLeaderboard([
      { Player_ID: `${rootKey}|fizz`, Score: [60] },
      { Player_ID: `${rootKey}|baz`, Score: [45] },
      { Player_ID: `${rootKey}|bar`, Score: [16] },
      { Player_ID: `${rootKey}|foo`, Score: [15] },
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
      { Player_ID: `${rootKey}|fizz`, Score: [600] },
      { Player_ID: `${rootKey}|foo`, Score: [25] },
      { Player_ID: `${rootKey}|bar`, Score: [16] },
      { Player_ID: `${rootKey}|baz`, Score: [5] },
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
      { Player_ID: `${rootKey}|fizz`, Score: [60] },
      { Player_ID: `${rootKey}|baz`, Score: [45] },
      { Player_ID: `${rootKey}|bar`, Score: [45] },
      { Player_ID: `${rootKey}|foo`, Score: [15] },
    ]);

    const removed = await ranker.removeScores(["bar", "fizz"]);
    expect(removed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bar",
          value: [45],
        }),
        expect.objectContaining({
          id: "fizz",
          value: [60],
        }),
      ])
    );

    await ranker.leaderboardUpdate([], removed);

    await expect(ranker).toHaveRanks([[45], [15]]);
    expect(await ranker.leaderboard()).toHaveLeaderboard([
      { Player_ID: `${rootKey}|baz`, Score: [45] },
      { Player_ID: `${rootKey}|foo`, Score: [15] },
    ]);
  });

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
      { Player_ID: `${rootKey}|baz`, Score: [750, 45] },
      { Player_ID: `${rootKey}|fizz`, Score: [750, 40] },
      { Player_ID: `${rootKey}|bar`, Score: [500, 15] },
      { Player_ID: `${rootKey}|foo`, Score: [333, 48] },
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
      { Player_ID: `${rootKey}|bar`, Score: [600, 25] },
      { Player_ID: `${rootKey}|foo`, Score: [600, 20] },
      { Player_ID: `${rootKey}|baz`, Score: [150, 45] },
      { Player_ID: `${rootKey}|fizz`, Score: [150, 40] },
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
      { Player_ID: `${rootKey}|fizz`, Score: [60] },
      { Player_ID: `${rootKey}|baz`, Score: [45] },
      { Player_ID: `${rootKey}|bar`, Score: [16] },
      { Player_ID: `${rootKey}|foo`, Score: [15] },
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
      { Player_ID: `${rootKey}|buzz`, Score: [900] },
      { Player_ID: `${rootKey}|fizz`, Score: [600] },
      { Player_ID: `${rootKey}|bar`, Score: [16] },
      { Player_ID: `${rootKey}|foo`, Score: [15] },
      { Player_ID: `${rootKey}|baz`, Score: [5] },
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
    expect(leaderboard).toHaveLeaderboard([{ Player_ID: "a", Score: [0] }]);
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
    expect(leaderboard).toHaveLeaderboard([{ Player_ID: "a", Score: [1] }]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        b: [2],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { Player_ID: `${rootKey}|b`, Score: [2] },
      { Player_ID: `${rootKey}|a`, Score: [1] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        c: [3],
        d: [0],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { Player_ID: `${rootKey}|c`, Score: [3] },
      { Player_ID: `${rootKey}|b`, Score: [2] },
    ]);
    leaderboard = await rankAndStack(
      scoreMapToTableScores({
        a: [0],
      })
    );
    expect(leaderboard).toHaveLeaderboard([
      { Player_ID: `${rootKey}|c`, Score: [3] },
      { Player_ID: `${rootKey}|b`, Score: [2] },
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
        Player_ID: `${rootKey}|d`,
        Score: [200],
      },
      {
        Player_ID: `${rootKey}|f`,
        Score: [180],
      },
      {
        Player_ID: `${rootKey}|e`,
        Score: [150],
      },
    ]);
  });
});
