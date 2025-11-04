/**
 * Server-side pricing utilities for Unlock Protocol
 * Used in API routes to get lock prices
 */

import { createPublicClient, http } from 'viem';
import { base, baseSepolia, mainnet, polygon } from 'viem/chains';
import { getChainConfig } from '@/lib/blockchain/config';
import { COMPLETE_LOCK_ABI } from '@/lib/blockchain/shared/abi-definitions';
import { getLogger } from '@/lib/utils/logger';
import type { Address } from 'viem';

const log = getLogger('unlock-pricing');

/**
 * Get key price for a lock in wei
 * Server-side utility for API routes
 */
export async function getKeyPrice(
  lockAddress: Address,
  chainId: number
): Promise<bigint> {
  try {
    const chainConfig = getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Map chain ID to viem chain object
    const CHAIN_MAP: Record<number, any> = {
      1: mainnet,
      8453: base,
      84532: baseSepolia,
      137: polygon,
    };

    const viemChain = CHAIN_MAP[chainId] || {
      id: chainConfig.chainId,
      name: chainConfig.name,
      network: chainConfig.name.toLowerCase().replace(/\s+/g, '-'),
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: {
        default: { http: [chainConfig.rpcUrl] },
        public: { http: [chainConfig.rpcUrl] },
      },
      blockExplorers: {
        default: {
          name: 'Explorer',
          url: chainConfig.blockExplorer,
        },
      },
    };

    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(chainConfig.rpcUrl)
    });

    const keyPrice = (await publicClient.readContract({
      address: lockAddress,
      abi: COMPLETE_LOCK_ABI,
      functionName: 'keyPrice',
      args: []
    })) as unknown as bigint;

    log.debug('Key price retrieved', {
      lockAddress,
      chainId,
      keyPrice: keyPrice.toString()
    });

    return keyPrice;
  } catch (error) {
    log.error('Failed to get key price', {
      lockAddress,
      chainId,
      error
    });
    throw error;
  }
}

