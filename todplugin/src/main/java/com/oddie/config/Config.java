package com.oddie.config;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.oddie.Oddie;
import com.oddie.web3.OddieJoinRequest;

import org.bukkit.Bukkit;
import org.bukkit.configuration.file.FileConfiguration;

public class Config {
  private String rpc;
  private String secret;
  private String contractAddress;
  private String tokenGroup;
  private String tlsKeyStore;
  private String tlsKeyStorePassword;
  private boolean tls;
  private int port;
  private List<Wallet> wallets;
  private Oddie oddie;

  public void registerConfig(Oddie oddie) {
    this.oddie = oddie;
    FileConfiguration config = oddie.getConfig();
    config.options().copyDefaults(true);
    oddie.saveConfig();

    this.rpc = config.getString("rpc");
    if (this.rpc.isEmpty()) {
      Bukkit.getLogger().warning("rpc is not set in config.yml. Please set an HTTPS endpoing for the rpc.");
      System.exit(1);
    }

    this.tokenGroup = config.getString("tokenGroup");
    if (this.tokenGroup.isEmpty()) {
      Bukkit.getLogger().warning("token-group is not set in config.yml. Please set a group to add tokens to.");
      System.exit(1);
    }

    this.secret = config.getString("secret");
    if (this.secret.isEmpty()) {
      Bukkit.getLogger()
          .warning("secret is not set in config.yml. Please set a secret string to validate the webhook.");
      System.exit(1);
    }

    this.contractAddress = config.getString("contractAddress");
    if (this.contractAddress.isEmpty()) {
      Bukkit.getLogger().warning("contractAddress is not set in config.yml. Please set a contract address.");
      System.exit(1);
    }

    this.tls = config.getBoolean("tls");
    this.tlsKeyStore = config.getString("tlsKeyStorePath");
    this.tlsKeyStorePassword = config.getString("tlsKeyStorePassword");

    this.port = config.getInt("port", 8080);
    @SuppressWarnings("unchecked")
    List<Wallet> walletObjList = (List<Wallet>) config.getList("wallets", new ArrayList<Wallet>());
    this.wallets = walletObjList;
  }

  public String getRpc() {
    return rpc;
  }

  public String getTokenGroup() {
    return tokenGroup;
  }

  public String getSecret() {
    return secret;
  }

  public String getContractAddress() {
    return contractAddress;
  }

  public int getPort() {
    return port;
  }

  public List<Wallet> getWallets() {
    return wallets;
  }

  public boolean isTls() {
    return tls;
  }

  public String getTlsKeyStore() {
    return tlsKeyStore;
  }

  public String getTlsKeyStorePassword() {
    return tlsKeyStorePassword;
  }

  public void createOrUpdateWallet(OddieJoinRequest oddieJoinRequest) {
    UUID uuid = UUID.fromString(oddieJoinRequest.getMinecraftPlayerId());
    for (Wallet wallet : this.wallets) {
      if (wallet.getAddress().equals(oddieJoinRequest.getAddress()) && wallet.getMinecraftPlayerId().equals(uuid)) {
        // nothing to do
        return;
      }
    }
    boolean wasMinecraftPlayerIdUpdated = false;
    for (Wallet wallet : this.wallets) {
      if (wallet.getAddress().equals(oddieJoinRequest.getAddress())) {
        // Update the UUID
        wallet.setMinecraftPlayerId(uuid);
        wasMinecraftPlayerIdUpdated = true;
        break;
      }
    }

    boolean wasAddressedUpdated = false;
    for (Wallet wallet : this.wallets) {
      if (wallet.getMinecraftPlayerId().equals(uuid)) {
        if (wasMinecraftPlayerIdUpdated) {
          // Remove wallet as duplicate
          this.wallets.remove(wallet);
        } else {
          // Update the UUID
          wallet.seAddress(oddieJoinRequest.getAddress());
          wasAddressedUpdated = true;
        }
      }
    }

    if (!wasAddressedUpdated && !wasMinecraftPlayerIdUpdated) {
      // Add new wallet
      this.wallets.add(new Wallet(oddieJoinRequest.getAddress(), uuid));
    }
    this.oddie.getConfig().set("wallets", this.wallets);
    oddie.saveConfig();
  }

  public Wallet findPlayer(UUID minecraftPlayerId) {
    for (Wallet wallet : this.wallets) {
      if (wallet.getMinecraftPlayerId().equals(minecraftPlayerId)) {
        return wallet;
      }
    }
    return null;
  }
}
