/**
 * Blockchain configuration module
 * Centralizes chain configuration and network settings
 * 
 * This module provides:
 * - Default RPC URLs for all supported networks
 * - Environment variable overrides for custom RPC URLs
 * - Automatic Unlock Protocol factory address resolution
 * - Chain metadata (name, explorer, currency)
 */

import { getLogger } from "@/lib/utils/logger";
import { UNLOCK_FACTORY_ADDRESSES } from "../shared/abi-definitions";

const log = getLogger("blockchain:config");

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  unlockFactoryAddress?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

/**
 * Get RPC URL with environment variable override support
 * Priority: Custom env var > Default public RPC
 */
function getRpcUrl(chainId: number, defaultUrl: string, envVarName?: string): string {
  if (envVarName) {
    const customUrl = process.env[envVarName];
    if (customUrl) {
      log.debug(`Using custom RPC URL for chain ${chainId}`, { envVarName });
      return customUrl;
    }
  }
  return defaultUrl;
}

// Default chain configurations with public RPCs
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  1: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: getRpcUrl(1, "https://eth.llamarpc.com", "NEXT_PUBLIC_ETHEREUM_RPC_URL"),
    blockExplorer: "https://etherscan.io",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[1],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  5: {
    chainId: 5,
    name: "Goerli Testnet",
    rpcUrl: getRpcUrl(5, "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161", "NEXT_PUBLIC_GOERLI_RPC_URL"),
    blockExplorer: "https://goerli.etherscan.io",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[5],
    nativeCurrency: {
      name: "Goerli Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  10: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: getRpcUrl(10, "https://mainnet.optimism.io", "NEXT_PUBLIC_OPTIMISM_RPC_URL"),
    blockExplorer: "https://optimistic.etherscan.io",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[10],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  100: {
    chainId: 100,
    name: "Gnosis Chain",
    rpcUrl: getRpcUrl(100, "https://rpc.gnosischain.com", "NEXT_PUBLIC_GNOSIS_RPC_URL"),
    blockExplorer: "https://gnosisscan.io",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[100],
    nativeCurrency: {
      name: "xDAI",
      symbol: "xDAI",
      decimals: 18,
    },
  },
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: getRpcUrl(137, "https://polygon-rpc.com", "NEXT_PUBLIC_POLYGON_RPC_URL"),
    blockExplorer: "https://polygonscan.com",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[137],
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
  },
  8453: {
    chainId: 8453,
    name: "Base",
    rpcUrl: getRpcUrl(8453, "https://mainnet.base.org", "NEXT_PUBLIC_BASE_RPC_URL"),
    blockExplorer: "https://basescan.org",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[8453],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  42161: {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: getRpcUrl(42161, "https://arb1.arbitrum.io/rpc", "NEXT_PUBLIC_ARBITRUM_RPC_URL"),
    blockExplorer: "https://arbiscan.io",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[42161],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
  84532: {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: getRpcUrl(84532, "https://sepolia.base.org", "NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL"),
    blockExplorer: "https://sepolia.basescan.org",
    unlockFactoryAddress: UNLOCK_FACTORY_ADDRESSES[84532],
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
  },
};

/**
 * Get the current chain configuration from environment variables
 * Defaults to Base Sepolia (84532) if no chain ID is specified
 */
export function getClientConfig(): ChainConfig {
  const chainIdStr = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";
  const chainId = parseInt(chainIdStr, 10);

  const config = CHAIN_CONFIGS[chainId];

  if (!config) {
    log.warn("Unknown chain ID, using Base Sepolia as fallback", { chainId });
    return CHAIN_CONFIGS[84532];
  }

  log.debug("Using chain configuration", { chainId, name: config.name });
  return config;
}

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return chainId in CHAIN_CONFIGS;
}

/**
 * Get the Unlock Protocol factory address for the current chain
 * Throws an error if the chain doesn't have Unlock Protocol support
 * 
 * @param chainId - Optional chain ID. If not provided, uses current chain from env
 * @param throwOnMissing - If true, throws error when factory address is missing (default: false)
 * @returns Factory address or undefined
 */
export function getUnlockFactoryAddress(chainId?: number, throwOnMissing: boolean = false): string | undefined {
  const config = chainId ? getChainConfig(chainId) : getClientConfig();
  const factoryAddress = config?.unlockFactoryAddress;
  
  if (!factoryAddress && throwOnMissing) {
    const id = chainId || config?.chainId;
    throw new Error(
      `Unlock Protocol factory not available on chain ${id}. ` +
      `Supported chains: ${getUnlockSupportedChains().map(c => `${c.name} (${c.chainId})`).join(', ')}`
    );
  }
  
  return factoryAddress;
}

/**
 * Get the Unlock Protocol factory address for a specific chain
 * This is a strict version that throws if the factory is not available
 * 
 * @param chainId - Chain ID to get factory address for
 * @returns Factory address (guaranteed to exist or throws)
 */
export function requireUnlockFactoryAddress(chainId: number): string {
  const address = getUnlockFactoryAddress(chainId, true);
  if (!address) {
    throw new Error(`Unlock Protocol factory not available on chain ${chainId}`);
  }
  return address;
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(CHAIN_CONFIGS).map(Number);
}

/**
 * Get all chains that have Unlock Protocol support
 */
export function getUnlockSupportedChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS).filter(config => config.unlockFactoryAddress);
}

/**
 * Format chain name for display
 */
export function formatChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.name || `Chain ${chainId}`;
}
