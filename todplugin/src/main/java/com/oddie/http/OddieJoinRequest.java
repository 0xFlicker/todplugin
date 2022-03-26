package com.oddie.http;

import java.util.UUID;

import org.json.JSONObject;

public class OddieJoinRequest {
  private int nonce;
  private String address;
  private String signature;
  private UUID minecraftPlayerId;

  public OddieJoinRequest(int nonce, String address, String signature, UUID minecraftPlayerId) {
    this.nonce = nonce;
    this.address = address;
    this.signature = signature;
    this.minecraftPlayerId = minecraftPlayerId;
  }

  public static OddieJoinRequest fromJSON(JSONObject json) {
    return new OddieJoinRequest(
        json.getInt("nonce"),
        json.getString("address"),
        json.getString("signature"),
        UUID.fromString(json.getString("minecraftPlayerId")));
  }

  public int getNonce() {
    return nonce;
  }

  public String getAddress() {
    return address;
  }

  public String getSignature() {
    return signature;
  }

  public UUID getPlayerUuid() {
    return minecraftPlayerId;
  }
}
