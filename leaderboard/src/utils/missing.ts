import { compose, difference, unnest, map, without, keys, uniq } from 'ramda'
import { Stat, LeaderboardStats } from '../ranker'

function allModes(leaderboard: LeaderboardStats) {
  return compose(
    without(['includes', 'meta']),
    keys
  )(leaderboard)
}

/**
 * Matches all stats items that are completely missing from includes
 *
 * @param leaderboard from leaderboard stats
 */
export function includes(leaderboard: LeaderboardStats) {
  // Finds the set of unique IDs flatten from all leaderboard modes taken from all values of the leadboard except `includes` and `meta`
  const uniqueIds = compose<LeaderboardStats, string[], string[][], string[], string[]>(
    uniq,
    unnest,
    map((mode: string) => leaderboard[mode]),
    allModes
  )(leaderboard)

  // Find all ids present in leaderboard not included at all (this is an error and should not have happened, but we can fix!)
  const { includes } = leaderboard
  return difference(uniqueIds, includes.map(({ id }) => id))
}

export type LeaderboardMissingStat = [Stat, [string, string][]]

/**
 * Matches all stats object in leaderboard that is missing a stat value
 *
 * @param leaderboard from leaderboard stats
 */
export function stats(leaderboard: LeaderboardStats): LeaderboardMissingStat[] {
  const stats = leaderboard.includes
  const modes = allModes(leaderboard)
  const ret = map(
    (stat: Stat) =>
      [
        stat,
        // For all leaderboard modes, check if the stat object is undefined and if so add
        modes.filter(mode => typeof stat[mode] === 'undefined').map(needed => [needed, stat.id] as [string, string])
      ] as [Stat, [string, string][]]
  )(stats).filter(([_stat, refs]) => refs.length)
  return ret
}
