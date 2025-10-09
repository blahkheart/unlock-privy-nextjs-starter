"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { UpdateKeyPricingParams, UpdateKeyPricingResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:update-key-pricing");

/**
 * Hook to update the key price and token address for a lock
 * Requires the connected wallet to be a lock manager
 *
 * @example
 * ```typescript
 * const { updateKeyPricing, isLoading, error, isSuccess } = useUpdateKeyPricing();
 *
 * const handleUpdate = async () => {
 *   const result = await updateKeyPricing({
 *     lockAddress: "0x...",
 *     keyPrice: parseEther("0.02"),
 *     tokenAddress: "0x0000000000000000000000000000000000000000", // ETH
 *   });
 *
 *   if (result.success) {
 *     console.log("Pricing updated successfully");
 *   }
 * };
 * ```
 */
export const useUpdateKeyPricing = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const updateKeyPricing = useCallback(
    async (params: UpdateKeyPricingParams): Promise<UpdateKeyPricingResult> => {
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
        let tokenAddress: Address;

        try {
          lockAddress = getAddress(params.lockAddress);
          tokenAddress = getAddress(params.tokenAddress);
        } catch (addressError) {
          throw new Error("Invalid address provided");
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
            "You must be a lock manager to update pricing",
          );
        }

        // Update key pricing
        const updateTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "updateKeyPricing",
          args: [params.keyPrice, tokenAddress],
          account: walletAccount,
          chain: walletChain,
        });

        await publicClient.waitForTransactionReceipt({
          hash: updateTx,
        });

        log.info("Key pricing updated successfully", {
          transactionHash: updateTx,
          lockAddress,
          keyPrice: params.keyPrice.toString(),
          tokenAddress,
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: updateTx,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to update key pricing";
        log.error("Update key pricing error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    updateKeyPricing,
    ...state,
  };
};
