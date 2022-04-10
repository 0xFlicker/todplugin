package com.oddie.leaderboard;

import java.util.Date;

import org.bukkit.Bukkit;
import org.json.JSONObject;

public class Score {
  private String playerId;
  private String playerName;
  private int[] score;
  private Date date;

  public Score() {
  }

  public Score(String playerId, String playerName, int[] score, Date date) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.score = score;
    this.date = date;
  }

  public Score(String playerId, String playerName, int score, Date date) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.score = new int[] { score };
    this.date = date;
  }

  public String getPlayerId() {
    return playerId;
  }

  public void setPlayerId(String playerId) {
    this.playerId = playerId;
  }

  public String getPlayerName() {
    return playerName;
  }

  public void setPlayerName(String playerName) {
    this.playerName = playerName;
  }

  public int[] getScore() {
    return score;
  }

  public void setScore(int[] score) {
    this.score = score;
  }

  public void setScore(int score) {
    this.score = new int[] { score };
  }

  public Date getDate() {
    return date;
  }

  public void setDate(Date date) {
    this.date = date;
  }

  public JSONObject toJson() {
    JSONObject json = new JSONObject();
    json.put("playerId", this.playerId);
    json.put("playerName", this.playerName);
    json.put("score", this.score);
    json.put("date", this.date.getTime());
    return json;
  }

  @Override
  public String toString() {
    return this.toJson().toString();
  }

  public boolean lessThan(Score other) {
    if (this.score.length != other.score.length) {
      Bukkit.getLogger().warning("Score length mismatch");
      return false;
    }
    for (int i = 0; i < this.score.length; i++) {
      if (this.score[i] < other.score[i]) {
        return true;
      } else if (this.score[i] > other.score[i]) {
        return false;
      }
    }
    return false;
  }
}
