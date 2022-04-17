import { APIGatewayProxyHandler, SNSEvent } from "aws-lambda";
import createDb from "../db/dynamodb";
import { createLeaderboardDefs } from "../defs";
import { ScoreInput } from "../ranker/ranker";

export const httpHandler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "POST" && event.body) {
    const db = createDb();
    const leaderboardDefs = createLeaderboardDefs(db);
    const { boardName, scores }: { boardName: string; scores: ScoreInput[] } =
      JSON.parse(event.body);

    const l = leaderboardDefs.find((def) => def.name === boardName);
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

    return {
      statusCode: 200,
      body: "OK",
    };
  }
  return {
    statusCode: 400,
    body: "Bad Request",
  };
};

export async function sqsHandler(event: SNSEvent) {
  const scoresToSet = new Map<string, ScoreInput[]>();
  const db = createDb();
  const defs = createLeaderboardDefs(db);
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
