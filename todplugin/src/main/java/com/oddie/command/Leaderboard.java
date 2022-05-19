package com.oddie.command;

import com.oddie.Oddie;
import com.oddie.config.Config;
import com.oddie.event.P2eEvent;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.metadata.FixedMetadataValue;

public class Leaderboard implements CommandExecutor {

  private Oddie oddie;
  private Config config;

  public Leaderboard(Oddie oddie, Config config) {
    this.oddie = oddie;
    this.config = config;
  }

  @Override
  public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    String boardName = this.config.getExperienceName();
    if (sender instanceof Player) {
      var player = (Player) sender;
      if (args.length == 0) {
        var metadata = player.getMetadata("oddie_leaderboard");
        if (metadata.size() > 0) {
          player.removeMetadata("oddie_leaderboard", oddie);
          Bukkit.getPluginManager().callEvent(new P2eEvent(player, null));
        } else {
          var experience = config.getExperienceName();
          player.setMetadata("oddie_leaderboard", new FixedMetadataValue(oddie, experience));
          Bukkit.getPluginManager().callEvent(new P2eEvent(player, experience));
        }
      } else if (args[0].equalsIgnoreCase(boardName) && args.length == 1) {
        player.setMetadata("oddie_leaderboard", new FixedMetadataValue(oddie, boardName));
        Bukkit.getPluginManager().callEvent(new P2eEvent(player, boardName));
      } else if (args[0].equalsIgnoreCase("hide")) {
        var experience = config.getExperienceName();
        player.setMetadata("oddie_leaderboard", new FixedMetadataValue(oddie, experience));
        Bukkit.getPluginManager().callEvent(new P2eEvent(player, experience));
      }
    }
    return true;
  }
}
