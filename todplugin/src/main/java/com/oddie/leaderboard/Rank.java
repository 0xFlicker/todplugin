package com.oddie.leaderboard;

import org.json.JSONObject;

public class Rank {
  private String playerId;
  private int[] score;
  private int rank;

  public Rank(String playerId, int[] score, int rank) {
    this.playerId = playerId;
    this.score = score;
    this.rank = rank;
  }

  public String getPlayerId() {
    return playerId;
  }

  public int[] getScore() {
    return score;
  }

  public int getRank() {
    return this.rank;
  }

  public static Rank fromJSON(JSONObject json) {
    var playerId = json.getString("playerId");
    var scores = json.getJSONArray("score");
    int[] scoresInt = new int[scores.length()];
    for (int i = 0; i < scores.length(); i++) {
      scoresInt[i] = scores.getInt(i);
    }
    var rank = json.getInt("rank");

    return new Rank(playerId, scoresInt, rank);
  }

}
