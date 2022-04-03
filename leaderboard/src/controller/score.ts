import { Express } from "express";
import bodyParser from "body-parser";
import type { OpenApiV3 } from "openapi-enforcer";
import logger from "../utils/logger";
import { NotFoundError } from "./errors";
import { LeaderboardDef } from "../defs/types";

export async function scoreController(
  defs: LeaderboardDef[],
  leaderboardOpenapi: OpenApiV3.OpenApiV3
) {
  return (app: Express) => {
    for (let def of defs) {
      app.post(`/score/${def.name}`, bodyParser.json(), async (req, res) => {
        try {
          const openApiRequest = leaderboardOpenapi.request({
            header: req.header,
            method: req.method,
            path: req.url,
            body: req.body,
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

          const rankerResponse = await def.fetchScore(operation.body.playerId);
          const validation = operation.response(200, rankerResponse);

          const { error: responseError, warning: responseWarning } = validation;
          if (responseError || responseWarning) {
            logger.error(`Validation error on response for ${def.name}`, {
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
          if (error instanceof NotFoundError) {
            return res.status(404).send({
              message: "No leaderboard found",
            });
          } else {
            logger.error(`Error loading leaderboard ${def.name}`, error);
            return res.status(500).send("ERROR");
          }
        }
      });
    }
  };
}
