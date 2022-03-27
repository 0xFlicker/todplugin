import { Express } from "express";
import swaggerUI from "swagger-ui-express";
import { trimLeaderboard } from "../transforms/response";
import { OpenApiV3 } from "openapi-enforcer";
import logger from "../utils/logger";
import { Ranker } from "../ranker";
import { TableScores } from "../db/dynamodb";

export interface LeaderboardResponse {
  items: Omit<TableScores, "Date">[];
  meta: {
    size: number;
  };
}

export interface RankerDefinition {
  ranker: Ranker;
  experience: string;
  timeFrame: string;
  read(opt?: { start: number; count: number }): Promise<LeaderboardResponse>;
}

export async function leaderboard(
  defs: RankerDefinition[],
  leaderboardSchema: object,
  leaderboardOpenapi: OpenApiV3
) {
  return (app: Express) => {
    app.use("/docs", swaggerUI.serve, swaggerUI.setup(leaderboardSchema));
    for (let def of defs) {
      const route = `/${def.experience}/${def.timeFrame}`;
      app.get(route, async (req, res) => {
        try {
          const leaderboard = await def.ranker.leaderboard();
          if (leaderboard) {
            const { start, count } = req.query;
            return res.status(200).send({
              items: trimLeaderboard(leaderboard.slice(start, count)),
              meta: {
                size: leaderboard.length,
              },
            });
          }
          return res.status(404).send({
            message: "No leaderboard found",
          });
        } catch (error) {
          logger.error(`Error loading leaderboard ${route}`, error);
          return res.status(500).send("ERROR");
        }
      });

      app.get(route, async (req, res) => {
        try {
          const openApiRequest = leaderboardOpenapi.request({
            header: req.header,
            method: req.method,
            path: req.url,
          });
          const { error: requestError, warning: requestWarning } =
            openApiRequest;
          if (requestError || requestWarning) {
            const statusCode =
              (requestError && requestError.statusCode) ||
              (requestWarning && requestWarning.statusCode) ||
              500;
            return res
              .status(statusCode)
              .send({ error: requestError, warning: requestWarning });
          }
          const [operation] = openApiRequest;
          const rankerResponse = await def.read(operation.query);
          const validation = operation.response(200, rankerResponse);
          const { error: responseError, warning: responseWarning } = validation;
          if (responseError || responseWarning) {
            logger.error(`Validation error on response for ${route}`, {
              error: responseError,
              warning: responseWarning,
            });
            return res
              .status(500)
              .send({ error: responseError, warning: responseWarning });
          }
          const [response] = validation;
          return res.status(200).send(response.body);
        } catch (error) {
          logger.error(`Error loading leaderboard ${route}`, error);
          return res.status(500).send("ERROR");
        }
      });
    }
  };
}
