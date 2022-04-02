import getPort from "get-port";
import express from "express";
import mold from "shutterstock-mold";
import axios from "axios";
import createDb from "../db/dynamodb";
import * as openapi from "../openapi";
import { leaderboard } from "./leaderboard";
import { createLeaderboardDefs } from "../defs";

describe("leaderboard", () => {
  it("loads", async () => {
    const blueprint = mold({
      defs: createLeaderboardDefs,
      db: createDb,
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
        await axios.get(`http://localhost:${port}/potato/alltime`)
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
    } catch (err: any) {
      console.log(JSON.stringify(err.response.data));
      throw err;
    } finally {
      server.close();
    }
  });
});
