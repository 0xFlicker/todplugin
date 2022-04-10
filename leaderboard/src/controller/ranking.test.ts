import getPort from "get-port";
import express from "express";
import mold from "shutterstock-mold";
import axios from "axios";
import createDb from "../db/dynamodb";
import * as openapi from "../openapi";
import { rankingController } from "./ranking";
import { createLeaderboardDefs } from "../defs";
import { IInjectArgs, ingest } from "../ingest/core";

describe("ranking", () => {
  it("loads", async () => {
    const blueprint = mold({
      defs: createLeaderboardDefs,
      db: createDb,
      ...openapi,
    });
    const $ = blueprint.factory();
    const app = express();
    const rankApp = await $(rankingController);
    const port = await getPort();
    rankApp(app);
    const server = app.listen(port);
    const ingester: (event: IInjectArgs) => Promise<void> = $(ingest);
    await ingester({
      boardName: "potato",
      scores: [
        {
          playerId: "1",
          score: [3],
        },
        {
          playerId: "2",
          score: [2],
        },
        {
          playerId: "3",
          score: [5],
        },
      ],
    });
    try {
      const response = await axios.post(
        `http://localhost:${port}/rank/potato`,
        {
          playerId: "1",
        }
      );
      expect(response.status).toBe(200);
      expect(response.data).toEqual(
        expect.objectContaining({
          ranks: expect.arrayContaining([
            expect.objectContaining({
              period: "alltime",
              rank: 2,
            }),
            expect.objectContaining({
              period: "daily",
              rank: 2,
            }),
            expect.objectContaining({
              period: "weekly",
              rank: 2,
            }),
          ]),
        })
      );
    } finally {
      server.close();
    }
  });
});
