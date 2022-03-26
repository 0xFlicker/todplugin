package com.oddie.web3;

import java.util.concurrent.CompletableFuture;

import com.oddie.config.Config;

import org.bukkit.Bukkit;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.ReadonlyTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.response.QueuingTransactionReceiptProcessor;

import com.oddie.web3.contract.ERC721Metadata;

public class EthereumRpc {
  private Web3j ethereumWeb3j;
  private DefaultGasProvider gasProvider;
  ERC721Metadata contract;

  public EthereumRpc(Config config) {
    this.ethereumWeb3j = Web3j.build(new HttpService(config.getRpc()));
    this.gasProvider = new DefaultGasProvider();
    TransactionManager transactionManager = new ReadonlyTransactionManager(this.ethereumWeb3j,
        config.getContractAddress());
    this.contract = ERC721Metadata.load(config.getContractAddress(), ethereumWeb3j, transactionManager, gasProvider);
  }

  public Web3j getEthereumWeb3j() {
    return ethereumWeb3j;
  }

  public DefaultGasProvider getGasProvider() {
    return gasProvider;
  }

  public CompletableFuture<Boolean> ownsToken(String address) {
    try {
      return this.contract.balanceOf(address).sendAsync().thenApply(bigInt -> bigInt.intValue() > 0);
    } catch (Exception e) {
      Bukkit.getLogger().warning("Unable to check if " + address + " owns a token.");
      e.printStackTrace();
      return CompletableFuture.completedFuture(false);
    }
  }
}
