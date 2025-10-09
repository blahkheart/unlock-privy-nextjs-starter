"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { LendKeyParams, LendKeyResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:lend-key");

/**
 * Hook to lend a key to another address temporarily
 * The original owner retains ownership but grants temporary access
 *
 * @example
 * ```typescript
 * const { lendKey, isLoading, error, isSuccess } = useLendKey();
 *
 * const handleLend = async () => {
 *   const result = await lendKey({
 *     lockAddress: "0x...",
 *     from: "0x...", // Current owner
 *     recipient: "0x...", // Temporary recipient
 *     tokenId: 123n,
 *   });
 *
 *   if (result.success) {
 *     console.log("Key lent successfully");
 *   }
 * };
 * ```
 */
export const useLendKey = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const lendKey = useCallback(
    async (params: LendKeyParams): Promise<LendKeyResult> => {
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
        let from: Address;
        let recipient: Address;

        try {
          lockAddress = getAddress(params.lockAddress);
          from = getAddress(params.from);
          recipient = getAddress(params.recipient);
        } catch (addressError) {
          throw new Error("Invalid address provided");
        }

        // Lend key
        const lendTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "lendKey",
          args: [from, recipient, params.tokenId],
          account: walletAccount,
          chain: walletChain,
        });

        await publicClient.waitForTransactionReceipt({
          hash: lendTx,
        });

        log.info("Key lent successfully", {
          transactionHash: lendTx,
          lockAddress,
          from,
          recipient,
          tokenId: params.tokenId.toString(),
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: lendTx,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to lend key";
        log.error("Lend key error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    lendKey,
    ...state,
  };
};
