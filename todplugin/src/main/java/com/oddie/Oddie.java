package com.oddie;

import com.oddie.command.Connect;
import com.oddie.config.Config;
import com.oddie.config.Wallet;
import com.oddie.http.Server;
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

  public WalletConnector getConnector() {
    return connector;
  }

  Server webServer;

  public void onEnable() {
    ConfigurationSerialization.registerClass(Wallet.class);
    instance = this;
    this.config = new Config();
    this.config.registerConfig(this);

    this.ethereumRpc = this.startEthereumRpc();
    this.polygonRpc = this.startPolygonRpc(this.ethereumRpc);

    this.connector = new WalletConnector(this.ethereumRpc, this.polygonRpc, this.config);
    this.getCommand("wallet").setExecutor(new Connect(this.connector));
    getServer().getPluginManager().registerEvents(new WalletLinkedListener(this.connector), this);
  }

  public void onDisable() {
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
