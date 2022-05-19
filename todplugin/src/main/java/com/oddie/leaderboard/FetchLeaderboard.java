package com.oddie.leaderboard;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import com.oddie.config.Config;

import org.json.JSONArray;
import org.json.JSONObject;

import software.amazon.awssdk.services.sns.SnsClient;

public class FetchLeaderboard {

  private Config config;
  private ScorePublisher publisher;

  public FetchLeaderboard(Config config) {
    this.config = config;
    this.publisher = new ScorePublisher(SnsClient.create(), config.getTopicArn());
  }

  private URL appendPath(URL url, String path) {
    try {
      return url
          .toURI()
          .resolve(url.getPath() + path)
          .normalize()
          .toURL();
    } catch (URISyntaxException | MalformedURLException e) {
      e.printStackTrace();
      throw new Error(e);
    }
  }

  public List<Rank> fetchScore(String boardName, List<String> playerIds) throws IOException {
    var playerIdsQueryComponent = String.join(",", playerIds);
    var leaderboardUrl = appendPath(config.getLeaderboardUrl(),
        "/" + boardName + "/players?" + "playerId=" + playerIdsQueryComponent);

    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("GET");
      con.setRequestProperty("Accept", "application/json");
      con.setRequestProperty("x-api-key", config.getLeaderboardApiKey());
      con.setDoInput(true);
      con.setUseCaches(false);

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
        List<Rank> ranks = new ArrayList<>();
        JSONArray jsonArray = new JSONArray(content.toString());
        for (int i = 0; i < jsonArray.length(); i++) {
          ranks.add(Rank.fromJSON(jsonArray.getJSONObject(i)));
        }
        return ranks;
      }
      return null;
    } finally {
      con.disconnect();
    }
  }

  public Board fetchBoard(String id) throws IOException {

    var leaderboardUrl = appendPath(config.getLeaderboardUrl(),
        "/" + id);

    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("GET");
      con.setRequestProperty("Accept", "application/json");
      con.setRequestProperty("x-api-key", config.getLeaderboardApiKey());
      con.setDoInput(true);
      con.setUseCaches(false);

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
        return Board.fromJSON(new JSONObject(content.toString()));
      }
      return null;
    } finally {
      con.disconnect();
    }
  }

  public void submitScore(List<ScoreMessage> message) {
    this.publisher.publish(message);
  }
}
