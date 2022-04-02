import faker from "faker";
import { scoreSort } from "../utils/score";
import { TableScores } from "../db/dynamodb";

const defaultAmount = 10;

export const DAY =
  24 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000; /* ms */

function rand(num: number) {
  return Math.floor(Math.random() * num);
}

export function sample(input: any[]) {
  return input[rand(input.length)];
}

export function recent(ms: number) {
  const date = new Date();

  let past = date.getTime();
  past -= rand(ms); // some time from now to N days ago, in milliseconds
  date.setTime(past);

  return date;
}

export function randomRange(min: number, max: number) {
  return faker.random.number({ min, max });
}

export function handle() {
  return faker.internet.userName();
}

export function uuid() {
  return faker.random.uuid();
}

export function fakesScores(amount: number = defaultAmount) {
  const scores: TableScores[] = [];
  for (let i = 0; i < amount; i++) {
    scores.push(fakeScore());
  }
  return scores;
}

export function fakeScore(): TableScores {
  return {
    Player_ID: faker.random.uuid(),
    Board_Name: faker.random.uuid(),
    Date: recent(DAY).toUTCString(),
    Score: [randomRange(0, 100), randomRange(0, 100)],
  };
}

export const sortScoreData = (a: TableScores, b: TableScores) =>
  scoreSort(a.Score, b.Score);
