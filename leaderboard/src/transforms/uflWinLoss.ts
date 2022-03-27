// import { UflSessionData, UflMember, UflRoundStat, UflTeam } from '../types/ufl'
// import { Glicko2, Matches, Player } from 'glicko2'
// import { ReadOnlyPlayer } from '../glicko2'
// import logger from '../utils/logger'

// function gamestates(team1: UflTeam, team2?: UflTeam): { draw: boolean; win: boolean } {
//   if (typeof team1.isWinningTeam === 'boolean') {
//     // old format
//     return team2
//       ? { draw: !team1.isWinningTeam && !team2.isWinningTeam, win: team1.isWinningTeam }
//       : { draw: true, win: team1.isWinningTeam }
//   }
//   return { draw: !!team1.isDraw, win: !!team1.isVictoryTeam }
// }

// /*
//   For each UFL match, create a composite player that is an average of all players on a team

//   Calculate each player's win/loss versus the composite player

//   Shown to be stable team rating option:
//   http://rhetoricstudios.com/downloads/AbstractingGlicko2ForTeamGames.pdf
// */

// type Team = { id: string; members: UflMember[]; win: boolean; draw: boolean }

// function compositePlayerFromTeam(glicko2: Glicko2, players: ReadOnlyPlayer[], members: UflMember[]) {
//   return glicko2.makePlayer(
//     ...(members
//       .reduce(
//         (memo, curr) => {
//           const [rating, rd, vol] = memo
//           const player = players.find(p => p.getId() === curr.id)
//           if (player) {
//             return [rating + player.getRating(), rd + player.getRd(), vol + player.getVol()]
//           }
//           return memo
//         },
//         [0, 0, 0]
//       )
//       .map(v => v / members.length) as [number, number, number])
//   )
// }

// function teamRatings(sessionData: UflSessionData, glicko2: Glicko2, players: ReadOnlyPlayer[]): void {
//   // First separate the players into teams
//   const teams: Team[] = sessionData.team.map(team => ({
//     id: team.id,
//     members: [],
//     ...gamestates(
//       team,
//       sessionData.team.find(t => t !== team)
//     )
//   }))
//   for (const member of sessionData.members) {
//     let team = teams.find(t => t.id === member.teamId)
//     if (team) {
//       team.members.push(member)
//     } else {
//       logger.warn(`No team found for member: ${member.id}`)
//     }
//   }
//   // Construct individual rounds
//   const matches: Matches = []

//   // I assume there is probably only ever 2 teams in a UFL session but since I don't know that....
//   const winningTeams = teams.filter(t => t.win && !t.draw)
//   const losingTeams = teams.filter(t => !t.win && !t.draw)
//   const drawTeams = teams.filter(t => t.draw)

//   // Create a composite player for each team that is an average of all player ratings
//   const compositeWinners = winningTeams.map(({ members }) => compositePlayerFromTeam(glicko2, players, members))
//   const compositeLosers = losingTeams.map(({ members }) => compositePlayerFromTeam(glicko2, players, members))
//   // For the draw teams, also save the original draw team array so that we can later filter them
//   const compositeDrawers: [Team, Player][] = drawTeams.map(drawTeam => [
//     drawTeam,
//     compositePlayerFromTeam(glicko2, players, drawTeam.members)
//   ])

