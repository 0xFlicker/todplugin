package com.oddie.leaderboard;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.json.JSONObject;

public class ScoreMessage {
  private String boardName;
  private List<Score> scores;

  public ScoreMessage(String boardName) {
    this.boardName = boardName;
    this.scores = new ArrayList<Score>();
  }

  public static ScoreMessage singleScore(String boardName, String playerId, int score) {
    ScoreMessage message = new ScoreMessage(boardName);
    message.addScore(new Score(
        playerId,
        "",
        score,
        new Date()));
    return message;
  }

  public String getBoardName() {
    return boardName;
  }

  public void setBoardName(String boardName) {
    this.boardName = boardName;
  }

  public List<Score> getScores() {
    return scores;
  }

  public void setScores(List<Score> scores) {
    this.scores = scores;
  }

  public void addScore(Score score) {
    this.scores.add(score);
  }

  public JSONObject toJson() {
    JSONObject json = new JSONObject();
    json.put("boardName", this.boardName);
    json.put("scores", this.scores.stream().map(score -> score.toJson()).toList());
    return json;
  }

  @Override
  public String toString() {
    return this.toJson().toString();
  }
}
