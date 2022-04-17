package com.oddie.command;

import com.oddie.Oddie;
import com.oddie.event.P2eEvent;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.metadata.FixedMetadataValue;

public class Leaderboard implements CommandExecutor {

  private Oddie oddie;

  public Leaderboard(Oddie oddie) {
    this.oddie = oddie;
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (sender instanceof Player) {
      var player = (Player) sender;
      if (args[0].equalsIgnoreCase("potato") && args.length == 1) {
        player.setMetadata("oddie_leaderboard", new FixedMetadataValue(oddie, "potato"));
        Bukkit.getPluginManager().callEvent(new P2eEvent(player, "potato"));
      }
      if (args[0].equalsIgnoreCase("hide")) {
        player.removeMetadata("oddie_leaderboard", oddie);
        Bukkit.getPluginManager().callEvent(new P2eEvent(player, null));
      }
    }
    return true;
  }
}