//   function getPlayer(member: UflMember) {
//     const { id } = member
//     if (id) {
//       const player = players.find(p => p.getId() === member.id)
//       return player
//     }
//     return
//   }
//   // Now go through each team and create match results
//   for (const winningTeam of winningTeams) {
//     for (const winMember of winningTeam.members) {
//       const playerProxy = getPlayer(winMember)
//       if (playerProxy) {
//         for (const losePlayer of compositeLosers) {
//           matches.push([playerProxy.getPlayer(), losePlayer, 1])
//         }
//       }
//     }
//   }
//   for (const losingTeam of losingTeams) {
//     for (const loseMember of losingTeam.members) {
//       const playerProxy = getPlayer(loseMember)
//       if (playerProxy) {
//         for (const winPlayer of compositeWinners) {
//           matches.push([playerProxy.getPlayer(), winPlayer, 0])
//         }
//       }
//     }
//   }
//   for (const drawTeam of drawTeams) {
//     // Find the other teams in the draw pool
//     const otherTeams = compositeDrawers.filter(([t]) => t.id !== drawTeam.id).map(([_, player]) => player)
//     for (const drawMember of drawTeam.members) {
//       const playerProxy = getPlayer(drawMember)
//       if (playerProxy) {
//         for (const otherTeam of otherTeams) {
//           matches.push([playerProxy.getPlayer(), otherTeam, 0.5])
//         }
//       }
//     }
//   }
//   glicko2.updateRatings(matches)
// }

// /**
//  * Adjusts each player's score based on their individual performance
//  *
//  * For each player, apply a win/loss for each round with an adjust rd value that is divided by the number of opponents
//  *
//  * @param sessionData
//  * @param glicko2
//  * @param players
//  */
// function individualRatings(sessionData: UflSessionData, glicko2: Glicko2, players: ReadOnlyPlayer[]) {
//   const playerDataMap = sessionData.members.reduce((memo, curr) => {
//     const playerProxy = players.find(p => p.getId() === curr.id)
//     if (playerProxy) {
//       const player = playerProxy.getPlayer()
//       memo.set(curr.id, [player, curr])
//     }
//     return memo
//   }, new Map<string, [Player, UflMember]>())
//   // Reconstruct match history into new map
//   // Organizes round stats by round number
//   const roundHistoryMap: { [key: string]: UflRoundStat }[] = []
//   for (const member of sessionData.members) {
//     for (const roundStat of member.roundStat) {
//       roundHistoryMap[Number(roundStat.round)] = roundHistoryMap[Number(roundStat.round)] || {}
//       roundHistoryMap[Number(roundStat.round)][member.id] = roundStat
//     }
//   }

//   // Represents each player and their individaul win/loss history for the match
//   // For example, if Alice won against Bob and lost against Charlie:
//   // [Alice,[[Bob, 1], [Charlie, 0]]]

//   const playerHistory = [...playerDataMap.values()].reduce((memo, [player, member]) => {
//     const results: [Player, 0 | 1 | 0.5][] = []
//     for (const roundStat of member.roundStat) {
//       const { round, win } = roundStat
//       const result = Object.entries(roundHistoryMap[round]).find(([id]) => id !== member.id)
//       if (result) {
//         const [opponentId, opponentRoundStat] = result
//         const opponentPlayer = playerDataMap.get(opponentId)
//         if (opponentPlayer) {
//           const matchResult =
//             !win && !opponentRoundStat.win
//               ? 0.5 // draw
//               : win
//               ? 1
//               : 0
//           results.push([opponentPlayer[0], matchResult])
//         }
//       }
//     }
//     memo.push([player, results])
//     return memo
//   }, [] as [Player, [Player, 0 | 1 | 0.5][]][])

//   // Adjust each players rd by the number of opponents
//   for (const [player, results] of playerHistory) {
//     player.setRd(player.getRd() / results.length)
//   }

//   const matches: Matches = []
//   for (const [player, history] of playerHistory) {
//     for (const [opponent, result] of history) {
//       matches.push([player, opponent, result])
//     }
//   }
//   glicko2.updateRatings(matches)
//   // descale rd
//   for (const [player, results] of playerHistory) {
//     player.setRd(player.getRd() * results.length)
//   }
// }

// export default function(sessionData: UflSessionData, glicko2: Glicko2, players: ReadOnlyPlayer[]): void {
//   teamRatings(sessionData, glicko2, players)
//   individualRatings(sessionData, glicko2, players)
// }
