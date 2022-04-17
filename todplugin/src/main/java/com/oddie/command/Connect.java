package com.oddie.command;

import com.oddie.web3.WalletConnector;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.geysermc.connector.GeyserConnector;

public class Connect implements CommandExecutor {

  private WalletConnector connector;

  public Connect(WalletConnector connector) {
    this.connector = connector;
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (sender instanceof Player) {
      var player = (Player) sender;
      if (Bukkit.getServer().getPluginManager().getPlugin("Geyser-Spigot") != null
          && GeyserConnector.getInstance().getPlayerByUuid(player.getUniqueId()) != null) {
        this.connector.requestConnectQr(player);
      } else {
        this.connector.requestConnect(player);
      }
    }
    return true;
  }
}
