import { DocumentClient } from "aws-sdk/clients/dynamodb";

export default function () {
  const isTest = process.env.JEST_WORKER_ID;
  const config = {
    convertEmptyValues: true,
    ...(isTest && {
      endpoint: "localhost:8000",
      sslEnabled: false,
      region: "local-env",
    }),
  };

  const ddb = new DocumentClient(config);
  return ddb;
}

export interface TableBoard {
  Name: string;
  Score_Range: number[];
  Branching_Factor: number;
  Period: number;
  Leaderboard_Size: number;
}

export interface TableScores {
  Board_Name: string;
  Player_ID: string;
  Score: number[];
  Date: string;
}

export interface TableNodes {
  Node_ID: string;
  Child_Counts: number[];
}

export interface TableLeaderboards {
  Board_Name: string;
  Period: number;
  Scores: TableScores[];
}
