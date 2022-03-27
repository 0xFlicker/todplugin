import diff from "jest-diff";
import { compose } from "ramda";
import { TableScores } from "../db/dynamodb";
import { Ranker } from "./ranker";

interface ScoreLike {
  Player_ID?: string;
  Score: number[];
  Date?: Date | string;
}

declare global {
  namespace jest {
    interface Matchers<R, T> {
      toHaveRanks(ranks: number[][]): R;
      toHaveLeaderboard(scores: ScoreLike[]): R;
    }
  }
}

function isLikeScore(expected: ScoreLike[]) {
  return (r: ScoreLike) =>
    expected.find(
      ({ Player_ID, Score }) =>
        r.Player_ID === Player_ID &&
        Score &&
        r.Score &&
        Score.length === r.Score.length &&
        Score.every((v, i) => v === r.Score[i])
    );
}

export function scoreMapToTableScores(input: { [key: string]: number[] }) {
  return Object.entries(input).reduce((memo, [id, value]) => {
    return [
      ...memo,
      { Player_ID: id, Score: value, Date: new Date() },
    ] as TableScores[];
  }, [] as TableScores[]);
}

export function createRankAndStack(ranker: Ranker) {
  return compose(
    async (promise) => {
      const [input, output] = await promise;
      await ranker.leaderboardUpdate(input, output);
      return await ranker.leaderboard();
    },
    async (scores: TableScores[]) => await ranker.setScores(scores),
    (input: { [key: string]: number[] } | TableScores[]): TableScores[] => {
      if (Array.isArray(input)) {
        return input;
      }
      return scoreMapToTableScores(input);
    }
  );
}

expect.extend({
  toHaveLeaderboard(received: TableScores[], expected: ScoreLike[]) {
    const options = {
      comment: "is leaderboard",
      isNot: this.isNot,
    };
    const pass =
      received.every(isLikeScore(expected)) &&
      expected.every(isLikeScore(received));

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
          `Expected: ${this.utils.printExpected(calculatedRanks)}\n` +
          `Received: ${this.utils.printReceived(ranks)}`
      : () => {
          const diffString = diff(calculatedRanks, ranks, {
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
              : `Expected: ${this.utils.printExpected(calculatedRanks)}\n` +
                `Received: ${this.utils.printReceived(ranks)}`)
          );
        };
    return Promise.resolve({ actual: calculatedRanks, message, pass });
  },
});
