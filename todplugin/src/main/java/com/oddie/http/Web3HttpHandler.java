package com.oddie.http;

import java.io.IOException;

import com.oddie.Oddie;
import com.oddie.config.Config;
import com.oddie.event.WalletLinked;
import com.oddie.web3.EthereumRpc;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import org.bukkit.Bukkit;
import org.json.JSONObject;

public class Web3HttpHandler implements HttpHandler {

  // Secret string to validate the request
  private Config config;

  // Create handler for the /web3 webhook
  public Web3HttpHandler(Config config) {
    this.config = config;
  }

  @Override
  public void handle(HttpExchange exchange) throws IOException {
    // Check if the request header includes the secret
    if (exchange.getRequestHeaders().containsKey("X-Oddie-Secret")) {
      // Get the signature from the request header
      String signature = exchange.getRequestHeaders().getFirst("X-Oddie-Secret");
      // Check if the signature is valid
      if (signature.equals(this.config.getSecret())) {
        Bukkit.getLogger().info("Received webhook request.");
        // Get the request body
        try {
          JSONObject jo = new JSONObject(new String(exchange.getRequestBody().readAllBytes()));
          // Get the player id, nonce, address and signature from the request body
          OddieJoinRequest oddieJoinRequest = OddieJoinRequest.fromJSON(jo);
          // Check signature
          if (EthereumRpc.verifyRequestSignature(oddieJoinRequest)) {
            Bukkit.getLogger().info("Received valid signature for " + oddieJoinRequest.getAddress());
            // Update config
            config.createOrUpdateWallet(oddieJoinRequest);

            // Let everyone know that a new wallet has been added
            var event = new WalletLinked(oddieJoinRequest);
            Bukkit.getScheduler().runTask(Oddie.getInstance(),
                () -> Bukkit.getPluginManager().callEvent(event))
                .wait();
            if (Oddie.getInstance().getConnector().isTokenHolder(oddieJoinRequest.getPlayerUuid())) {
              // Send success
              exchange.sendResponseHeaders(200, 0);
            } else {
              Bukkit.getLogger().info("Invalid request for " + oddieJoinRequest.getAddress());
              // Send error
              exchange.sendResponseHeaders(400, 0);
            }

          } else {
            Bukkit.getLogger().info("Invalid signature for " + oddieJoinRequest.getAddress());
            // Send error
            exchange.sendResponseHeaders(400, 0);
          }
          return;
        } catch (Exception e) {
          // If the request body is not a valid JSON, return an error
          exchange.sendResponseHeaders(400, 0);
          return;
        } finally {
          // Close the request body
          exchange.close();
        }

      } else {
        // Send the response
        exchange.sendResponseHeaders(401, 0);
        exchange.close();
      }
    } else {
      // Send the response
      exchange.sendResponseHeaders(401, 0);
      exchange.close();
    }
  }

}
