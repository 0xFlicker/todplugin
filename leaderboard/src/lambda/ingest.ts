import { SNSEvent } from "aws-lambda";
import createDb from "../db/dynamodb";
import { createLeaderboardDefs } from "../defs";
import { ScoreInput } from "../ranker/ranker";

export async function handler(event: SNSEvent) {
  const scoresToSet = new Map<string, ScoreInput[]>();
  for (const request of event.Records) {
    const {
      Sns: { Message: message },
    } = request;
    const { boardName, scores }: { boardName: string; scores: ScoreInput[] } =
      JSON.parse(message);
    scoresToSet.set(boardName, [
      ...(scoresToSet.get(boardName) ?? []),
      ...scores,
    ]);
  }

  for (const [boardName, scores] of scoresToSet) {
    const db = createDb();
    const defs = createLeaderboardDefs(db);
    const l = defs.find((def) => def.name === boardName);
    if (!l) {
      throw new Error(`No leaderboard found with name ${boardName}`);
    }
    for (const score of scores) {
      await l.setScore(score.playerId, {
        score: score.score,
        date: score.date,
      });
      for (const period of Object.values(l.periods)) {
        const ranker = await period.getRanker();
        const [scoresIn, scoresOut] = await ranker.setScores(scores);
        await ranker.leaderboardUpdate(scoresIn, scoresOut);
      }
    }
  }
}
