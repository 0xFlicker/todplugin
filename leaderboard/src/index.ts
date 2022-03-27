// import createCors from "cors";
// import blueprint from "./blueprint";

// const $ = blueprint.factory();
// const cors = createCors();

// export const scores = (function () {
//   let listener: any;
//   return async (message: any) => {
//     try {
//       if (!listener) {
//         listener = $(pubsubListener);
//       }
//       return (await listener)(message);
//     } catch (error) {
//       console.error(error);
//     }
//   };
// })();

// export const transform = (function () {
//   let listener: any;
//   return async (message: any) => {
//     try {
//       if (!listener) {
//         listener = $(pubsubTransformerListener);
//       }
//       return (await listener)(message);
//     } catch (error) {
//       console.error(error);
//     }
//   };
// })();

// export const leaderboard = (function () {
//   let handler: any;
//   return (req: any, res: any) => {
//     try {
//       if (!handler) {
//         handler = $((controller: any) => controller);
//       }
//       cors(req, res, async () => (await handler)(req, res));
//     } catch (error) {
//       console.error(error);
//     }
//   };
// })();

// export default $;
