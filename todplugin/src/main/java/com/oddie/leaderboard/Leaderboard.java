package com.oddie.leaderboard;

import java.util.Date;
import java.util.List;
import java.util.Map;

public class Leaderboard {
  private String boardName;
  private Map<String, Score> scoreMap;
  private List<Score> board;

  public Leaderboard(String boardName, Map<String, Score> scoreMap, List<Score> board) {
    this.boardName = boardName;
    this.scoreMap = scoreMap;
    this.board = board;
  }

  public String getBoardName() {
    return boardName;
  }

  public Score getScore(String playerId) {
    return scoreMap.get(playerId);
  }

  public List<Score> getBoard() {
    return board;
  }

  public void updateScore(Score score) {
    scoreMap.put(score.getPlayerId(), score);
    // upsert and sort board
    board.removeIf(s -> s.getPlayerId().equals(score.getPlayerId()));
    for (int i = 0; i < board.size(); i++) {
      Score boardScore = board.get(i);
      if (boardScore.lessThan(score)) {
        board.add(i, score);
        break;
      }
    }
  }
}
