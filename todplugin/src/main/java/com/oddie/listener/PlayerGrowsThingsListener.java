package com.oddie.listener;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.oddie.Oddie;
import com.oddie.config.Config;
import com.oddie.event.P2eEvent;
import com.oddie.leaderboard.FetchLeaderboard;
import com.oddie.leaderboard.LeaderScoreboard;
import com.oddie.leaderboard.ScoreMessage;
import com.oddie.leaderboard.ScoreQueue;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.block.data.Ageable;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.metadata.FixedMetadataValue;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;

public class PlayerGrowsThingsListener implements Listener {
  private Oddie plugin;
  private ScoreQueue scoreQueue;
  private Map<String, Integer> scores;
  private FetchLeaderboard fetchLeaderboard;
  private Map<String, LeaderScoreboard> leaderScoreboardMap;
  private String currentBoard;
  private String currentBoardName;
  private String currentBoardDescription;

  public PlayerGrowsThingsListener(Oddie plugin, Config config) {
    this.plugin = plugin;
    this.scoreQueue = new ScoreQueue(config);
    this.scores = new HashMap<String, Integer>();
    this.scoreQueue.start();
    this.fetchLeaderboard = new FetchLeaderboard(config);
    this.leaderScoreboardMap = new HashMap<String, LeaderScoreboard>();
    this.currentBoard = config.getExperienceName();
    this.currentBoardName = config.getExperienceName();
    this.currentBoardDescription = null;
  }

  private String getPlayerLeaderboard(Player player) {
    var metadata = player.getMetadata("oddie_leaderboard");
    if (metadata.size() == 0) {
      return null;
    }
    for (var value : metadata) {
      if (value.getOwningPlugin().equals(plugin)) {
        return value.asString();
      }
    }
    return null;
  }

  public void start() {
    try {
      var board = fetchLeaderboard.fetchBoard(currentBoard);
      currentBoardName = board.getDisplayName();
      currentBoardDescription = board.getDescription();
    } catch (IOException e1) {
      e1.printStackTrace();
      Bukkit.getLogger().severe("Failed to fetch board");
    }
    Bukkit.getServer().getScheduler().runTaskTimerAsynchronously(plugin, () -> {
      try {
        var players = leaderScoreboardMap.keySet();
        if (players.size() > 0) {
          List<String> playerIds = new ArrayList<String>();
          // Check if any players are looking at the leaderboard
          for (var playerId : players) {
            var player = Bukkit.getPlayer(UUID.fromString(playerId));
            if (player == null) {
              continue;
            }
            if (getPlayerLeaderboard(player) != null) {
              playerIds.add(playerId);
              break;
            }
          }
          if (playerIds.size() > 0) {
            var ranks = fetchLeaderboard.fetchScore(this.currentBoard, playerIds);
            for (var rank : ranks) {
              var playerId = rank.getPlayerId();
              var lb = leaderScoreboardMap.get(playerId);
              if (lb != null) {
                Bukkit.getServer().getScheduler().runTask(plugin, () -> {
                  var player = Bukkit.getPlayer(UUID.fromString(playerId));
                  if (player != null && getPlayerLeaderboard(player) != null) {
                    lb.updateFromRank(rank);
                  }
                });
              }
            }
          }
        }
      } catch (IOException e) {
        e.printStackTrace();
        Bukkit.getLogger().severe("Failed to fetch leaderboard");
      }
    }, 100L, 500L);
  }

  public Runnable cleanupTask() {
    return () -> {
      this.scoreQueue.stop();
    };
  }

  @EventHandler
  public void onP2eEvent(P2eEvent event) {
    var player = event.getPlayer();
    var boardName = event.getBoardName();
    var leaderScoreBoard = leaderScoreboardMap.get(player.getUniqueId().toString());
    if (leaderScoreBoard != null) {
      if (boardName != null) {
        leaderScoreBoard.assign(player);
      } else {
        leaderScoreBoard.clear(player);
      }
    }

  }

  @EventHandler
  public void onAsyncPlayerPreLogin(AsyncPlayerPreLoginEvent event) {
    try {
      var playerId = event.getPlayerProfile().getId().toString();
      List<String> players = new ArrayList<String>(1);
      players.add(playerId);
      var score = fetchLeaderboard.fetchScore(this.currentBoard, players);
      if (score.size() > 0) {
        scores.put(playerId, Integer.valueOf(score.get(0).getScore()[0]));
      }

    } catch (IOException e) {
      e.printStackTrace();
      Bukkit.getLogger().severe("Failed to fetch leaderboard");
    }
  }

  @EventHandler
  public void onPlayerJoin(PlayerJoinEvent event) {
    var leaderScoreBoard = new LeaderScoreboard(this.currentBoardName, event.getPlayer(), this.currentBoard,
        fetchLeaderboard);
    leaderScoreboardMap.put(event.getPlayer().getUniqueId().toString(), leaderScoreBoard);
    var player = event.getPlayer();
    player.setMetadata("oddie_leaderboard", new FixedMetadataValue(this.plugin, currentBoard));
    Bukkit.getPluginManager().callEvent(new P2eEvent(player, currentBoard));
    player.sendMessage(Component.text("The current quest is ")
        .append(Component
            .text(currentBoardName)
            .decorate(TextDecoration.BOLD, TextDecoration.UNDERLINED)
            .color(TextColor.color(0xFF))));
    if (currentBoardDescription != null) {
      player.sendMessage(Component
          .text(currentBoardDescription)
          .color(TextColor.color(0xFFFF88)));
    }

    Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
      var task = leaderScoreBoard.init();
      if (task != null) {
        Bukkit.getScheduler().runTask(plugin, () -> {
          if (getPlayerLeaderboard(player) != null) {
            leaderScoreBoard.assign(player);
          }
          task.run();
        });
      }
    });
  }

  @EventHandler
  public void onBlockPlace(BlockPlaceEvent event) {
    var player = event.getPlayer();
    var block = event.getBlock();

    if (event.isCancelled()) {
      return;
    }

    // Is it a potato?
    if (block.getType().equals(Material.POTATOES)) {
      // set metadata on the crop
      block.setMetadata("planted_by", new FixedMetadataValue(plugin, player.getUniqueId().toString()));
    }
  }

  @EventHandler
  public void onBlockBreak(BlockBreakEvent event) {
    var player = event.getPlayer();
    var block = event.getBlock();

    if (event.isCancelled()) {
      return;
    }

    // Is it a potato?
    if (block.getType().equals(Material.POTATOES)) {
      // Is the crop fully grown (age >= 7)
      // Cast to Ageable
      var ageable = (Ageable) block.getBlockData();
      if (ageable != null) {
        if (ageable.getAge() >= ageable.getMaximumAge()) {
          // get metadata on the crop
          var metadata = block.getMetadata("planted_by");
          if (metadata.size() == 0) {
            return;
          }

          // get the player who planted the crop
          var plantedBy = metadata.get(0).asString();

          // check if the player who planted the crop is the same as the player who broke
          // the crop
          var playerId = player.getUniqueId().toString();
          if (plantedBy.equals(playerId)) {
            // remove metadata from the crop
            block.removeMetadata("planted_by", plugin);
            var score = scores.get(playerId);
            if (score == null) {
              score = 0;
            }
            score++;
            scores.put(playerId, score);
            this.scoreQueue.add(ScoreMessage.deltaScore(currentBoard, playerId, 1));
            var leaderboard = this.leaderScoreboardMap.get(playerId);
            if (leaderboard != null) {
              leaderboard.updateScoreOnly(score);
            }
          }
        }
      }
    }
  }
}
