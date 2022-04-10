import serverlessExpress from "@vendia/serverless-express";
import express from "express";
import { APIGatewayProxyHandler } from "aws-lambda";
import swaggerUI from "swagger-ui-express";
import createDb from "../db/dynamodb";
import { createLeaderboardDefs } from "../defs";
import { leaderboardOpenapi, leaderboardSchema } from "../openapi";
import { createLeaderboard } from "../controller/leaderboard";
import { rankingController } from "../controller/ranking";
import { scoreController } from "../controller/score";

const getLeaderboardSchema = (() => {
  let instance: any;
  return async () => {
    if (!instance) {
      instance = await leaderboardSchema();
    }
    return instance;
  };
})();

const getOpenApi = (() => {
  let openApi: any;
  return async (leaderboardSchema: any) => {
    if (!openApi) {
      openApi = await leaderboardOpenapi(leaderboardSchema);
    }
    return openApi;
  };
})();

async function createApp(openApi: any, leaderboardSchema: any, stage: string) {
  const app = express();
  const db = createDb();
  const leaderboardDefs = createLeaderboardDefs(db);
  app.use(
    "/docs",
    swaggerUI.serveWithOptions({
      redirect: false,
    }),
    swaggerUI.setup({
      ...leaderboardSchema,
      servers: [
        {
          url: `/${stage}`,
        },
      ],
    })
  );
  const leaderboardApp = await createLeaderboard(leaderboardDefs, openApi);
  const rankingApp = await rankingController(leaderboardDefs, openApi);
  const scoreApp = await scoreController(leaderboardDefs, openApi);
  leaderboardApp(app);
  rankingApp(app);
  scoreApp(app);
  // @ts-ignore All of these vars need to be here to enable error handling
  app.use((err: any, req, res, next) => {
    res.status(err.status).json({
      message: err.message,
      errors: err.errors,
    });
  });
  return app;
}

const getSeverlessExpress = (() => {
  let instance: any;
  return async (openApi: any, leaderboardSchema: any, stage: string) => {
    if (!instance) {
      const app = await createApp(openApi, leaderboardSchema, stage);
      instance = serverlessExpress({ app });
    }
    return instance;
  };
})();

export const handler: APIGatewayProxyHandler = async function handler(
  event,
  context
) {
  const schema = await getLeaderboardSchema();
  const sa = await getSeverlessExpress(
    await getOpenApi(schema),
    schema,
    event.requestContext.stage
  );
  return sa(event, context);
};

exports.handler = handler;
