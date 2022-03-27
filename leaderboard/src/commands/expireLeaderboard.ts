// import { DefRanker } from '../defs/common'

// export async function expire(def: DefRanker) {
//   try {
//     for (let ranker of Object.values(def.rankers)) {
//       const removed = await ranker.expireScores()
//       console.log(`Removed ${removed.length} items from leaderboard`)
//     }
//     return
//   } catch (error) {
//     console.error(error)
//     console.log(`Unable to expire ${def.experience} ${def.location} ${def.timeFrame} leaderboard`)
//   }
// }

// export function specific(defs: DefRanker[]) {
//   return async (experience: string, location: string, period: string) => {
//     const def = defs.find(def => def.experience === experience && def.location === location && def.timeFrame === period)
//     if (def) {
//       console.log(`Starting expiration of ${experience} ${location} ${period}`)
//       await expire(def)
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
//       await expire(def)
//     } catch (error) {
//       console.error(error)
//     }
//   }
// }
