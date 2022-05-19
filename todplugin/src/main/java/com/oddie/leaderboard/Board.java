package com.oddie.leaderboard;

import org.json.JSONObject;

public class Board {
  private String id;
  private String displayName;
  private String description;

  public Board(String id, String displayName, String description) {
    this.id = id;
    this.displayName = displayName;
    this.description = description;
  }

  public String getId() {
    return id;
  }

  public String getDisplayName() {
    return displayName;
  }

  public String getDescription() {
    return description;
  }

  public static Board fromJSON(JSONObject json) {
    return new Board(json.getString("id"), json.getString("displayName"), json.getString("description"));
  }
}
