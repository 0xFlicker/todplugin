import Enforcer from "openapi-enforcer";
import { leaderboardSchema } from "./index";

describe("leaderboard openapi", () => {
  it("Validates", async () => {
    const schema = await leaderboardSchema();
    const [res, err] = await Enforcer(schema, {
      fullResult: true,
    });
    expect(res).toEqual(
      expect.objectContaining({
        components: expect.any(Object),
        info: expect.any(Object),
        openapi: expect.any(String),
        paths: expect.any(Object),
        servers: expect.any(Object),
      })
    );
    expect(err).toBeUndefined();
  });
});
