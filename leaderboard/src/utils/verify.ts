// import { Firestore } from '@google-cloud/firestore'
// import { stats, LeaderboardStats } from '../ranker/leaderboard'
// import { ScoreData } from '../ranker'
// import { DefRankerExtended } from '../defs/common'
// import { includes as missingIncludes, stats as missingStats } from './missing'
// import fillHoles from './holes'
// import { SessionData } from '../types'

// export type Verify = ReturnType<typeof verify>

// export default function verify(db: Firestore, defs: DefRankerExtended<SessionData>[]) {
//   return async (experience: string, location: string, period: string, revision: string) => {
//     const def = defs.find(
//       def =>
//         def.revision === revision &&
//         def.experience === experience &&
//         def.location === location &&
//         def.timeFrame === period
//     )
//     if (def) {
//       let start = Date.now()
//       const dbStats = (await db.doc(def.dbPath).get()).data() as LeaderboardStats
//       console.log(`Fetched db leaderboard in ${(Date.now() - start) / 1000} seconds`)
//       start = Date.now()
//       console.log(`verify before length: ${dbStats.includes.length}`)
//       dbStats.includes = await fillHoles(db, def.rankers, dbStats)
//       console.log(`verify after length: ${dbStats.includes.length}`)
//       console.log(`Filled db leaderboard holes in ${(Date.now() - start) / 1000} seconds`)
//       start = Date.now()
//       const leaderboardStats = stats(
//         (
//           await Promise.all(
//             Object.entries(def.rankers).map(async ([mode, ranker]) => [mode, await ranker.leaderboard()]) as Promise<
//               [string, ScoreData[]]
//             >[]
//           )
//         ).reduce((acc, [mode, leaderboard]) => {
//           acc[mode] = [leaderboard, leaderboard]
//           return acc
//         }, {})
//       )
//       console.log(`Generated leaderboard in ${(Date.now() - start) / 1000} seconds`)
//       start = Date.now()

//       console.log(`verify before length: ${leaderboardStats.includes.length}`)
//       leaderboardStats.includes = await fillHoles(db, def.rankers, leaderboardStats)
//       console.log(`verify after length: ${leaderboardStats.includes.length}`)
//       console.log(`Filled generated leaderboard holes in ${(Date.now() - start) / 1000} seconds`)
//       return {
//         generated: {
//           leaderboard: leaderboardStats,
//           missingIncludes: missingIncludes(leaderboardStats),
//           missingStats: missingStats(leaderboardStats)
//         },
//         db: {
//           leaderboard: dbStats,
//           missingIncludes: missingIncludes(dbStats),
//           missingStats: missingStats(dbStats)
//         }
//       }
//     }
//     return null
//   }
// }
