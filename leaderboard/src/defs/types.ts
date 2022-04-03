import { TableScores } from "../db/dynamodb";
import { Ranker } from "../ranker";
import { Scorer } from "../ranker/scores";

export interface PeriodDef {
  periodName: string;
  boardName: string;
  description?: string;
  period: string;
  getRanker: () => Promise<Ranker>;
  leaderboard(opt?: {
    start: number;
    count: number;
  }): Promise<LeaderboardResponse>;
}

export interface LeaderboardDef extends Scorer {
  name: string;
  description?: string;
  branchingFactor: number;
  scoreRange: number[];
  
  ranks(opt: { playerId: string }): Promise<RankResponse>;
  periods: Record<string, PeriodDef;
}

export interface RankResponse {
  score: number[];
  ranks: { rank: number; period: string }[];
}

export interface ScoreResponse {
  score: number[];
}

export interface LeaderboardResponse {
  items: Omit<TableScores, "Date">[];
  meta: {
    size: number;
  };
}
