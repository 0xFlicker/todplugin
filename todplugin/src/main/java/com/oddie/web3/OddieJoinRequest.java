package com.oddie.web3;

import org.json.JSONObject;

public class OddieJoinRequest {
  private int nonce;
  private String address;
  private String signature;
  private String minecraftPlayerId;

  public OddieJoinRequest(int nonce, String address, String signature, String minecraftPlayerId) {
    this.nonce = nonce;
    this.address = address;
    this.signature = signature;
    this.minecraftPlayerId = minecraftPlayerId;
  }

  public static OddieJoinRequest fromJSON(JSONObject json)  {
    return new OddieJoinRequest(
      json.getInt("nonce"),
      json.getString("address"),
      json.getString("signature"),
      json.getString("minecraftPlayerId")
    );
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

  public String getMinecraftPlayerId() {
    return minecraftPlayerId;
  }
}
