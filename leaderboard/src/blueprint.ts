import mold from "shutterstock-mold";
import "dotenv/config";
import { createLeaderboardDefs } from "./defs";
import dbSpec from "./db";
import * as openapi from "./openapi";
import controller from "./controller";

export default mold({
  ...dbSpec,
  ...openapi,
  defs: createLeaderboardDefs,
  controller,
});
