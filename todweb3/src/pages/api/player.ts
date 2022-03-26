import type { NextApiRequest, NextApiResponse } from "next";
import { request } from "https";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestOptions = {
    hostname: process.env.PLAYER_HOOK_HOST,
    port: process.env.PLAYER_HOOK_PORT || 443,
    path: process.env.PLAYER_HOOK_PATH || "/player",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Oddie-Secret": process.env.PLAYER_HOOK_SECRET,
    },
    ca: process.env.ROOT_CA,
  };
  const httpsReq = request(requestOptions);
  req.pipe(httpsReq);
  httpsReq.on("error", (err) => {
    console.error(err);
    res.status(500).send("Error connecting to player hook");
  });
  httpsReq.on("response", (response) => {
    if (response.statusCode !== 200) {
      // get response
      let data = "";
      response.on("data", (chunk) => {
        data += chunk;
      });
      response.on("end", () => {
        console.warn(
          `Player hook responded with ${response.statusCode}: ${data}`
        );
      });
      res.status(500).send("Error connecting to player hook");
    } else {
      res.status(200).send("OK");
    }
  });
  return new Promise((resolve) => {
    httpsReq.on("end", resolve);
  });
}
