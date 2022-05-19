package com.oddie;

import java.util.ArrayList;
import java.util.List;

import com.oddie.command.Connect;
import com.oddie.command.Leaderboard;
import com.oddie.config.Config;
import com.oddie.config.Wallet;
import com.oddie.http.Server;
import com.oddie.listener.PlayerGrowsThingsListener;
import com.oddie.listener.WalletLinkedListener;
import com.oddie.web3.EthereumRpc;
import com.oddie.web3.PolygonRpc;
import com.oddie.web3.WalletConnector;

import org.bukkit.configuration.serialization.ConfigurationSerialization;
import org.bukkit.plugin.java.JavaPlugin;

public class Oddie extends JavaPlugin {
  private Config config;
  private static Oddie instance;

  private PolygonRpc polygonRpc;
  private EthereumRpc ethereumRpc;
  private WalletConnector connector;
  private List<Runnable> cleanups;

  public WalletConnector getConnector() {
    return connector;
  }

  Server webServer;

  public void onEnable() {
    ConfigurationSerialization.registerClass(Wallet.class);
    instance = this;
    this.cleanups = new ArrayList<Runnable>();
    this.config = new Config();
    this.config.registerConfig(this);

    this.ethereumRpc = this.startEthereumRpc();
    this.cleanups.add(this.ethereumRpc.cleanupTask());
    this.polygonRpc = this.startPolygonRpc(this.ethereumRpc);
    this.cleanups.add(this.polygonRpc.cleanupTask());

    this.connector = new WalletConnector(this.ethereumRpc, this.polygonRpc, this.config);
    this.getCommand("wallet").setExecutor(new Connect(this.connector));
    this.getCommand("p2e").setExecutor(new Leaderboard(this, this.config));

    var playerGrow = new PlayerGrowsThingsListener(this, config);
    playerGrow.start();
    this.cleanups.add(playerGrow.cleanupTask());
    var walletLinked = new WalletLinkedListener(this.connector);

    this.getServer().getPluginManager().registerEvents(playerGrow, this);
    this.getServer().getPluginManager().registerEvents(walletLinked, this);

    this.webServer = new Server(config.isTls(), config.getTlsKeyStore(), config.getTlsKeyStorePassword(),
        config.getPort());
    this.webServer.start();
    this.cleanups.add(webServer.cleanupTask());
  }

  public void onDisable() {
    for (Runnable cleanup : this.cleanups) {
      cleanup.run();
    }
  }

  private EthereumRpc startEthereumRpc() {
    EthereumRpc rpc = new EthereumRpc(this.config);
    return rpc;
  }

  private PolygonRpc startPolygonRpc(EthereumRpc ethereumRpc) {
    PolygonRpc rpc = new PolygonRpc(this.config, ethereumRpc);
    return rpc;
  }

  public static Oddie getInstance() {
    return instance;
  }
}
