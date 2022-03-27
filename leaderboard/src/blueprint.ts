import mold from "shutterstock-mold";
import "dotenv/config";
import dbSpec from "./db";
import * as openapi from "./openapi";
import { contentfulStores, locations, locationsByMarkets } from "./contentful";
import * as leaderboard from "./ranker/leaderboard";
import controller from "./controller";

export default mold({
  ...dbSpec,
  ...leaderboard,
  ...openapi,
  controller,
  contentfulStores,
  locations,
  locationsByMarkets,
});
