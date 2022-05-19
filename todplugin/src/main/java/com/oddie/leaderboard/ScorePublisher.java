package com.oddie.leaderboard;

import java.util.List;

import org.bukkit.Bukkit;

import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;
import software.amazon.awssdk.services.sns.model.PublishResponse;
import software.amazon.awssdk.services.sns.model.SnsException;

public class ScorePublisher {

  private SnsClient snsClient;
  private String topicArn;

  public ScorePublisher(SnsClient snsClient, String topicArn) {
    this.snsClient = snsClient;
    this.topicArn = topicArn;
  }

  public void publish(List<ScoreMessage> message) {
    for (ScoreMessage scoreMessage : message) {
      pubTopic(scoreMessage.getBoardName(), scoreMessage.toString());
    }
  }

  private void pubTopic(String messageGroupId, String message) {
    try {
      PublishRequest request = PublishRequest.builder()
          .message(message)
          .topicArn(topicArn)
          .messageGroupId(
              messageGroupId)
          .build();

      PublishResponse result = snsClient.publish(request);
      Bukkit.getLogger().info("MessageId - " + result.messageId());
    } catch (SnsException e) {
      Bukkit.getLogger().severe("Failed to fetch leaderboard: " + e.awsErrorDetails().errorMessage());
    }
  }
}
