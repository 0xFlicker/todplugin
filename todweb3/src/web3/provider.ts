import { providers } from "ethers";

export function createBackendProvider() {
  return new providers.JsonRpcProvider(process.env.RPC_URL);
}
