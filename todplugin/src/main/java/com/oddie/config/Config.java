package com.oddie.config;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.oddie.Oddie;
import com.oddie.http.OddieJoinRequest;

import org.bukkit.Bukkit;
import org.bukkit.configuration.file.FileConfiguration;

public class Config {
  private String rpc;
  private String polygonRpc;
  private String secret;
  private String contractAddress;
  private String nftWorldsPlayerContractAddress;
  private String tokenGroup;
  private String tlsKeyStore;
  private String tlsKeyStorePassword;
  private String connectWebpage;
  private String scoreTopicArn;
  private URL leaderboardUrl;
  private String leaderboardApiKey;
  private String experienceName;
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
      Bukkit.getLogger().warning("rpc is not set in config.yml. Please set an HTTPS endpoint for the rpc.");
      System.exit(1);
    }

    this.polygonRpc = config.getString("polygonRpc");
    if (this.rpc.isEmpty()) {
      Bukkit.getLogger().warning("polygonRpc is not set in config.yml. Please set an HTTPS endpoint for the rpc.");
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

    this.nftWorldsPlayerContractAddress = config.getString("nftWorldsPlayerContractAddress");
    if (this.contractAddress.isEmpty()) {
      Bukkit.getLogger()
          .warning("nftWorldsPlayerContractAddress is not set in config.yml. Please set a contract address.");
      System.exit(1);
    }

    this.scoreTopicArn = config.getString("scoreTopicArn");
    if (this.scoreTopicArn.isEmpty()) {
      Bukkit.getLogger()
          .warning("scoreTopicArn is not set in config.yml. Please set a topic arn for the potato score.");
    }

    this.experienceName = config.getString("experienceName");
    if (this.experienceName.isEmpty()) {
      Bukkit.getLogger()
          .warning("experienceName is not set in config.yml. Please set a name for the experience.");
    }

    try {
      this.leaderboardUrl = new URL(config.getString("leaderboardUrl"));
    } catch (MalformedURLException e) {
      Bukkit.getLogger().warning("leaderboardUrl is an invalid URL in config.yml. Please set a valid URL.");
      System.exit(1);
    }

    this.leaderboardApiKey = config.getString("leaderboardApiKey", "");

    this.connectWebpage = config.getString("connectWebpage");
    if (this.connectWebpage.isEmpty()) {
      Bukkit.getLogger().warning("connectWebpage is not set in config.yml. Please set a connect webpage.");
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

  public String getPolygonRpc() {
    return polygonRpc;
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

  public String getNftWorldsPlayerContractAddress() {
    return nftWorldsPlayerContractAddress;
  }

  public String getConnectWebpage() {
    return connectWebpage;
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
    UUID uuid = oddieJoinRequest.getPlayerUuid();
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

  public String getTopicArn() {
    return scoreTopicArn;
  }

  public String getExperienceName() {
    return experienceName;
  }

  public URL getLeaderboardUrl() {
    return leaderboardUrl;
  }

  public String getLeaderboardApiKey() {
    return leaderboardApiKey;
  }

}
