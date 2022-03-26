package com.oddie.event;

import com.oddie.http.OddieJoinRequest;

import org.bukkit.event.Event;
import org.bukkit.event.HandlerList;

public class WalletLinked extends Event {

  private static final HandlerList HANDLERS = new HandlerList();
  private OddieJoinRequest joinRequest;

  public WalletLinked(OddieJoinRequest request) {
    this.joinRequest = request;
  }

  public static HandlerList getHandlerList() {
    return HANDLERS;
  }

  public HandlerList getHandlers() {
    return HANDLERS;
  }

  public OddieJoinRequest getJoinRequest() {
    return joinRequest;
  }
}
