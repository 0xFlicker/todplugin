package com.oddie.web3;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.oddie.config.Config;
import com.oddie.http.OddieJoinRequest;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import org.bukkit.plugin.RegisteredServiceProvider;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.TextComponent;
import net.kyori.adventure.text.event.ClickEvent;
import net.kyori.adventure.text.event.HoverEvent;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;
import net.luckperms.api.LuckPerms;
import net.luckperms.api.node.types.InheritanceNode;

public class WalletConnector {
  private PolygonRpc rpc;
  private EthereumRpc ethereumRpc;
  private Config config;
  private LuckPerms permissions;
  // Store in memory for now.
  private int nonce = 0;
  private Map<UUID, List<Integer>> pendingWalletRequests;
  private Map<UUID, Boolean> isTokenHolder;

  public WalletConnector(EthereumRpc e_rpc, PolygonRpc p_rpc, Config config) {
    this.rpc = p_rpc;
    this.ethereumRpc = e_rpc;
    this.config = config;
    this.pendingWalletRequests = new HashMap<UUID, List<Integer>>();
    this.isTokenHolder = new HashMap<UUID, Boolean>();
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

  public void requestConnect(Player player) {
    // Create link to wallet connect
    String connectWebpage = this.config.getConnectWebpage() + "/" + player.getUniqueId().toString()
        + "/" + this.nonce;

    TextComponent ctaMessage = Component.text("Connect your wallet ")
        .append(Component
            .text("here")
            .decorate(TextDecoration.BOLD, TextDecoration.UNDERLINED)
            .color(TextColor.color(0xFF))
            .clickEvent(ClickEvent.openUrl(connectWebpage))
            .hoverEvent(HoverEvent.showText(Component.text("Click to connect your wallet"))));
    player.sendMessage(ctaMessage);
    this.nonce++;
  }

  public void walletConnect(OddieJoinRequest joinRequest) {
    var playerUuid = joinRequest.getPlayerUuid();
    var pendingNonces = this.pendingWalletRequests.get(playerUuid);
    var player = Bukkit.getPlayer(playerUuid);
    if (pendingNonces == null) {
      if (player != null) {
        player.sendMessage("Sorry, nonce not found");
      }
      return;
    }
    if (pendingNonces.contains(joinRequest.getNonce())) {
      pendingNonces.remove(joinRequest.getNonce());
      if (pendingNonces.size() == 0) {
        this.pendingWalletRequests.remove(playerUuid);
      }
      this.ethereumRpc.ownsToken(joinRequest.getAddress()).thenAccept(ownsToken -> {
        if (ownsToken) {
          if (player != null) {
            player.sendMessage("Address " + joinRequest.getAddress() + " linked. Welcome home, Oddie!");
          }
          // Player has a token, so add to token group
          this.addToTokenGroup(playerUuid);
        } else {
          if (player != null) {
            player.sendMessage("Address " + joinRequest.getAddress()
                + " linked. No token found. Please consider purchasing an Oddie token.");
          }

        }
      });
    } else {
      if (player != null) {
        player.sendMessage("Sorry, nonce not found");
      }
    }
  }

  public void playerJoined(Player player) {
    // See if the player is already known
    var uuid = player.getUniqueId();

    this.rpc.ownsToken(uuid).thenAccept(ownsToken -> {
      if (ownsToken) {
        // Welcome back
        player.sendMessage("Welcome back Oddie");
        // Player has a token, so add to token group
        this.addToTokenGroup(uuid);
        this.isTokenHolder.put(uuid, true);
      } else {
        this.isTokenHolder.put(uuid, false);
      }
    });
  }

  public boolean isTokenHolder(UUID uuid) {
    return this.isTokenHolder.get(uuid) != null && this.isTokenHolder.get(uuid);
  }
}
