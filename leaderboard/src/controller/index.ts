import express from "express";

export default async function () {
  const app = express();
  // (await $(leaderboard))(app);
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
