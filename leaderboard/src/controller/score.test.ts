import getPort from "get-port";
import express from "express";
import mold from "shutterstock-mold";
import axios from "axios";
import createDb from "../db/dynamodb";
import * as openapi from "../openapi";
import { scoreController } from "./score";
import { createLeaderboardDefs } from "../defs";
import createRanker from "../ranker/ranker";

describe("score", () => {
  it("loads", async () => {
    const blueprint = mold({
      defs: createLeaderboardDefs,
      db: createDb,
      ...openapi,
    });
    const $ = blueprint.factory();
    const app = express();
    const scoreApp = await $(scoreController);
    const port = await getPort();
    scoreApp(app);
    const server = app.listen(port);
    const ranker = await createRanker({
      rootKey: "potato",
      period: 1000 * 60 * 60 * 24 * 7,
      branchingFactor: 20,
      scoreRange: [0, 100],
      db: createDb(),
    });
    await ranker.setScores([
      {
        playerId: "foo",
        date: new Date().toISOString(),
        score: [5],
      },
    ]);
    try {
      const response = await axios.post(
        `http://localhost:${port}/score/potato`,
        {
          playerId: "foo",
        }
      );
      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          Player_ID: "foo",
          Board_Name: "potato",
          Score: [5],
        })
      );
    } finally {
      server.close();
    }
  });
});
