package com.oddie.queue;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;

import org.bukkit.Bukkit;

public class BatchQueue<T, R> {
  private BlockingQueue<Request> blockingQueue;
  Function<List<T>, R> handler;
  ScheduledExecutorService threadPool = Executors.newScheduledThreadPool(1);
  private int initialDelay;
  private int period;
  private TimeUnit timeUnit;

  public BatchQueue(Function<List<T>, R> handler, int initialDelay, int period, TimeUnit timeUnit) {
    this.initialDelay = initialDelay;
    this.period = period;
    this.timeUnit = timeUnit;
    this.handler = handler;
    this.blockingQueue = new LinkedBlockingQueue<Request>();
  }

  class Request {
    T item;
    CompletableFuture<R> future;
  }

  public void doBusiness() {
    ScheduledExecutorService threadPool = Executors.newScheduledThreadPool(1);
    threadPool.scheduleWithFixedDelay(new Runnable() {
      @Override
      public void run() {
        int size = blockingQueue.size();
        if (size == 0) {
          return;
        }
        List<Request> requests = new ArrayList<>();
        List<T> orders = new ArrayList<>();
        for (int i = 0; i < size; i++) {
          Request request = blockingQueue.poll();
          requests.add(request);
          orders.add(request.item);
        }
        Bukkit.getLogger().info("Batch size: " + size);
        R response = handler.apply(orders);
        for (Request request : requests) {
          request.future.complete(response);
        }
      }
    }, initialDelay, period, timeUnit);
  }

  public CompletableFuture<R> add(T item) {
    var r = new Request();
    r.item = item;
    r.future = new CompletableFuture<>();
    blockingQueue.add(r);
    return r.future;
  }

  public void start() {
    doBusiness();
  }

  public void stop() {
    threadPool.shutdown();
  }
}
