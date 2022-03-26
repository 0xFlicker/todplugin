package com.oddie.command;

import com.oddie.web3.WalletConnector;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class Connect implements CommandExecutor {

  private WalletConnector connector;

  public Connect(WalletConnector connector) {
    this.connector = connector;
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (sender instanceof Player) {
      this.connector.requestConnect((Player) sender);
    }
    return true;
  }
}
