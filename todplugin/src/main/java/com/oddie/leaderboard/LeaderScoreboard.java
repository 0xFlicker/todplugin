package com.oddie.leaderboard;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

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
      List<String> players = new ArrayList<String>(1);
      players.add(playerId);
      var ranks = this.fetchLeaderboard.fetchScore(boardName, players);
      if (ranks.size() == 0) {
        return null;
      }
      var rank = ranks.get(0);
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

          var team = board.registerNewTeam("Rank");
          team.addEntry("Rank");
          objective.getScore("Rank").setScore(rank.getRank());
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
    objective.getScore("Rank").setScore(rank.getRank());
  }

  public Runnable update() {
    try {
      List<String> players = new ArrayList<String>(1);
      players.add(playerId);
      var ranks = this.fetchLeaderboard.fetchScore(boardName, players);
      return new Runnable() {
        @Override
        public void run() {
          if (ranks.size() > 0) {
            updateFromRank(ranks.get(0));
          }
        }
      };
    } catch (IOException e) {
      e.printStackTrace();
    }
    return null;
  }

}
