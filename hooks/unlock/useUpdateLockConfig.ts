"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { UpdateLockConfigParams, UpdateLockConfigResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:update-lock-config");

/**
 * Hook to update lock configuration (expiration duration, max keys, max keys per account)
 * Requires the connected wallet to be a lock manager
 *
 * @example
 * ```typescript
 * const { updateLockConfig, isLoading, error, isSuccess } = useUpdateLockConfig();
 *
 * const handleUpdate = async () => {
 *   const result = await updateLockConfig({
 *     lockAddress: "0x...",
 *     expirationDuration: 2592000n, // 30 days
 *     maxNumberOfKeys: 200n,
 *     maxKeysPerAccount: 1n,
 *   });
 *
 *   if (result.success) {
 *     console.log("Lock config updated successfully");
 *   }
 * };
 * ```
 */
export const useUpdateLockConfig = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const updateLockConfig = useCallback(
    async (params: UpdateLockConfigParams): Promise<UpdateLockConfigResult> => {
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

        // Check if user is lock manager
        const isLockManager = (await publicClient.readContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "isLockManager",
          args: [userAddress],
        })) as unknown as boolean;

        if (!isLockManager) {
          throw new Error(
            "You must be a lock manager to update lock configuration",
          );
        }

        // Update lock config
        const updateTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "updateLockConfig",
          args: [
            params.expirationDuration,
            params.maxNumberOfKeys,
            params.maxKeysPerAccount,
          ],
          account: walletAccount,
          chain: walletChain,
        });

        await publicClient.waitForTransactionReceipt({
          hash: updateTx,
        });

        log.info("Lock config updated successfully", {
          transactionHash: updateTx,
          lockAddress,
          expirationDuration: params.expirationDuration.toString(),
          maxNumberOfKeys: params.maxNumberOfKeys.toString(),
          maxKeysPerAccount: params.maxKeysPerAccount.toString(),
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: updateTx,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to update lock config";
        log.error("Update lock config error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    updateLockConfig,
    ...state,
  };
};
