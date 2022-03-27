// import { Firestore } from '@google-cloud/firestore'
// import { stats } from '../ranker/leaderboard'
// import { ScoreData } from '../ranker'
// import { DefRankerExtended } from '../defs/common'
// import { SessionData } from '../types'
// import fillHoles from '../utils/holes'

// function sleep(delay: number) {
//   return new Promise(resolve => setTimeout(resolve, delay))
// }

// export function generate(db: Firestore) {
//   return async (def: DefRankerExtended<SessionData>) => {
//     const genStats = (
//       await Promise.all(
//         Object.entries(def.rankers).map(async ([mode, ranker]) => [mode, await ranker.leaderboard()]) as Promise<
//           [string, ScoreData[]]
//         >[]
//       )
//     ).reduce((acc, [mode, leaderboard]) => {
//       acc[mode] = [leaderboard, leaderboard]
//       return acc
//     }, {})
//     const leaderboardStats = stats(genStats)
//     leaderboardStats.includes = await fillHoles(db, def.rankers, leaderboardStats)
//     return leaderboardStats
//   }
// }

// export function specific(db: Firestore, defs: DefRankerExtended<SessionData>[]) {
//   return async (experience: string, location: string, period: string) => {
//     const def = defs.find(def => def.experience === experience && def.location === location && def.timeFrame === period)
//     if (def) {
//       try {
//         const generator = generate(db)
//         const leaderboard = await generator(def)
//         await db.doc(def.dbPath).set(leaderboard)
//         return
//       } catch (error) {
//         console.log(`Unable to patch ${experience} ${location} ${period} leaderboard`)
//       }
//     }
//     console.log('No leaderboard found')
//     return
//   }
// }

// export async function all(db: Firestore, defs: DefRankerExtended<SessionData>[]) {
//   for (let def of defs) {
//     try {
//       console.log(`Processing ${def.dbPath}`)
//       const generator = generate(db)
//       await generator(def)
//       console.log(`Done processing ${def.dbPath}`)
//       await sleep(2000)
//     } catch (error) {
//       console.error(error)
//     }
//   }
// }
