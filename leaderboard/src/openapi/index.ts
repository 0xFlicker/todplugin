import { dereference, v3_0 } from 'openapi-enforcer'
import leaderboardFile from './leaderboard-openapi.json'
const { OpenApi } = v3_0

export async function leaderboardSchema() {
  return await dereference(leaderboardFile)
}

export function leaderboardOpenapi(leaderboardSchema: object) {
  const openapiR = new OpenApi(leaderboardSchema)
  const { warning, error } = openapiR
  if (warning || error) {
    throw new Error(`Open API error: ${JSON.stringify(error)} warning: ${JSON.stringify(warning)}`)
  }
  const [openapi] = openapiR
  return openapi
}
