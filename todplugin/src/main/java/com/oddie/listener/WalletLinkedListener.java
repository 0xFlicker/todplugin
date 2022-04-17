package com.oddie.listener;

import com.oddie.event.WalletLinked;
import com.oddie.web3.WalletConnector;

import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

import io.papermc.paper.event.player.AsyncChatEvent;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.TextColor;
import net.kyori.adventure.text.format.TextDecoration;

public class WalletLinkedListener implements Listener {
  private WalletConnector connector;

  public WalletLinkedListener(WalletConnector connector) {
    this.connector = connector;
  }

  @EventHandler
  public void onChat(AsyncChatEvent chatEvent) {
    var player = chatEvent.getPlayer();
    var uuid = player.getUniqueId();
    if (this.connector.isTokenHolder(uuid)) {
      chatEvent.renderer((source, displayName, message, messageViewer) -> {
        var decoratedText = Component.text();
        decoratedText.append(Component.text("[Oddie]").color(TextColor.color(0xfae628)).decorate(TextDecoration.BOLD)
            .append(Component.space()));
        decoratedText.append(Component.text("<").color(TextColor.color(0xffffff)));
        decoratedText.append(
            displayName);
        decoratedText.append(Component.text(">").color(TextColor.color(0xffffff)));
        decoratedText.append(Component.space());
        decoratedText.append(message);
        return decoratedText.build();
      });
    }
  }

  @EventHandler
  public void onJoin(PlayerJoinEvent event) {
    this.connector.playerJoined(event.getPlayer());
  }

  @EventHandler
  public void onWalletLinked(WalletLinked event) {
    this.connector.walletConnect(event.getJoinRequest());
  }
}
