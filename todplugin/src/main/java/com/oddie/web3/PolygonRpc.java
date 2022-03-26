package com.oddie.web3;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import com.oddie.config.Config;
import com.oddie.web3.contract.PolygonPlayers;

import org.bukkit.Bukkit;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.ReadonlyTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

public class PolygonRpc {
  private static final String PERSONAL_MESSAGE_PREFIX = "\u0019Ethereum Signed Message:\n";
  private Web3j polygonWeb3j;
  private EthereumRpc ethereumRpc;
  private DefaultGasProvider gasProvider;
  PolygonPlayers contract;

  public PolygonRpc(Config config, EthereumRpc ethereumRpc) {
    this.ethereumRpc = ethereumRpc;
    this.polygonWeb3j = Web3j.build(new HttpService(config.getPolygonRpc()));
    this.gasProvider = new DefaultGasProvider();
    TransactionManager transactionManager = new ReadonlyTransactionManager(this.polygonWeb3j,
        config.getNftWorldsPlayerContractAddress());
    this.contract = PolygonPlayers.load(config.getNftWorldsPlayerContractAddress(), polygonWeb3j, transactionManager,
        gasProvider);
  }

  public Web3j getEthereumWeb3j() {
    return polygonWeb3j;
  }

  public DefaultGasProvider getGasProvider() {
    return gasProvider;
  }

  public CompletableFuture<Boolean> ownsToken(UUID playerUUID) {
    try {
      CompletableFuture<Boolean> primaryWalletFuture = this.contract.getPlayerPrimaryWallet(playerUUID.toString())
          .sendAsync()
          .thenCompose(primaryWallet -> {
            if (primaryWallet.isEmpty() || primaryWallet.equals("0x0000000000000000000000000000000000000000")) {
              return CompletableFuture.completedFuture(false);
            }
            return this.ethereumRpc.ownsToken(primaryWallet);
          });
      List<CompletableFuture<Boolean>> secondaryWalletFutures = new ArrayList<>();
      var secondaryWalletsFuture = this.contract.getPlayerSecondaryWallets(playerUUID.toString()).sendAsync()
          .thenApply(secondaryWallets -> {
            for (var secondaryWallet : secondaryWallets) {
              var sw = secondaryWallet.toString();
              if (sw.isEmpty() || sw.equals("0x0000000000000000000000000000000000000000")) {
                continue;
              }
              secondaryWalletFutures.add(this.ethereumRpc.ownsToken(sw));
            }
            return CompletableFuture.allOf(secondaryWalletFutures.toArray(new CompletableFuture[0]));
          });
      CompletableFuture.allOf(
          primaryWalletFuture,
          secondaryWalletsFuture).join();
      if (primaryWalletFuture.get() || secondaryWalletFutures.stream().anyMatch(arg0 -> {
        try {
          return arg0.get();
        } catch (InterruptedException | ExecutionException e) {
          e.printStackTrace();
          return false;
        }
      })) {
        return CompletableFuture.completedFuture(true);
      } else {
        return CompletableFuture.completedFuture(false);
      }
    } catch (Exception e) {
      Bukkit.getLogger().warning("Unable to get player wallet addresses.");
      e.printStackTrace();
      return CompletableFuture.completedFuture(false);
    }
  }

  public CompletableFuture<List<String>> getPlayerAddresses(UUID playerUUID) {
    try {
      var primaryWalletFuture = this.contract.getPlayerPrimaryWallet(playerUUID.toString()).sendAsync();
      var secondaryWalletsFuture = this.contract.getPlayerSecondaryWallets(playerUUID.toString()).sendAsync();
      CompletableFuture.allOf(
          primaryWalletFuture,
          secondaryWalletsFuture).join();
      var primaryWallet = primaryWalletFuture.get().toString();
      var secondaryWallets = secondaryWalletsFuture.get();
      List<String> addresses = new ArrayList<String>(secondaryWallets.size() + 1);
      addresses.add(primaryWallet);
      for (int i = 0; i < secondaryWallets.size(); i++) {
        addresses.add(secondaryWallets.get(i).toString());
      }
      return CompletableFuture.completedFuture(addresses);
    } catch (Exception e) {
      Bukkit.getLogger().warning("Unable to get player wallet addresses.");
      e.printStackTrace();
      return CompletableFuture.completedFuture(List.of());
    }
  }
}
