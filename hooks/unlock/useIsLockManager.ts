"use client";

import { useCallback, useState } from "react";
import { createPublicClientUnified } from "@/lib/blockchain/config/clients/public-client";
import { COMPLETE_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import type { Address } from "viem";

const log = getLogger("hooks:unlock:is-lock-manager");

interface UseIsLockManagerOptions {
  enabled?: boolean;
}

/**
 * Hook to check if a user is a lock manager for a specific lock
 * Lock managers can grant keys, update pricing, and manage the lock
 */
export const useIsLockManager = (options: UseIsLockManagerOptions = {}) => {
  const { enabled = true } = options;
  const [error, setError] = useState<string | null>(null);

  const checkIsLockManager = useCallback(
    async (
      userAddress: Address,
      lockAddress: Address,
    ): Promise<boolean | null> => {
      if (!enabled) return null;

      try {
        setError(null);

        const client = createPublicClientUnified();

        const isLockManager = (await client.readContract({
          address: lockAddress,
          abi: COMPLETE_LOCK_ABI,
          functionName: "isLockManager",
          args: [userAddress],
        })) as unknown as boolean;

        log.debug("Lock manager check result", {
          userAddress,
          lockAddress,
          isLockManager,
        });

        return isLockManager;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        log.error("Error checking isLockManager:", {
          error: err,
          userAddress,
          lockAddress,
        });
        setError(errorMsg);
        return null;
      }
    },
    [enabled],
  );

  return {
    checkIsLockManager,
    error,
  };
};
