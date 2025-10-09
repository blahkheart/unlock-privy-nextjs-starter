"use client";

import { useCallback, useState } from "react";
import { usePrivyWriteWallet } from "./usePrivyWriteWallet";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import {
  UNLOCK_FACTORY_ABI,
  ADDITIONAL_LOCK_ABI,
} from "@/lib/blockchain/shared/abi-definitions";
import { extractLockAddressFromReceipt } from "@/lib/blockchain/shared/transaction-utils";
import { requireUnlockFactoryAddress } from "@/lib/blockchain/config";
import { getLogger } from "@/lib/utils/logger";
import { encodeFunctionData, getAddress, type Address } from "viem";
import type { LockDeploymentParams, LockDeploymentResult, OperationState } from "./types";

const log = getLogger("hooks:unlock:deploy-lock");

/**
 * Hook for deploying new Unlock Protocol locks
 * 
 * @example
 * ```typescript
 * const { deployLock, isLoading, error, isSuccess } = useDeployLock();
 * 
 * const handleDeploy = async () => {
 *   const result = await deployLock({
 *     name: "My Lock",
 *     expirationDuration: 31536000n, // 1 year in seconds
 *     tokenAddress: "0x0000000000000000000000000000000000000000", // ETH
 *     keyPrice: parseEther("0.01"),
 *     maxNumberOfKeys: 1000n,
 *   });
 *   
 *   if (result.success) {
 *     console.log("Lock deployed at:", result.lockAddress);
 *   }
 * };
 * ```
 */
export const useDeployLock = () => {
  const wallet = usePrivyWriteWallet();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const deployLock = useCallback(
    async (params: LockDeploymentParams): Promise<LockDeploymentResult> => {
      if (!wallet) {
        const error = "Wallet not connected";
        setState(prev => ({ ...prev, error }));
        return { success: false, error };
      }

      setState({ isLoading: true, error: null, isSuccess: false });

      try {
        // Create fresh viem clients
        const { walletClient, publicClient } = await createViemFromPrivyWallet(
          wallet,
        );

        const userAddress = getAddress(wallet.address as Address);
        const walletAccount = walletClient.account ?? userAddress;
        const walletChain = walletClient.chain;
        const chainId = await publicClient.getChainId();

        // Get factory address for current chain (automatically resolves based on chain ID)
        const factoryAddress = getAddress(requireUnlockFactoryAddress(chainId) as Address);
        
        log.debug("Deploying lock", { 
          chainId, 
          factoryAddress, 
          lockName: params.name 
        });

        const tokenAddress = getAddress(params.tokenAddress);

        // Encode initialization data
        const initData = encodeFunctionData({
          abi: ADDITIONAL_LOCK_ABI,
          functionName: "initialize",
          args: [
            userAddress, // _lockCreator
            params.expirationDuration, // _expirationDuration
            tokenAddress, // _tokenAddress
            params.keyPrice, // _keyPrice
            params.maxNumberOfKeys, // _maxNumberOfKeys
            params.name, // _lockName
          ],
        });

        // Deploy lock
        const deployTx = await walletClient.writeContract({
          address: factoryAddress,
          abi: UNLOCK_FACTORY_ABI,
          functionName: "createUpgradeableLockAtVersion",
          args: [
            initData,
            params.lockVersion || 14, // Default to version 14
          ],
          account: walletAccount,
          chain: walletChain,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: deployTx,
        });

        const lockAddress = extractLockAddressFromReceipt(
          receipt,
          userAddress,
        );

        if (!lockAddress) {
          log.warn("Failed to determine deployed lock address");
        }

        log.info("Lock deployment successful", {
          transactionHash: deployTx,
          lockAddress,
          name: params.name
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: deployTx,
          lockAddress: lockAddress as Address,
        };

      } catch (error: any) {
        const errorMsg = error.message || "Lock deployment failed";
        log.error("Lock deployment error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet]
  );

  return {
    deployLock,
    ...state,
  };
};
