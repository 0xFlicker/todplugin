import getPort from "get-port";
import mold from "shutterstock-mold";
import axios from "axios";
import createDb from "../db/dynamodb";
import * as openapi from "../openapi";
import app from "./index";
import { createLeaderboard } from "./leaderboard";
import { createLeaderboardDefs } from "../defs";

describe("leaderboard", () => {
  it("loads", async () => {
    const blueprint = mold({
      defs: createLeaderboardDefs,
      db: createDb,
      ...openapi,
      leaderboard: () => createLeaderboard,
    });
    const $ = blueprint.factory();
    const expressApp = await $(app);
    const port = await getPort();
    const server = expressApp.listen(port);

    try {
      const response = await axios.get(`http://localhost:${port}/docs`);
      expect(response.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
