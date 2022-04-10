package com.oddie.leaderboard;

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

  public void publish(ScoreMessage message) {
    pubTopic(message.toString());
  }

  private void pubTopic(String message) {
    try {
      // Hash message

      PublishRequest request = PublishRequest.builder()
          .message(message)
          .topicArn(topicArn)
          .messageGroupId("potato")
          .build();

      PublishResponse result = snsClient.publish(request);
      System.out.println(result.messageId() + " Message sent. Status is " + result.sdkHttpResponse().statusCode());

    } catch (SnsException e) {
      System.err.println(e.awsErrorDetails().errorMessage());
      System.exit(1);
    }
  }
}
