package com.oddie.leaderboard;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import com.oddie.config.Config;
import com.oddie.queue.BatchQueue;

public class ScoreQueue {
  private BatchQueue<ScoreMessage, Void> queue;
  private FetchLeaderboard fetchLeaderboard;

  public ScoreQueue(Config config) {
    this.fetchLeaderboard = new FetchLeaderboard(config);
    this.queue = new BatchQueue<ScoreMessage, Void>(
        scoreMessages -> {
          Map<String, Map<String, List<Integer>>> experienceToDeltaScoresMap = new HashMap<>();
          for (var s : scoreMessages) {
            // Reduce the deltas to a single delta if playerId matches
            // I obviously have much to learn about concise Java
            var deltaScoresMap = experienceToDeltaScoresMap.get(s.getBoardName());
            if (deltaScoresMap == null) {
              deltaScoresMap = new HashMap<>();
              experienceToDeltaScoresMap.put(s.getBoardName(), deltaScoresMap);
            }
            if (s.getScoreDeltas().size() > 0) {
              for (var d : s.getScoreDeltas()) {
                if (deltaScoresMap.containsKey(d.getPlayerId())) {
                  var deltaScores = d.getScore();
                  var originalScores = deltaScoresMap.get(d.getPlayerId());
                  for (int i = 0; i < deltaScores.length; i++) {
                    var score = deltaScores[i];
                    originalScores.set(i, originalScores.get(i) + score);
                  }
                } else {
                  var scores = d.getScore();
                  var scoreList = new ArrayList<Integer>(scores.length);
                  for (var score : scores) {
                    scoreList.add(score);
                  }
                  deltaScoresMap.put(d.getPlayerId(), scoreList);
                }
              }
            }
          }
          List<ScoreMessage> scoreMessagesToSend = new ArrayList<>();
          for (var experienceItem : experienceToDeltaScoresMap.entrySet()) {
            var experience = experienceItem.getKey();
            var deltaScoresMap = experienceItem.getValue();
            for (var item : deltaScoresMap.entrySet()) {
              var playerId = item.getKey();
              var deltaScores = item.getValue();
              var scoreMessage = new ScoreMessage(experience);
              for (int i = 0; i < deltaScores.size(); i++) {
                scoreMessage.addScoreDelta(new Score(
                    playerId,
                    "",
                    deltaScores.get(i),
                    new Date()));
              }
              scoreMessagesToSend.add(scoreMessage);
            }
          }
          fetchLeaderboard
              .submitScore(
                  scoreMessagesToSend);
          return null;
        },
        5000, 200, TimeUnit.MILLISECONDS);
  }

  public void add(ScoreMessage message) {
    queue.add(message);
  }

  public void start() {
    queue.start();
  }

  public void stop() {
    queue.stop();
  }
}
