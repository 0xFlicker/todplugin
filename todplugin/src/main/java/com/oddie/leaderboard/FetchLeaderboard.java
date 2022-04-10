package com.oddie.leaderboard;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import org.bukkit.Bukkit;
import org.json.JSONObject;

public class FetchLeaderboard {
  private URL leaderboardUrl;
  private String boardName;

  public FetchLeaderboard(URL leaderboardUrl, String boardName) {
    this.leaderboardUrl = leaderboardUrl;
    this.boardName = boardName;
  }

  private void toScoreMessage(JSONObject json, Leaderboard leaderboard) {

  }

  public void fetch(Leaderboard leaderboard) {
    try {
      HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
      con.setRequestMethod("GET");
      int status = con.getResponseCode();
      BufferedReader in = new BufferedReader(
          new InputStreamReader(con.getInputStream()));
      String inputLine;
      StringBuffer content = new StringBuffer();
      while ((inputLine = in.readLine()) != null) {
        content.append(inputLine);
      }
      in.close();
      con.disconnect();
    } catch (IOException e) {
      // TODO Auto-generated catch block
      e.printStackTrace();
      Bukkit.getLogger().severe("Failed to fetch leaderboard from " + leaderboardUrl);
    }

  }
}
