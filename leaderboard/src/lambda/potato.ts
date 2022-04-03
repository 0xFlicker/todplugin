import { SNSEvent } from "aws-lambda";

export function ingest(event: SNSEvent) {
  console.log(JSON.stringify(event));
}
