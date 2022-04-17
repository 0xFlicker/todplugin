package com.oddie.leaderboard;

import java.io.IOException;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Player;
import org.bukkit.scoreboard.DisplaySlot;
import org.bukkit.scoreboard.Objective;
import org.bukkit.scoreboard.RenderType;
import org.bukkit.scoreboard.Scoreboard;

public class LeaderScoreboard {

  private Scoreboard board;
  private Objective objective;
  private String playerId;
  private String boardName;
  private FetchLeaderboard fetchLeaderboard;

  public LeaderScoreboard(String displayName, Player player, String boardName, FetchLeaderboard fetchLeaderboard) {
    this.playerId = player.getUniqueId().toString();
    this.boardName = boardName;
    this.fetchLeaderboard = fetchLeaderboard;
    this.board = Bukkit.getScoreboardManager().getNewScoreboard();
    this.objective = board.registerNewObjective(boardName, "dummy", displayName);
    this.objective.setDisplaySlot(DisplaySlot.SIDEBAR);
    this.objective.setRenderType(RenderType.INTEGER);
  }

  public Runnable init() {
    try {
      var rank = this.fetchLeaderboard.rank(boardName, playerId);
      return new Runnable() {
        @Override
        public void run() {
          var divider = board.registerNewTeam("Divider");
          divider.addEntry(ChatColor.DARK_GRAY + "---------------");

          var scoreTeam = board.registerNewTeam("Score");
          scoreTeam.addEntry("Score");
          var score = rank.getScore();
          if (score.length > 0) {
            objective.getScore("Score").setScore(score[0]);
          } else {
            objective.getScore("Score").setScore(0);
          }

          var ranks = rank.getRanks();
          for (int i = 0; i < ranks.size(); i++) {
            var r = ranks.get(i);
            var periodName = r.getPeriod();
            var team = board.registerNewTeam(periodName);
            team.addEntry(periodName);
            objective.getScore(periodName).setScore(r.getRank());
          }
        }
      };
    } catch (IOException e) {
      e.printStackTrace();
    }
    return null;
  }

  public void assign(Player player) {
    player.setScoreboard(board);
  }

  public void clear(Player player) {
    player.setScoreboard(Bukkit.getScoreboardManager().getNewScoreboard());
  }

  public void updateScoreOnly(int score) {
    objective.getScore("Score").setScore(score);
  }

  public void updateFromRank(Rank rank) {
    var score = rank.getScore();
    if (score.length > 0) {
      objective.getScore("Score").setScore(score[0]);
    } else {
      objective.getScore("Score").setScore(0);
    }
    var ranks = rank.getRanks();
    for (int i = 0; i < ranks.size(); i++) {
      var r = ranks.get(i);
      var periodName = r.getPeriod();
      objective.getScore(periodName).setScore(r.getRank());
    }
  }

  public Runnable update() {
    try {
      var rank = this.fetchLeaderboard.rank(boardName, playerId);
      return new Runnable() {
        @Override
        public void run() {
          updateFromRank(rank);
        }
      };
    } catch (IOException e) {
      e.printStackTrace();
    }
    return null;
  }

}
