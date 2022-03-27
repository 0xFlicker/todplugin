import getPort from "get-port";
import express from "express";
import mold from "shutterstock-mold";
import axios from "axios";
import * as openapi from "../openapi";
import { fakesScores } from "../utils/faker";
import { leaderboard } from "./leaderboard";
import createRanker from "../ranker/ranker";
import createDb from "../db/dynamodb";

describe("leaderboard", () => {
  async function mockDefs() {
    return [
      {
        ranker: await createRanker({
          rootKey: "potatoes",
          scoreRange: [0, 10001],
          branchingFactor: 100,
          db: createDb(),
        }),
        experience: "potatoes",
        timeFrame: "alltime",
        async read() {
          const fakeScores = fakesScores(10);
          return {
            items: fakeScores,
            meta: {
              size: fakeScores.length,
            },
          };
        },
      },
    ];
  }
  it("loads", async () => {
    const blueprint = mold({
      defs: mockDefs,
      ...openapi,
    });
    const $ = blueprint.factory();
    const app = express();
    const leaderboardApp = await $(leaderboard);
    const port = await getPort();
    leaderboardApp(app);
    const server = app.listen(port);

    try {
      expect(
        await axios.get(`http://localhost:${port}/potatoes/alltime`)
      ).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.any(Array),
            meta: expect.objectContaining({
              size: expect.any(Number),
            }),
          }),
        })
      );
    } finally {
      server.close();
    }
  });
});