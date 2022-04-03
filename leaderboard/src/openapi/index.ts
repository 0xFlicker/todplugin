import { dereference, v3_0 } from "openapi-enforcer";

import leaderboardFile from "./leaderboard-openapi.json";
import rankingsFile from "./rankings-openapi.json";
import scoreFile from "./score-openapi.json";
import commonFile from "./common-openapi.json";
import { deepMerge } from "../utils/deepMerge";

const { OpenApi } = v3_0;

export async function leaderboardSchema() {
  const merged = deepMerge(
    commonFile,
    leaderboardFile,
    rankingsFile,
    scoreFile
  );
  try {
    return await dereference(merged);
  } catch (e: any) {
    console.error(e.toString());
    throw e;
  }
}

export function leaderboardOpenapi(leaderboardSchema: object) {
  const openapiR = new OpenApi(leaderboardSchema);
  const { warning, error } = openapiR;
  if (warning || error) {
    throw new Error(
      `Open API ${error ? `error: ${error.toString()}` : ""} ${
        warning ? `warning: ${warning.toString()}` : ""
      }`
    );
  }
  const [openapi] = openapiR;
  return openapi;
}
