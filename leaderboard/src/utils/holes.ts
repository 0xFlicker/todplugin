// import {
//   LeaderboardMissingStat,
//   includes as missingInIncludes,
//   stats as missingInStats,
// } from "./missing";
// import {
//   converge,
//   concat,
//   compose,
//   without,
//   keys,
//   map,
//   values,
//   uniqWith,
//   unnest,
// } from "ramda";
// import { RankerMap, Stat, LeaderboardStats } from "../ranker";
// import logger from "./logger";
// import { DocumentClient } from "aws-sdk/clients/dynamodb";

// type HoleContext<T> = [Stat | null, [string, T][]][];

// type ReduceContextFinal<T> = {
//   [key: string]: [Stat | null, [string, T][]];
// };

// function reduceCalls<T>(context: HoleContext<T>): ReduceContextFinal<T> {
//   const cache = context.reduce(
//     (acc, [stat, loads]) => {
//       for (let [mode, ref] of loads) {
//         acc[ref.id] = acc[ref.id] || Array(2);
//         const x = acc[ref.id];
//         if (!x[0] && stat) {
//           x[0] = stat;
//         }
//         x[1] = x[1] || {};
//         x[1][mode] = ref;
//       }
//       return acc;
//     },
//     {} as {
//       [key: string]: [Stat | null, { [key: string]: T }];
//     }
//   );
//   return map(
//     ([stats, loads]) => [stats, Object.entries(loads).map((pairs) => pairs)],
//     cache
//   );
// }

// export default async function (
//   db: DocumentClient,
//   rankers: RankerMap,
//   leaderboard: LeaderboardStats
// ): Promise<Stat[]> {
//   const stats = leaderboard.includes;
//   const modes = compose(without(["includes", "meta"]), keys)(leaderboard);

//   const operations: [Stat | null, [string, DocumentReference][]][] = converge(
//     compose<
//       LeaderboardMissingStat[],
//       LeaderboardMissingStat[],
//       LeaderboardMissingStat[],
//       HoleContext,
//       ReduceContextFinal,
//       HoleContext
//     >(
//       values,
//       reduceCalls,
//       map(([stat, loads]) => [
//         stat,
//         loads.map(([needed, id]) => [
//           needed,
//           db.doc(rankers[needed].keyForScore(id)),
//         ]),
//       ]),
//       concat
//     ),
//     [
//       compose<LeaderboardStats, string[], [null, [string, string][]][]>(
//         map((id) => [null, modes.map((needed) => [needed, id])]),
//         (leaderboard: LeaderboardStats) => missingInIncludes(leaderboard)
//       ),
//       missingInStats,
//     ]
//   )(leaderboard);

//   const docRefs: DocumentReference[] = [];
//   for (let op of operations) {
//     for (let docOp of op[1]) {
//       docRefs.push(docOp[1]);
//     }
//   }
//   if (docRefs.length) {
//     logger.info(
//       `Fetching ${docRefs.length} additional documents to fill in leaderboard`
//     );
//     const fetchedDocs = await db.getAll.apply(db, docRefs);
//     const annotatedStats: Stat[] = [];
//     // Used to map fetched docs as we walk through ops
//     let index = 0;
//     for (let [oldStat, docOps] of operations) {
//       let newStat: Stat | null = oldStat
//         ? {
//             ...oldStat,
//           }
//         : null;
//       for (let [mode] of docOps) {
//         const doc = fetchedDocs[index++];
//         if (doc.exists) {
//           const data = doc.data();
//           if (!newStat) {
//             // Use the first fetched value as a the base for missing data
//             newStat = { ...data } as Stat;
//             delete newStat.value;
//           }
//           if (data && data.value) {
//             // Apply the priority value as the stat for this mode
//             newStat[mode] = data.value[0];
//           } else if (oldStat) {
//             logger.error(
//               `Score ${oldStat.id} does not have a value for mode ${doc.ref.path}`
//             );
//           } else if (data) {
//             logger.error(
//               `Bad data for ${doc.ref.path} data: ${JSON.stringify(data)}`
//             );
//           } else {
//             logger.error(
//               `Can't find data. we have missing data for ${doc.ref.path}`
//             );
//           }
//         } else if (oldStat) {
//           logger.error(
//             `Score ${oldStat.id} was not found for mode ${doc.ref.path}`
//           );
//         } else {
//           logger.error(`No idea. we have missing data for ${doc.ref.path}`);
//         }
//       }
//       if (newStat) {
//         annotatedStats.push(newStat);
//       }
//     }
//     const hashedStats = annotatedStats.reduce((acc, stat) => {
//       acc[stat.id] = acc[stat.id] || ([] as Stat[]);
//       acc[stat.id].push(stat);
//       return acc;
//     }, {} as { [key: string]: Stat[] });
//     return unnest(
//       Object.values(hashedStats).map((stats: Stat[]) => {
//         return uniqWith(
//           (first: Stat, second: Stat) =>
//             Object.keys(first).length > Object.keys(second).length,
//           stats
//         );
//       })
//     );
//   }
//   return stats;
// }
