"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { GrantKeysParams, GrantKeysResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:grant-keys");

/**
 * Hook for bulk granting keys to multiple recipients
 * Requires the connected wallet to be a lock manager
 * Different from useLockManagerKeyGrant which uses purchase mechanism for single keys
 *
 * @example
 * ```typescript
 * const { grantKeys, isLoading, error, isSuccess } = useGrantKeys();
 *
 * const handleGrantKeys = async () => {
 *   const result = await grantKeys({
 *     lockAddress: "0x...",
 *     recipients: ["0x...", "0x..."],
 *     expirationTimestamps: [0n, 0n], // 0 for default expiration
 *     keyManagers: ["0x...", "0x..."],
 *   });
 *
 *   if (result.success) {
 *     console.log("Keys granted, token IDs:", result.tokenIds);
 *   }
 * };
 * ```
 */
export const useGrantKeys = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const grantKeys = useCallback(
    async (params: GrantKeysParams): Promise<GrantKeysResult> => {
      if (!wallet) {
        const error = "Wallet not connected";
        setState((prev) => ({ ...prev, error }));
        return { success: false, error };
      }

      setState({ isLoading: true, error: null, isSuccess: false });

      try {
        // Create fresh viem clients
        const { walletClient, publicClient } =
          await createViemFromPrivyWallet(wallet);

        const userAddress = getAddress(wallet.address as Address);
        const walletAccount = walletClient.account ?? userAddress;
        const walletChain = walletClient.chain;

        let lockAddress: Address;

        try {
          lockAddress = getAddress(params.lockAddress);
        } catch (addressError) {
          throw new Error("Invalid lock address provided");
        }

        // Validate arrays have same length
        if (
          params.recipients.length !== params.expirationTimestamps.length ||
          params.recipients.length !== params.keyManagers.length
        ) {
          throw new Error(
            "Recipients, expiration timestamps, and key managers arrays must have the same length",
          );
        }

        // Check if user is lock manager
        const isLockManager = (await publicClient.readContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "isLockManager",
          args: [userAddress],
        })) as unknown as boolean;

        if (!isLockManager) {
          throw new Error(
            "You must be a lock manager to grant keys",
          );
        }

        // Grant keys
        const grantTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "grantKeys",
          args: [
            params.recipients,
            params.expirationTimestamps,
            params.keyManagers,
          ],
          account: walletAccount,
          chain: walletChain,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: grantTx,
        });

        // Extract token IDs from logs if available
        const tokenIds: bigint[] = [];
        for (const log of receipt.logs) {
          if (log.topics[0] && log.topics.length >= 3) {
            try {
              const tokenId = BigInt(log.topics[3] || "0");
              if (tokenId > 0n) {
                tokenIds.push(tokenId);
              }
            } catch (e) {
              // Skip invalid logs
            }
          }
        }

        log.info("Keys granted successfully", {
          transactionHash: grantTx,
          lockAddress,
          recipientsCount: params.recipients.length,
          tokenIds: tokenIds.map(id => id.toString()),
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: grantTx,
          tokenIds: tokenIds.length > 0 ? tokenIds : undefined,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to grant keys";
        log.error("Grant keys error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    grantKeys,
    ...state,
  };
};
