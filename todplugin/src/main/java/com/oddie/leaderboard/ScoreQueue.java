package com.oddie.leaderboard;

import java.io.IOException;

import com.oddie.config.Config;
import com.oddie.queue.RunnableQueue;

import org.bukkit.Bukkit;

public class ScoreQueue {
  private RunnableQueue queue;
  private FetchLeaderboard fetchLeaderboard;

  public ScoreQueue(Config config) {
    this.queue = new RunnableQueue();
    this.fetchLeaderboard = new FetchLeaderboard(config);
  }

  public void add(ScoreMessage message) {
    queue.add(() -> {
      try {
        var result = fetchLeaderboard.submitScore(message);
        if (!result) {
          Bukkit.getLogger().warning("Failed to ingest score");
        }
      } catch (IOException e) {
        e.printStackTrace();
      }
    });
  }

  public void start() {
    queue.start();
  }

  public void stop() {
    queue.stop();
  }
}
