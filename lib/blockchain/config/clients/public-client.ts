/**
 * Public client configuration for read-only blockchain operations
 * Uses viem for efficient RPC calls
 */

import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet, polygon } from "viem/chains";
import { getClientConfig } from "../index";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("blockchain:public-client");

// Map chain IDs to viem chain objects
const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  8453: base,
  84532: baseSepolia,
  137: polygon,
};

/**
 * Create a unified public client for read operations
 */
export function createPublicClientUnified() {
  const config = getClientConfig();
  const chain = CHAIN_MAP[config.chainId];

  if (!chain) {
    log.warn("Chain not found in viem chains, using custom config", {
      chainId: config.chainId,
    });
  }

  const client = createPublicClient({
    chain: chain || {
      id: config.chainId,
      name: config.name,
      network: config.name.toLowerCase().replace(/\s+/g, "-"),
      nativeCurrency: config.nativeCurrency,
      rpcUrls: {
        default: { http: [config.rpcUrl] },
        public: { http: [config.rpcUrl] },
      },
      blockExplorers: {
        default: {
          name: "Explorer",
          url: config.blockExplorer,
        },
      },
    },
    transport: http(config.rpcUrl),
  });

  log.debug("Public client created", {
    chainId: config.chainId,
    chainName: config.name,
  });

  return client;
}
