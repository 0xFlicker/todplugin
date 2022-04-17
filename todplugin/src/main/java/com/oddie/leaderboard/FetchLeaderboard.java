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
import java.util.Set;

import com.oddie.config.Config;

import org.json.JSONArray;
import org.json.JSONObject;

public class FetchLeaderboard {

  private Config config;

  public FetchLeaderboard(Config config) {
    this.config = config;
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

  public Score fetchScore(String boardName, String playerId) throws IOException {
    var leaderboardUrl = appendPath(config.getLeaderboardReadUrl(), "/score/" + boardName);
    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("POST");
      con.setRequestProperty("Content-Type", "application/json");
      con.setRequestProperty("Accept", "application/json");
      con.setDoOutput(true);
      con.setDoInput(true);
      con.setUseCaches(false);
      JSONObject requestBody = new JSONObject();
      requestBody.put("playerId", playerId);
      var jsonInputString = requestBody.toString();
      var os = con.getOutputStream();
      byte[] input = jsonInputString.getBytes("utf-8");
      os.write(input, 0, input.length);
      os.flush();
      os.close();
      int status = con.getResponseCode();
      BufferedReader in = new BufferedReader(
          new InputStreamReader(con.getInputStream()));
      String inputLine;
      StringBuffer content = new StringBuffer();
      while ((inputLine = in.readLine()) != null) {
        content.append(inputLine);
      }
      in.close();
      var score = new Score();
      if (status == 200) {
        JSONObject json = new JSONObject(content.toString());
        score.setPlayerId(playerId);
        if (json.has("Score")) {
          JSONArray scoresJson = json.getJSONArray("Score");
          // For simplicity sake, we only support a single score
          score.setScore(scoresJson.getInt(0));
        } else {
          score.setScore(0);
        }
      }
      return score;
    } finally {
      con.disconnect();
    }
  }

  public boolean submitScore(ScoreMessage message) throws IOException {
    var leaderboardUrl = appendPath(config.getLeaderboardWriteUrl(), "/ingest");

    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("POST");
      con.setRequestProperty("Content-Type", "application/json");
      con.setRequestProperty("Accept", "application/json");
      con.setRequestProperty("x-api-key", config.getLeaderboardApiKey());
      con.setDoOutput(true);

      var os = con.getOutputStream();
      byte[] input = message.toString().getBytes("utf-8");
      os.write(input, 0, input.length);
      os.flush();
      os.close();

      var statusCode = con.getResponseCode();
      return statusCode == HttpURLConnection.HTTP_OK;
    } finally {
      con.disconnect();
    }
  }

  public List<Rank> ranks(String boardName, Set<String> playerIds) throws IOException {
    var leaderboardUrl = appendPath(config.getLeaderboardReadUrl(), "/ranks/" + boardName);
    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("POST");
      con.setRequestProperty("Content-Type", "application/json");
      con.setRequestProperty("Accept", "application/json");
      con.setDoOutput(true);
      con.setDoInput(true);
      con.setUseCaches(false);

      JSONArray requestBody = new JSONArray();
      for (var playerId : playerIds) {
        JSONObject playerRequest = new JSONObject();
        playerRequest.put("playerId", playerId);
        requestBody.put(playerRequest);
      }

      var jsonInputString = requestBody.toString();
      var os = con.getOutputStream();
      byte[] input = jsonInputString.getBytes("utf-8");
      os.write(input, 0, input.length);
      os.flush();
      os.close();
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
        JSONArray json = new JSONArray(content.toString());
        List<Rank> ranks = new ArrayList<Rank>(json.length());
        for (int i = 0; i < json.length(); i++) {
          JSONObject rankJson = json.getJSONObject(i);
          ranks.add(Rank.fromJSON(rankJson));
        }
        return ranks;
      }
      return new ArrayList<Rank>();
    } finally {
      con.disconnect();
    }
  }

  public Rank rank(String boardName, String playerId) throws IOException {
    var leaderboardUrl = appendPath(config.getLeaderboardReadUrl(), "/rank/" + boardName);
    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("POST");
      con.setRequestProperty("Content-Type", "application/json");
      con.setRequestProperty("Accept", "application/json");
      con.setDoOutput(true);
      con.setDoInput(true);
      con.setUseCaches(false);
      JSONObject requestBody = new JSONObject();
      requestBody.put("playerId", playerId);
      var jsonInputString = requestBody.toString();
      var os = con.getOutputStream();
      byte[] input = jsonInputString.getBytes("utf-8");
      os.write(input, 0, input.length);
      os.flush();
      os.close();
      int status = con.getResponseCode();
      BufferedReader in = new BufferedReader(
          new InputStreamReader(con.getInputStream()));
      String inputLine;
      StringBuffer content = new StringBuffer();
      while ((inputLine = in.readLine()) != null) {
        content.append(inputLine);
      }
      in.close();
      Rank rank;
      if (status == 200) {
        JSONObject json = new JSONObject(content.toString());
        rank = Rank.fromJSON(json);
      } else {
        rank = Rank.empty();
      }
      return rank;
    } finally {
      con.disconnect();
    }
  }

  public void fetch(Leaderboard leaderboard) throws IOException {
    var leaderboardUrl = appendPath(config.getLeaderboardReadUrl(), "/score/" + leaderboard.getBoardName());
    HttpURLConnection con = (HttpURLConnection) leaderboardUrl.openConnection();
    try {
      con.setRequestMethod("GET");
      int status = con.getResponseCode();

      if (status == 200) {
        BufferedReader in = new BufferedReader(
            new InputStreamReader(con.getInputStream()));
        String inputLine;
        StringBuffer content = new StringBuffer();
        while ((inputLine = in.readLine()) != null) {
          content.append(inputLine);
        }
        in.close();

        JSONObject json = new JSONObject(content.toString());
        if (json.has("scores")) {
          JSONArray scoresJson = json.getJSONArray("scores");
          for (int i = 0; i < scoresJson.length(); i++) {
            JSONObject scoreJson = scoresJson.getJSONObject(i);
            var score = Score.fromJSON(scoreJson);
            leaderboard.updateScore(score);
          }
        }
      }
    } finally {
      con.disconnect();
    }
  }
}
