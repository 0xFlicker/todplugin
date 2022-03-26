package com.oddie;

import java.io.FileInputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.security.KeyManagementException;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

import org.bukkit.Bukkit;

import com.sun.net.httpserver.HttpsServer;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpsConfigurator;

public class Server {

  private boolean isTls;
  private String tlsKeyStore;
  private String tlsKeyStorePassword;
  private int port;
  private ThreadPoolExecutor executor;

  public Server(boolean isTls, String tlsKeyStore, String tlsKeyStorePassword, int port) {
    this.isTls = isTls;
    this.tlsKeyStore = tlsKeyStore;
    this.tlsKeyStorePassword = tlsKeyStorePassword;
    this.port = port;
    this.executor = (ThreadPoolExecutor) Executors.newFixedThreadPool(10);
  }

  public HttpServer createHttpServer() {
    try {
      ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor) Executors.newFixedThreadPool(4);

      if (this.isTls) {
        var server = HttpsServer.create(new InetSocketAddress(this.port), 0);
        SSLContext sslContext = this.createSslContext();
        server.setHttpsConfigurator(new HttpsConfigurator(sslContext));
        server.setExecutor(threadPoolExecutor);
        server.start();
        return server;
      }
      var server = HttpServer.create(new InetSocketAddress(this.port), 0);
      server.setExecutor(threadPoolExecutor);
      server.start();
      return server;
    } catch (IOException e) {
      Bukkit.getLogger().warning("Failed to start webhook");
      e.printStackTrace();
      System.exit(1);
    }
    return null;
  }

  private SSLContext createSslContext() {
    try {
      var keyStore = KeyStore.getInstance("PKCS12");

      Path keyPath = Path.of(this.tlsKeyStore);

      try {
        keyStore.load(new FileInputStream(keyPath.toFile()), this.tlsKeyStorePassword.toCharArray());

        var keyManagerFactory = KeyManagerFactory.getInstance("SunX509");
        try {
          keyManagerFactory.init(keyStore, this.tlsKeyStorePassword.toCharArray());

          var sslContext = SSLContext.getInstance("TLS");

          // Null means using default implementations for TrustManager and SecureRandom
          try {
            sslContext.init(keyManagerFactory.getKeyManagers(), null, null);
          } catch (KeyManagementException e) {
            Bukkit.getLogger().warning("Failed to init ssl context");
            e.printStackTrace();
            System.exit(1);
          }
          return sslContext;
        } catch (UnrecoverableKeyException e) {
          Bukkit.getLogger().warning("Failed to init keystorefactory");
          e.printStackTrace();
          System.exit(1);
        }
      } catch (NoSuchAlgorithmException | CertificateException | IOException e) {
        Bukkit.getLogger().warning("Failed to load keystore");
        e.printStackTrace();
        System.exit(1);
      }
    } catch (KeyStoreException e) {
      Bukkit.getLogger().warning("Failed to create keystore");
      e.printStackTrace();
      System.exit(1);
    }
    return null;
  }
}
