package com.oddie.config;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.bukkit.configuration.serialization.ConfigurationSerializable;
import org.bukkit.configuration.serialization.SerializableAs;
import org.jetbrains.annotations.NotNull;

@SerializableAs("wallet")
public class Wallet implements ConfigurationSerializable {
  private String address;
  private UUID minecraftPlayerId;

  public Wallet(String address, UUID minecraftPlayerId) {
    this.address = address;
    this.minecraftPlayerId = minecraftPlayerId;
  }

  public Wallet(Map<String, Object> map) {
    this.address = (String) map.get("address");
    this.minecraftPlayerId = UUID.fromString((String) map.get("minecraftPlayerId"));
  }

  public String getAddress() {
    return address;
  }
  public void seAddress(String address) {
    this.address = address;
  }
  public UUID getMinecraftPlayerId() {
    return minecraftPlayerId;
  }
  public void setMinecraftPlayerId(UUID minecraftPlayerId) {
    this.minecraftPlayerId = minecraftPlayerId;
  }

  public static Wallet deserialize(Map<String, Object> map) {
    Wallet wallet = new Wallet(map);
    return wallet;
  }

  public @NotNull Map<String, Object> serialize() {
    Map<String, Object> map = new HashMap<>();
    map.put("address", getAddress());
    map.put("minecraftPlayerId", getMinecraftPlayerId().toString());
    return map;
  }
}
