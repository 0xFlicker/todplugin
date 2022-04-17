package com.oddie.event;

import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;

public class P2eEvent extends Event {
  private static final HandlerList HANDLERS = new HandlerList();
  private Player player;
  private String boardName;

  public P2eEvent(Player player, String boardName) {
    this.player = player;
    this.boardName = boardName;
  }

  public Player getPlayer() {
    return player;
  }

  public String getBoardName() {
    return boardName;
  }

  public static HandlerList getHandlerList() {
    return HANDLERS;
  }

  public HandlerList getHandlers() {
    return HANDLERS;
  }

}
