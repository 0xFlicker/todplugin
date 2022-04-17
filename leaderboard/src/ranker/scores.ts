import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { TableScores } from "../db/dynamodb";

export interface Scorer {
  fetchScore(playerId: string): Promise<TableScores | null>;
  setScore(
    playerId: string,
    playerScore: { score: number[]; date?: Date | string }
  ): Promise<void>;
}

export function createScorer(boardName: string, db: DocumentClient): Scorer {
  return {
    async fetchScore(playerId: string): Promise<TableScores | null> {
      const response = await db
        .get({
          TableName: "scores",
          Key: {
            Player_ID: playerId,
            Board_Name: boardName,
          },
        })
        .promise();
      if (!response.Item) {
        return null;
      }
      return response.Item as TableScores;
    },
    async setScore(
      playerId: string,
      playerScore: { score: number[]; date?: Date | string }
    ): Promise<void> {
      const { score, date } = playerScore;
      let dateString;
      if (typeof date === "string") {
        dateString = date;
      } else if (typeof date === "number") {
        dateString = new Date(date).toISOString();
      } else if (date) {
        dateString = date.toISOString();
      } else {
        dateString = new Date().toISOString();
      }
      const params = {
        TableName: "scores",
        Item: {
          Player_ID: playerId,
          Board_Name: boardName,
          Score: score,
          Date: dateString,
        },
      };
      await db.put(params).promise();
    },
  };
}
