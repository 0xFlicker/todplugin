import express from "express";
import swaggerUI from "swagger-ui-express";

export default async function (
  $: any,
  leaderboardSchema: object,
  leaderboard: any
) {
  const app = express();
  app.use("/docs", swaggerUI.serve, swaggerUI.setup(leaderboardSchema));
  const leaderboardApp = await $(leaderboard);
  leaderboardApp(app);
  // (await $(ranking))(app);
  // @ts-ignore All of these vars need to be here to enable error handling
  app.use((err: any, req, res, next) => {
    res.status(err.status).json({
      message: err.message,
      errors: err.errors,
    });
  });
  return app;
}
