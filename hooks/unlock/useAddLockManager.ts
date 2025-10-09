"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { ADDITIONAL_LOCK_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, type Address } from "viem";
import type { AddLockManagerParams, AddLockManagerResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:add-lock-manager");

/**
 * Hook to add a lock manager to an existing lock
 * Requires the connected wallet to be an existing lock manager
 * 
 * @example
 * ```typescript
 * const { addLockManager, isLoading, error, isSuccess } = useAddLockManager();
 * 
 * const handleAddManager = async () => {
 *   const result = await addLockManager({
 *     lockAddress: "0x...",
 *     managerAddress: "0x...",
 *   });
 *   
 *   if (result.success) {
 *     console.log("Manager added successfully");
 *   }
 * };
 * ```
 */
export const useAddLockManager = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const addLockManager = useCallback(
    async (params: AddLockManagerParams): Promise<AddLockManagerResult> => {
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
        let managerAddress: Address;

        try {
          lockAddress = getAddress(params.lockAddress);
          managerAddress = getAddress(params.managerAddress);
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
            "You must be a lock manager to grant lock manager role",
          );
        }

        // Estimate gas with 20% padding
        const estimatedGas = await publicClient.estimateContractGas({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "addLockManager",
          args: [managerAddress],
          account: walletAccount,
        });

        const gasWithPadding = (estimatedGas * 120n) / 100n;

        log.debug("Gas estimation for addLockManager", {
          estimatedGas: estimatedGas.toString(),
          gasWithPadding: gasWithPadding.toString(),
        });

        // Add lock manager
        const grantTx = await walletClient.writeContract({
          address: lockAddress,
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "addLockManager",
          args: [managerAddress],
          account: walletAccount,
          chain: walletChain,
          gas: gasWithPadding,
        });

        await publicClient.waitForTransactionReceipt({
          hash: grantTx,
        });

        log.info("Lock manager added successfully", {
          transactionHash: grantTx,
          lockAddress,
          managerAddress,
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: grantTx,
        };
      } catch (error: any) {
        const errorMsg = error.message || "Failed to add lock manager";
        log.error("Add lock manager error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet],
  );

  return {
    addLockManager,
    ...state,
  };
};
