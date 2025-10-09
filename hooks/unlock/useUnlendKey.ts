"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { UnlendKeyParams, UnlendKeyResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:unlend-key");

/**
 * Hook to return a lent key back to the original owner
 * Removes temporary access granted via lendKey
 *
 * @example
 * ```typescript
 * const { unlendKey, isLoading, error, isSuccess } = useUnlendKey();
 *
 * const handleUnlend = async () => {
 *   const result = await unlendKey({
 *     lockAddress: "0x...",
 *     recipient: "0x...", // Temporary recipient to remove
 *     tokenId: 123n,
 *   });
 *
 *   if (result.success) {
 *     console.log("Key returned to owner");
 *   }
 * };
 * ```
 */
export const useUnlendKey = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const unlendKey = useCallback(
    async (params: UnlendKeyParams): Promise<UnlendKeyResult> => {
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
        let recipient: Address;

        try {
          lockAddress = getAddress(params.lockAddress);
          recipient = getAddress(params.recipient);
        } catch (addressError) {
          throw new Error("Invalid address provided");
        }

        // Unlend key
        const unlendTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "unlendKey",
          args: [recipient, params.tokenId],
          account: walletAccount,
          chain: walletChain,
        });

        await publicClient.waitForTransactionReceipt({
          hash: unlendTx,
        });

        log.info("Key returned to owner successfully", {
          transactionHash: unlendTx,
          lockAddress,
          recipient,
          tokenId: params.tokenId.toString(),
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: unlendTx,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to unlend key";
        log.error("Unlend key error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    unlendKey,
    ...state,
  };
};
