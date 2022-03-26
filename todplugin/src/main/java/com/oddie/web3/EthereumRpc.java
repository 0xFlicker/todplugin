package com.oddie.web3;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;

import com.oddie.config.Config;
import com.oddie.http.OddieJoinRequest;

import org.bukkit.Bukkit;
import org.web3j.crypto.ECDSASignature;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.ReadonlyTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.utils.Numeric;
import org.web3j.crypto.Sign.SignatureData;

import com.oddie.web3.contract.ERC721Metadata;

public class EthereumRpc {
  private static final String PERSONAL_MESSAGE_PREFIX = "\u0019Ethereum Signed Message:\n";
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
      return this.contract.balanceOf(address).sendAsync().thenApply(bigInt -> {
        return bigInt.intValue() > 0;
      });
    } catch (Exception e) {
      Bukkit.getLogger().warning("Unable to check if " + address + " owns a token.");
      e.printStackTrace();
      return CompletableFuture.completedFuture(false);
    }
  }

  public static boolean verifyRequestSignature(OddieJoinRequest request) {
    String signature = request.getSignature();
    String address = request.getAddress();
    String message = "This message is used to sign player\n with uuid "
        + request.getPlayerUuid().toString()
        + " into minecraft\n\nSigning this message costs no gas\nand is used only to verify ownership\nof this address.\n\nNonce: "
        + request.getNonce();

    String prefix = PERSONAL_MESSAGE_PREFIX + message.length();
    byte[] msgHash = Hash.sha3((prefix + message).getBytes());

    byte[] signatureBytes = Numeric.hexStringToByteArray(signature);
    byte v = signatureBytes[64];
    if (v < 27) {
      v += 27;
    }

    SignatureData sd = new SignatureData(
        v,
        (byte[]) Arrays.copyOfRange(signatureBytes, 0, 32),
        (byte[]) Arrays.copyOfRange(signatureBytes, 32, 64));

    String addressRecovered = null;
    boolean match = false;

    // Iterate for each possible key to recover
    for (int i = 0; i < 4; i++) {
      BigInteger publicKey = Sign.recoverFromSignature(
          (byte) i,
          new ECDSASignature(
              new BigInteger(1, sd.getR()), new BigInteger(1, sd.getS())),
          msgHash);

      if (publicKey != null) {
        addressRecovered = "0x" + Keys.getAddress(publicKey);

        if (addressRecovered.equals(address)) {
          match = true;
          break;
        }
      }
    }
    return match;
  }
}
