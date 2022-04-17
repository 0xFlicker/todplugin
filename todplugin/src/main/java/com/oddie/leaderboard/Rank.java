package com.oddie.leaderboard;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONObject;

public class Rank {
  private int[] score;
  private List<RankPeriod> ranks;

  public Rank(int[] score, List<RankPeriod> ranks) {
    this.score = score;
    this.ranks = ranks;
  }

  public static class RankPeriod {
    private String period;
    private int rank;

    public RankPeriod(String period, int rank) {
      this.period = period;
      this.rank = rank;
    }

    public String getPeriod() {
      return period;
    }

    public int getRank() {
      return rank;
    }
  }

  public int[] getScore() {
    return score;
  }

  public Integer getRank(String periodName) {
    var rank = this.ranks.stream().filter(r -> r.getPeriod().equals(periodName)).findFirst().get();
    if (rank == null) {
      return null;
    }
    return rank.getRank();
  }

  public List<RankPeriod> getRanks() {
    return ranks;
  }

  public static Rank empty() {
    return new Rank(new int[0], new ArrayList<Rank.RankPeriod>());
  }

  public static Rank fromJSON(JSONObject json) {
    var scores = json.getJSONArray("score");
    int[] scoresInt = new int[scores.length()];
    for (int i = 0; i < scores.length(); i++) {
      scoresInt[i] = scores.getInt(i);
    }
    var ranks = json.getJSONArray("ranks");
    List<RankPeriod> rankPeriods = new ArrayList<RankPeriod>();
    for (int i = 0; i < ranks.length(); i++) {
      var rank = ranks.getJSONObject(i);
      rankPeriods.add(new RankPeriod(rank.getString("period"), rank.getInt("rank")));
    }
    return new Rank(scoresInt, rankPeriods);
  }

}
