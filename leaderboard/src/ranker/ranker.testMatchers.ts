import diff from "jest-diff";
import { compose } from "ramda";
import { TableScores } from "../db/dynamodb";
import { Ranker, ScoreInput } from "./ranker";

interface ScoreLike {
  Player_ID?: string;
  Score: number[];
  Date?: Date | string;
}

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toHaveRanks(ranks: number[][]): Promise<R>;
      toHaveLeaderboard(scores: ScoreInput[]): R;
    }
  }
}

function isLikeScore(expected: ScoreInput[]) {
  return (r: ScoreLike) =>
    expected.find(
      ({ playerId: Player_ID, score: Score }) =>
        r.Player_ID === Player_ID &&
        Score &&
        r.Score &&
        Score.length === r.Score.length &&
        Score.every((v, i) => v === r.Score[i])
    );
}

function isLikeScoreOpposite(expected: ScoreLike[]) {
  return (r: ScoreInput) =>
    expected.find(
      ({ Player_ID, Score }) =>
        r.playerId === Player_ID &&
        Score &&
        r.score &&
        Score.length === r.score.length &&
        Score.every((v, i) => v === r.score[i])
    );
}

export function scoreMapToTableScores(input: { [key: string]: number[] }) {
  return Object.entries(input).reduce((memo, [id, value]) => {
    return [
      ...memo,
      { playerId: id, score: value, Date: new Date().toUTCString() },
    ] as ScoreInput[];
  }, [] as ScoreInput[]);
}

export function createRankAndStack(ranker: Ranker) {
  return compose(
    async (promise) => {
      const [input, output] = await promise;
      await ranker.leaderboardUpdate(input, output);
      return await ranker.leaderboard();
    },
    async (scores: ScoreInput[]) => await ranker.setScores(scores),
    (input: { [key: string]: number[] } | ScoreInput[]): ScoreInput[] => {
      if (Array.isArray(input)) {
        return input;
      }
      return scoreMapToTableScores(input);
    }
  );
}

expect.extend({
  toHaveLeaderboard(received: TableScores[], expected: ScoreInput[]) {
    const options = {
      comment: "is leaderboard",
      isNot: this.isNot,
    };
    const pass =
      received.every(isLikeScore(expected)) &&
      expected.every(isLikeScoreOpposite(received));

    const message = pass
      ? () =>
          // @ts-ignore
          this.utils.matcherHint(
            "toHaveLeaderboard",
            undefined,
            undefined,
            options
          ) +
          "\n\n" +
          `Expected: ${this.utils.printExpected(expected)}\n` +
          `Received: ${this.utils.printReceived(received)}`
      : () => {
          const diffString = diff(expected, received, {
            expand: this.expand,
          });
          return (
            // @ts-ignore
            this.utils.matcherHint(
              "toHaveLeaderboard",
              undefined,
              undefined,
              options
            ) +
            "\n\n" +
            (diffString && diffString.includes("- Expect")
              ? `Difference:\n\n${diffString}`
              : `Expected: ${this.utils.printExpected(expected)}\n` +
                `Received: ${this.utils.printReceived(received)}`)
          );
        };

    return { actual: received, message, pass };
  },
  async toHaveRanks(ranker: Ranker, ranks: number[][]) {
    const options = {
      comment: "is rank",
      isNot: this.isNot,
    };
    const calculatedRanks: number[][] = [];
    let isPassed = true;
    let failedOn: number[] = [];
    for (let n = 0; n < ranks.length; n++) {
      const result = await ranker.findScore(n);
      if (!result) {
        isPassed = false;
        failedOn.push(n);
        continue;
      }
      calculatedRanks.push(<number[]>result[0]);
    }
    if (!isPassed) {
      return Promise.resolve({
        message: () =>
          `Unable to obtain rank ${failedOn.join(
            ", "
          )} but got ${calculatedRanks.join(", ")}`,
        pass: this.isNot,
      });
    }

    const pass = this.equals(ranks, calculatedRanks);
    const message = pass
      ? () =>
          // @ts-ignore
          this.utils.matcherHint("toHaveRanks", undefined, undefined, options) +
          "\n\n" +
          `Expected: ${this.utils.printExpected(ranks)}\n` +
          `Received: ${this.utils.printReceived(calculatedRanks)}`
      : () => {
          const diffString = diff(ranks, calculatedRanks, {
            expand: this.expand,
          });
          return (
            // @ts-ignore
            this.utils.matcherHint(
              "toHaveRanks",
              undefined,
              undefined,
              options
            ) +
            "\n\n" +
            (diffString && diffString.includes("- Expect")
              ? `Difference:\n\n${diffString}`
              : `Expected: ${this.utils.printExpected(ranks)}\n` +
                `Received: ${this.utils.printReceived(calculatedRanks)}`)
          );
        };
    return Promise.resolve({ actual: calculatedRanks, message, pass });
  },
});
