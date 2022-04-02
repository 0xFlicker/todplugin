import "dotenv/config";
import program from "commander";
// import createDb from "./db/dynamodb";

// const boardCommands = program
//   .command('board')
//   .description('Manage leaderboards')

// boardCommands
//   .command('create <name>')
//   .description('Create a new leaderboard')
//   .action(async (name) => {
//     const db = createDb();
//     const createBoardResponse = db.

program.parse(process.argv);
