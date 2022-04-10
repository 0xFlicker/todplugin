/*
 * Support asynchronous communication through windows postMessage between a popup and its parent.
 */

interface Message<
  Method extends string = string,
  Payload extends Record<string, any> | undefined = any
> {
  method: Method;
  payload: Payload;
  nonce: number;
  error?: string;
}

interface PendingMessage<
  Method extends string = string,
  Payload extends Record<string, any> | undefined = any
> extends Omit<Message<Method, Payload>, "error"> {
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}

export function leader(origin: string, postMessage: Window["postMessage"]) {
  const pendingMessages: PendingMessage[] = [];
  window.addEventListener("message", (event: MessageEvent<Message>) => {
    if (event.origin !== origin) {
      return;
    }
    const message = event.data as Message;
    const pendingMessage = pendingMessages.find(
      (pendingMessage) =>
        pendingMessage.nonce === message.nonce &&
        pendingMessage.method === message.method
    );
    if (!pendingMessage) {
      return;
    }
    if (message.error) {
      pendingMessage.reject(message.error);
    } else {
      pendingMessage.resolve(message.payload);
    }
  });
  let nonce = 0;
  return function sendMessage<
    Method extends string,
    Payload extends Record<string, any> | undefined,
    Return extends any
  >(method: Method, payload?: Payload): Promise<Return> {
    postMessage(JSON.stringify({ method, payload, nonce }), origin);
    return new Promise((resolve, reject) => {
      pendingMessages.push({ method, payload, nonce, resolve, reject });
    });
  };
}

export function follower(
  origin: string,
  rpc: Record<string, (value?: any) => Promise<any> | any>,
  window: Window,
) {
  window.addEventListener("message", (event: MessageEvent<Message>) => {
    if (event.origin !== origin) {
      return;
    }
    const message = event.data as Message;

    const method = message.method;
    const payload = message.payload;
    const nonce = message.nonce;
    const rpcMethod = rpc[method];
    if (!rpcMethod) {
      return window.postMessage({
        method,
        error: `Unknown method: ${method}`,
        nonce,
      });
    }
    try {
      const result = rpcMethod(payload);
      if (result instanceof Promise) {
        result.then(
          (value) => {
            window.postMessage(
              JSON.stringify({ method, payload: value, nonce }),
              origin
            );
          },
          (error) => {
            window.postMessage(
              JSON.stringify({ method, error: error.message, nonce })
            );
          }
        );
      } else {
        window.postMessage(
          JSON.stringify({ method, payload: result, nonce }),
          origin
        );
      }
    } catch (error: any) {
      window.postMessage(
        JSON.stringify({ method, error: error.message, nonce })
      );
    }
  });
}
