import { DocumentClient } from "aws-sdk/clients/dynamodb";

export async function boardNonce(
  boardName: string,
  db: DocumentClient
): Promise<number> {
  const response = await db
    .get({
      TableName: "nonces",
      Key: {
        Board_Name: boardName,
      },
    })
    .promise();
  if (!response.Item) {
    await db
      .put({
        TableName: "nonces",
        Item: {
          Board_Name: boardName,
          Nonce: 0,
        },
      })
      .promise();
    return 0;
  }
  const nonce = response.Item.Nonce;
  await db
    .update({
      TableName: "nonces",
      Key: {
        Board_Name: boardName,
      },
      UpdateExpression: "set Nonce = Nonce + :inc",
      ExpressionAttributeValues: {
        ":inc": 1,
      },
    })
    .promise();
  return nonce + 1;
}

export async function checkNonce(
  boardName: string,
  nonce: number,
  db: DocumentClient
): Promise<boolean> {
  const response = await db
    .get({
      TableName: "nonces",
      Key: {
        Board_Name: boardName,
      },
    })
    .promise();
  if (!response.Item) {
    return false;
  }
  const storedNonce = response.Item.Nonce;
  return nonce === storedNonce;
}
