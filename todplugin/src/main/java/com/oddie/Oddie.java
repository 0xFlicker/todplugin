package com.oddie;

import java.util.UUID;

import com.oddie.config.Config;
import com.oddie.config.Wallet;
import com.oddie.web3.EthereumRpc;
import com.oddie.web3.Web3HttpHandler;
import com.sun.net.httpserver.HttpsServer;

import org.bukkit.Bukkit;
import org.bukkit.configuration.serialization.ConfigurationSerialization;
import org.bukkit.event.EventHandler;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.java.JavaPlugin;

import net.luckperms.api.LuckPerms;
import net.luckperms.api.node.types.InheritanceNode;

public class Oddie extends JavaPlugin {
  private Config config;

  private HttpsServer server;
  private EthereumRpc rpc;
  private LuckPerms permissions;

  Server webServer;

  public void onEnable() {
    ConfigurationSerialization.registerClass(Wallet.class);

    this.config = new Config();
    this.config.registerConfig(this);
    this.webServer = new Server(this.config.isTls(), this.config.getTlsKeyStore(), this.config.getTlsKeyStorePassword(),
        this.config.getPort());
    var server = this.webServer.createHttpServer();
    server.createContext("/player", new Web3HttpHandler(this.config));

    this.rpc = this.startEthereumRpc();

    RegisteredServiceProvider<LuckPerms> provider = Bukkit.getServicesManager().getRegistration(LuckPerms.class);
    if (provider != null) {
      LuckPerms api = provider.getProvider();
      this.permissions = api;
    }
  }

  private void addToTokenGroup(UUID userUuid) {
    // Load, modify, then save
    var tokenGroup = this.permissions.getGroupManager().getGroup(this.config.getTokenGroup());

    this.permissions.getUserManager().modifyUser(userUuid, user -> {
      InheritanceNode node = InheritanceNode.builder(tokenGroup).value(true).build();
      user.data().add(node);
    });
  }

  @EventHandler
  public void onJoin(PlayerJoinEvent event) {
    // See if the player is already known
    var uuid = event.getPlayer().getUniqueId();
    var playerWallet = this.config.findPlayer(uuid);
    if (playerWallet != null) {
      // Check if player owns a token
      this.rpc.ownsToken(playerWallet.getAddress()).thenAccept(ownsToken -> {
        if (ownsToken) {
          // Player has a token, so add to token group
          this.addToTokenGroup(uuid);
        }
      });
    }
  }

  public void onDisable() {
    if (this.server != null) {
      this.server.stop(0);
    }
  }

  private EthereumRpc startEthereumRpc() {
    EthereumRpc rpc = new EthereumRpc(this.config);
    return rpc;
  }
}
