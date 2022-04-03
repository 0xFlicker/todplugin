import { LeaderboardDef } from "../defs/types";

export interface IInjectArgs {
  boardName: string;
  scores: {
    score: number[];
    date?: Date | string;
    playerId: string;
  }[];
}

export function ingest(defs: LeaderboardDef[]) {
  return async (event: IInjectArgs) => {
    const { boardName, scores } = event;
    const boardDef = defs.find((def) => def.name === boardName);
    if (!boardDef) {
      throw new Error(`No leaderboard found with name ${boardName}`);
    }
    // First set the root score
    for (const score of scores) {
      const { playerId, score: scoreValue, date } = score;
      await boardDef.setScore(playerId, { score: scoreValue, date });
    }

    // Then set the scores for each period
    for (const periodDef of Object.values(boardDef.periods)) {
      const { getRanker } = periodDef;

      const ranker = await getRanker();
      const [scoresIn, scoresOut] = await ranker.setScores(
        scores.map((score) => {
          const { date } = score;
          let dateString;
          if (typeof date === "string") {
            dateString = date;
          } else if (date) {
            dateString = date.toISOString();
          } else {
            dateString = new Date().toISOString();
          }
          return {
            Player_ID: score.playerId,
            Score: score.score,
            Date: dateString,
          };
        })
      );
      await ranker.leaderboardUpdate(scoresIn, scoresOut);
    }
  };
}