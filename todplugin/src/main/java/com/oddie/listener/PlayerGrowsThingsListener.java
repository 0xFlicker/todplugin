package com.oddie.listener;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.util.HashMap;
import java.util.Map;

import com.oddie.Oddie;
import com.oddie.config.Config;
import com.oddie.leaderboard.ScoreMessage;
import com.oddie.leaderboard.ScorePublisher;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.block.data.Ageable;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.metadata.FixedMetadataValue;
import org.bukkit.plugin.Plugin;
import org.json.JSONArray;
import org.json.JSONObject;

import net.kyori.adventure.text.Component;

public class PlayerGrowsThingsListener implements Listener {
  private Oddie plugin;
  private Config config;
  private ScorePublisher publisher;
  private Map<String, Integer> scores;

  public PlayerGrowsThingsListener(Oddie plugin, Config config, ScorePublisher publisher) {
    this.plugin = plugin;
    this.config = config;
    this.publisher = publisher;
    this.scores = new HashMap<String, Integer>();
  }

  @EventHandler
  public void onAsyncPlayerPreLogin(AsyncPlayerPreLoginEvent event) {
    try {
      var leaderboardUrl = config.getLeaderboardUrl();
      leaderboardUrl = leaderboardUrl
          .toURI()
          .resolve(leaderboardUrl.getPath() + "/score/potato")
          .normalize()
          .toURL();
      HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
      con.setRequestMethod("POST");
      con.setRequestProperty("Content-Type", "application/json; utf-8");
      con.setRequestProperty("Accept", "application/json");
      con.setDoOutput(true);
      JSONObject requestBody = new JSONObject();
      requestBody.put("playerId", event.getUniqueId().toString());
      var jsonInputString = requestBody.toString();
      try (var os = con.getOutputStream()) {
        byte[] input = jsonInputString.getBytes("utf-8");
        os.write(input, 0, input.length);
      } catch (IOException e) {
        e.printStackTrace();
      }
      int status = con.getResponseCode();
      BufferedReader in = new BufferedReader(
          new InputStreamReader(con.getInputStream()));
      String inputLine;
      StringBuffer content = new StringBuffer();
      while ((inputLine = in.readLine()) != null) {
        content.append(inputLine);
      }
      in.close();
      if (status == 200) {
        JSONObject json = new JSONObject(content.toString());
        if (json.has("scores")) {
          JSONArray scoresJson = json.getJSONArray("scores");
          // For simplicity sake, we only support a single score
          int score = scoresJson.getInt(0);
          scores.put(event.getPlayerProfile().getId().toString(), score);
        } else {
          scores.put(event.getPlayerProfile().getId().toString(), 0);
        }
      }
      con.disconnect();

    } catch (Exception e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
      Bukkit.getLogger().severe("Failed to fetch leaderboard");
    }
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
            player.sendMessage(Component.text("You broke your own potato!"));
            var score = scores.get(playerId);
            if (score == null) {
              score = 0;
            }
            score++;
            scores.put(playerId, score);

            publisher.publish(ScoreMessage.singleScore("potato", playerId, score));
          }
        }
      }
    }
  }
}
