import { map, omit } from "ramda";

/**
 * Removes stuff not needed for display leaving behind a much slimmer payload
 */
export const trimLeaderboard = map(omit(["Date"]));
