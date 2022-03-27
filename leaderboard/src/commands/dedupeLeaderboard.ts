// import { DefRanker } from '../defs/common'
// import { dedupe } from '../transforms/dedupe'

// export async function remove(def: DefRanker) {
//   try {
//     for (let ranker of Object.values(def.rankers)) {
//       const leaderboard = await ranker.leaderboard()
//       console.log(`Found ${leaderboard.length} items on leaderboard`)
//       const scoreIdsToRemove = dedupe(leaderboard)
//       if (scoreIdsToRemove.length) {
//         const removedScores = await ranker.removeScores(scoreIdsToRemove)
//         await ranker.leaderboardUpdate([], removedScores)
//         console.log(`Removing ${scoreIdsToRemove.length} duplicate entries`)
//       }
//     }
//     return
//   } catch (error) {
//     console.error(error)
//     console.log(`Unable to clean ${def.experience} ${def.location} ${def.timeFrame} leaderboard`)
//   }
// }

// export function specific(defs: DefRanker[]) {
//   return async (experience: string, location: string, period: string) => {
//     const def = defs.find(def => def.experience === experience && def.location === location && def.timeFrame === period)
//     if (def) {
//       console.log(`Starting dedupe of ${experience} ${location} ${period}`)
//       await remove(def)
//       return
//     }
//     console.log('No leaderboard found')
//     return
//   }
// }

// export async function all(defs: DefRanker[]) {
//   for (let def of defs) {
//     try {
//       console.log(`Processing ${def.experience} at ${def.location} for period ${def.timeFrame}`)
//       await remove(def)
//     } catch (error) {
//       console.error(error)
//       return false
//     }
//   }
//   return true
// }
