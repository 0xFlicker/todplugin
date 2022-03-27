describe.skip("stat test", () => {
  // it("makes fresh stats", () => {
  //   const scores = fakeStats(10);
  //   const [newAccuracyScores, newKillScores, newPointScores] =
  //     spreadScores(scores);
  //   const stat = stats({
  //     accuracy: [newAccuracyScores.sort(sortScoreData), newAccuracyScores],
  //     kills: [newKillScores.sort(sortScoreData), newKillScores],
  //     points: [newPointScores.sort(sortScoreData), newPointScores],
  //   });
  //   expect(stat).toEqual(
  //     expect.objectContaining({
  //       accuracy: expect.arrayContaining(mapIds(newAccuracyScores)),
  //       kills: expect.arrayContaining(mapIds(newKillScores)),
  //       points: expect.arrayContaining(mapIds(newPointScores)),
  //       includes: expect.arrayContaining(scores),
  //     })
  //   );
  // });
  // it("can add scores", () => {
  //   const fakeScores = fakeStats(10);
  //   const [accuracyScores, killScores, pointScores] = spreadScores(
  //     fakeScores
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   const newScores = fakeStats(10);
  //   const [newAccuracyScores, newKillScores, newPointScores] = spreadScores(
  //     newScores
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   const accuracyLeaderboard = accuracyScores
  //     .concat(newAccuracyScores)
  //     .sort(sortScoreData);
  //   const killsLeaderboard = killScores
  //     .concat(newKillScores)
  //     .sort(sortScoreData);
  //   const pointsLeaderboard = pointScores
  //     .concat(newPointScores)
  //     .sort(sortScoreData);
  //   const stat = stats(
  //     {
  //       accuracy: [accuracyLeaderboard, newAccuracyScores],
  //       kills: [killsLeaderboard, newKillScores],
  //       points: [pointsLeaderboard, newPointScores],
  //     },
  //     {
  //       includes: fakeScores,
  //       accuracy: mapIds(accuracyScores),
  //       kills: mapIds(killScores),
  //       points: mapIds(pointScores),
  //     } as any
  //   );
  //   expect(stat.includes).toHaveLength(20);
  //   expect(stat.accuracy).toEqual(mapIds(accuracyLeaderboard));
  //   expect(stat).toEqual(
  //     expect.objectContaining({
  //       accuracy: expect.arrayContaining(mapIds(accuracyLeaderboard)),
  //       kills: expect.arrayContaining(mapIds(killsLeaderboard)),
  //       points: expect.arrayContaining(mapIds(pointsLeaderboard)),
  //       includes: expect.arrayContaining(fakeScores.concat(newScores)),
  //     })
  //   );
  // });
  // it("can mutate existing scores", () => {
  //   const fakeScores = fakeStats(10);
  //   const [accuracyScores, killScores, pointScores] = spreadScores(
  //     fakeScores
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   const newScores = fakeScores.map(({ id, name }) => ({
  //     id,
  //     name,
  //     eventId: "foo",
  //     ...fakePoints(),
  //   }));
  //   const [newAccuracyScores, newKillScores, newPointScores] = spreadScores(
  //     newScores as any[]
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   const accuracyLeaderboard = newAccuracyScores.sort(sortScoreData);
  //   const killsLeaderboard = newKillScores.sort(sortScoreData);
  //   const pointsLeaderboard = newPointScores.sort(sortScoreData);
  //   const stat = stats(
  //     {
  //       accuracy: [accuracyLeaderboard, newAccuracyScores],
  //       kills: [killsLeaderboard, newKillScores],
  //       points: [pointsLeaderboard, newPointScores],
  //     },
  //     {
  //       includes: fakeScores,
  //       accuracy: mapIds(accuracyScores),
  //       kills: mapIds(killScores),
  //       points: mapIds(pointScores),
  //     } as any
  //   );
  //   expect(stat).toEqual(
  //     expect.objectContaining({
  //       accuracy: expect.arrayContaining(mapIds(accuracyLeaderboard)),
  //       kills: expect.arrayContaining(mapIds(killsLeaderboard)),
  //       points: expect.arrayContaining(mapIds(pointsLeaderboard)),
  //       includes: expect.arrayContaining(newScores),
  //     })
  //   );
  // });
  // it("can mutate existing and add scores", () => {
  //   const fakeScores = fakeStats(10);
  //   const [accuracyScores, killScores, pointScores] = spreadScores(
  //     fakeScores
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   const newScores: any[] = fakeScores
  //     .map(({ id, name }) => ({
  //       id,
  //       eventId: "foo",
  //       name,
  //       ...fakePoints(),
  //     }))
  //     .concat(fakeStats(10) as any[]);
  //   const [newAccuracyScores, newKillScores, newPointScores] = spreadScores(
  //     newScores
  //   ).map((a: ScoreData[]) => a.sort(sortScoreData));
  //   const accuracyLeaderboard = newAccuracyScores.sort(sortScoreData);
  //   const killsLeaderboard = newKillScores.sort(sortScoreData);
  //   const pointsLeaderboard = newPointScores.sort(sortScoreData);
  //   const stat = stats(
  //     {
  //       accuracy: [accuracyLeaderboard, newAccuracyScores],
  //       kills: [killsLeaderboard, newKillScores],
  //       points: [pointsLeaderboard, newPointScores],
  //     },
  //     {
  //       includes: fakeScores,
  //       accuracy: mapIds(accuracyScores),
  //       kills: mapIds(killScores),
  //       points: mapIds(pointScores),
  //     } as any
  //   );
  //   expect(stat).toEqual(
  //     expect.objectContaining({
  //       accuracy: expect.arrayContaining(mapIds(accuracyLeaderboard)),
  //       kills: expect.arrayContaining(mapIds(killsLeaderboard)),
  //       points: expect.arrayContaining(mapIds(pointsLeaderboard)),
  //       includes: expect.arrayContaining(newScores),
  //     })
  //   );
  // });
  // it("can resolve disparate leaderboards", async () => {
  //   const db = createDb();
  //   const accuracyRanker = await createRanker({
  //     rootKey: "accuracy",
  //     scoreRange: [0, 101],
  //     branchingFactor: 100,
  //     db,
  //   });
  //   const killsRanker = await createRanker({
  //     rootKey: "kills",
  //     scoreRange: [0, 1001],
  //     branchingFactor: 100,
  //     db,
  //   });
  //   const pointsRanker = await createRanker({
  //     rootKey: "points",
  //     scoreRange: [0, 1000001],
  //     branchingFactor: 100,
  //     db,
  //   });
  //   const fakeScores = fakeStats(50);
  //   const [allAccuracyScores, allKillScores, allPointScores] = spreadScores(
  //     fakeScores
  //   ).map((a: TableScores[]) => a.sort(sortScoreData));
  //   // Save all scores to the ranker's DB
  //   for (let score of allAccuracyScores) {
  //     const docResponse = await db
  //       .get({
  //         TableName: "scores",
  //         Key: {
  //           Player_ID: accuracyRanker.keyForScore(score.id),
  //         },
  //       })
  //       .promise();
  //     if (docResponse.Item) {
  //       await db
  //         .update({
  //           TableName: "scores",
  //           Key: {
  //             Player_ID: accuracyRanker.keyForScore(score.id),
  //           },
  //           UpdateExpression: "set Score = :score",
  //           ExpressionAttributeValues: {
  //             ":score": docResponse.Item.Score
  //           },
  //         }).promise()
  //   }
  //   for (let score of allKillScores) {
  //     const docRef = db.doc(killsRanker.keyForScore(score.id));
  //     await docRef.set(score);
  //   }
  //   for (let score of allPointScores) {
  //     const docRef = db.doc(pointsRanker.keyForScore(score.id));
  //     await docRef.set(score);
  //   }
  //   //console.log(accuracyScores, killScores)
  //   // But the leaderboard will only get some of the scores
  //   const accuracyScores = allAccuracyScores.slice(-10);
  //   const killScores = allKillScores.slice(-10);
  //   const pointScores = allPointScores.slice(-10);
  //   // Leaderboard "includes" have holes
  //   const stat = stats({
  //     accuracy: [accuracyScores, accuracyScores],
  //     kills: [killScores, killScores],
  //     points: [pointScores, pointScores],
  //   });
  //   // File in holes
  //   stat.includes = await fillHoles(
  //     db,
  //     {
  //       accuracy: accuracyRanker,
  //       kills: killsRanker,
  //       points: pointsRanker,
  //     },
  //     stat
  //   );
  //   expect(stat).toEqual(
  //     expect.objectContaining({
  //       accuracy: expect.arrayContaining(mapIds(accuracyScores)),
  //       kills: expect.arrayContaining(mapIds(killScores)),
  //       points: expect.arrayContaining(mapIds(pointScores)),
  //     })
  //   );
  //   // console.log(stat.includes)
  //   for (let s of stat.includes) {
  //     expect(s).toEqual(
  //       expect.objectContaining({
  //         id: expect.any(String),
  //         name: expect.any(String),
  //         accuracy: expect.any(Number),
  //         kills: expect.any(Number),
  //         points: expect.any(Number),
  //       })
  //     );
  //   }
  // });
});
