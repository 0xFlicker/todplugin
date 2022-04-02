import { Express } from "express";
import swaggerUI from "swagger-ui-express";
import type { OpenApiV3 } from "openapi-enforcer";
import logger from "../utils/logger";
import { NotFoundError } from "./errors";
import { LeaderboardDef } from "../defs/types";

export async function leaderboard(
  defs: LeaderboardDef[],
  leaderboardSchema: object,
  leaderboardOpenapi: OpenApiV3.OpenApiV3
) {
  return (app: Express) => {
    app.use("/docs", swaggerUI.serve, swaggerUI.setup(leaderboardSchema));
    for (let def of defs) {
      // app.get(route, async (req, res) => {
      //   try {
      //     const response = await def.leaderboard(req.query);
      //     return res.status(200).send(response);
      //   } catch (error) {
      //     if (error instanceof NotFoundError) {
      //       return res.status(404).send({
      //         message: "No leaderboard found",
      //       });
      //     } else {
      //       logger.error(`Error loading leaderboard ${route}`, error);
      //       return res.status(500).send("ERROR");
      //     }
      //   }
      // });
      for (let period of Object.values(def.periods)) {
        const route = `/${period.boardName}/${period.periodName}`;
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
            const rankerResponse = await period.leaderboard(operation.query);
            const validation = operation.response(200, rankerResponse);
            const { error: responseError, warning: responseWarning } =
              validation;
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
            if (error instanceof NotFoundError) {
              return res.status(404).send({
                message: "No leaderboard found",
              });
            } else {
              logger.error(`Error loading leaderboard ${route}`, error);
              return res.status(500).send("ERROR");
            }
          }
        });
      }
    }
  };
}
