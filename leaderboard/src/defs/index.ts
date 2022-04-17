import createRanker, { Ranker } from "../ranker/ranker";
import leaderboardConfig from "./leaderboards.json";
import { intervalStringToMs } from "../utils/time";
import { NotFoundError } from "../controller/errors";
import { DynamoDB } from "aws-sdk";
import { LeaderboardDef, PeriodDef } from "./types";
import { createScorer } from "../ranker/scores";

function createLeaderboard(
  name: string,
  description: string,
  branchingFactor: number,
  scoreRange: number[],
  db: DynamoDB.DocumentClient
): LeaderboardDef {
  const periods: LeaderboardDef["periods"] = {};
  const ranks: LeaderboardDef["ranks"] = async (opt) => {
    const { playerId } = opt;

    const allRanks: { rank: number; period: string }[] = [];
    let firstScore: number[] | null = null;
    // For each time period, look up the score and the rank
    for (const periodDef of Object.values(periods)) {
      const ranker = await periodDef.getRanker();
      const player = await ranker.fetchScore(playerId);
      if (player) {
        // Only need the score once
        if (!firstScore) {
          firstScore = player.Score;
        }
        // Can only load a single rank from a single ranker here
        const ranks = await ranker.findRanks([player.Score]);
        if (ranks.length) {
          allRanks.push({
            rank: ranks[0],
            period: periodDef.periodName,
          });
        }
      }
    }
    if (!firstScore) {
      // Unable to find any scores for player
      return {
        score: [],
        ranks: [],
      };
    }
    return {
      score: firstScore,
      ranks: allRanks,
    };
  };
  return {
    name,
    description,
    branchingFactor,
    scoreRange,
    ranks,
    periods,
    ...createScorer(name, db),
  };
}

function createLeaderboardPeriod(
  periodName: string,
  boardName: string,
  description: string,
  period: string,
  scoreRange: number[],
  branchingFactor: number,
  db: DynamoDB.DocumentClient
): PeriodDef {
  const getRanker = (() => {
    let ranker: Ranker;
    return async function getRanker() {
      if (!ranker) {
        const periodMs = intervalStringToMs(period);
        ranker = await createRanker({
          rootKey: `${boardName}_${periodName}`,
          period: periodMs,
          branchingFactor,
          scoreRange,
          db,
        });
      }
      return ranker;
    };
  })();

  const periodDef: PeriodDef = {
    periodName,
    boardName,
    description,
    period,
    getRanker,
    leaderboard: async (opt) => {
      const ranker = await getRanker();
      const leaderboard = await ranker.leaderboard();
      if (!leaderboard) {
        throw new NotFoundError("Leaderboard not found");
      }
      const { start, count } = opt || { start: 0, count: 10 };
      return {
        items: leaderboard.slice(start, count),
        meta: {
          size: leaderboard.length,
        },
      };
    },
  };
  return periodDef;
}

export function createLeaderboardDefs(
  db: DynamoDB.DocumentClient
): LeaderboardDef[] {
  const defs: LeaderboardDef[] = [];
  for (const [name, def] of Object.entries(leaderboardConfig.boards)) {
    const leaderboardDef = createLeaderboard(
      name,
      def.description,
      def.branchingFactor,
      def.scoreRange,
      db
    );
    const { periods } = leaderboardDef;
    for (const [periodName, periodDef] of Object.entries(def.periods)) {
      periods[periodName] = createLeaderboardPeriod(
        periodName,
        name,
        periodDef.description,
        periodDef.period,
        def.scoreRange,
        def.branchingFactor,
        db
      );
    }
    defs.push(leaderboardDef);
  }
  return defs;
}
