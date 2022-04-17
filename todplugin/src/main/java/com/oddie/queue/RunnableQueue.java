package com.oddie.queue;

import java.util.Queue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class RunnableQueue {
  private Queue<Runnable> queue;
  private BlockingQueue<Runnable> blockingQueue;
  private Worker worker;
  private Thread workerThread;

  public RunnableQueue() {
    var queue = new LinkedBlockingQueue<Runnable>();
    this.queue = queue;
    this.blockingQueue = queue;
    worker = new Worker();
    workerThread = new Thread(worker);
  }

  private class Worker implements Runnable {
    @Override
    public void run() {
      while (true) {
        Runnable task;
        try {
          task = blockingQueue.take();
          if (task == null) {
            break;
          }
          try {
            task.run();
          } catch (Exception e) {
            e.printStackTrace();
          }
        } catch (InterruptedException e1) {
          e1.printStackTrace();
        }
      }
    }

  }

  public void add(Runnable runnable) {
    queue.add(runnable);
  }

  public void start() {
    workerThread.start();
  }

  public void stop() {
    workerThread.interrupt();
  }
}
