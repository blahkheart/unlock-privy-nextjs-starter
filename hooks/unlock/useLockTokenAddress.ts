"use client";

import { useCallback, useState } from "react";
import { createPublicClientUnified } from "@/lib/blockchain/config/clients/public-client";
import { COMPLETE_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import type { Address } from "viem";

const log = getLogger("hooks:unlock:lock-token-address");

interface UseLockTokenAddressOptions {
  enabled?: boolean;
}

/**
 * Hook to get the token address used by a lock
 * Returns the zero address (0x0...0) for ETH locks, or an ERC20 address for token locks
 */
export const useLockTokenAddress = (
  options: UseLockTokenAddressOptions = {},
) => {
  const { enabled = true } = options;
  const [error, setError] = useState<string | null>(null);

  const getTokenAddress = useCallback(
    async (lockAddress: Address): Promise<Address | null> => {
      if (!enabled) return null;

      try {
        setError(null);

        const client = createPublicClientUnified();

        const tokenAddress = (await client.readContract({
          address: lockAddress,
          abi: COMPLETE_LOCK_ABI,
          functionName: "tokenAddress",
          args: [],
        })) as unknown as Address;

        log.debug("Token address retrieved", {
          lockAddress,
          tokenAddress,
        });

        return tokenAddress;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        log.error("Error getting token address:", { error: err, lockAddress });
        setError(errorMsg);
        return null;
      }
    },
    [enabled],
  );

  return {
    getTokenAddress,
    error,
  };
};
