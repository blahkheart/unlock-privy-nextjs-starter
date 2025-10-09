"use client";

import { useCallback, useState } from "react";
import { useSmartWalletSelection } from "@/hooks/useSmartWalletSelection";
import { createViemFromPrivyWallet } from "@/lib/blockchain/providers/privy-viem";
import { COMPLETE_LOCK_ABI, ERC20_ABI } from "@/lib/blockchain/shared/abi-definitions";
import { extractTokenIdsFromReceipt } from "@/lib/blockchain/shared/transaction-utils";
import { getLogger } from "@/lib/utils/logger";
import { getAddress, zeroAddress, type Address, type Hex } from "viem";

const log = getLogger("hooks:key-purchase");

export interface KeyPurchaseParams {
  lockAddress: string;
  recipient?: string;
  keyManager?: string;
  referrer?: string;
  data?: string;
}

export interface KeyPurchaseResult {
  success: boolean;
  transactionHash?: string;
  tokenIds?: bigint[];
  error?: string;
}

export interface OperationState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Advanced hook for purchasing Unlock Protocol keys
 * Handles ERC20 token approvals, gas estimation, and transaction processing
 */
export const useKeyPurchase = () => {
  const wallet = useSmartWalletSelection();
  const [state, setState] = useState<OperationState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  const purchaseKey = useCallback(
    async (params: KeyPurchaseParams): Promise<KeyPurchaseResult> => {
      if (!wallet) {
        const error = "Wallet not connected";
        setState(prev => ({ ...prev, error }));
        return { success: false, error };
      }

      setState({ isLoading: true, error: null, isSuccess: false });

      try {
        // Fresh viem clients per operation
        const { walletClient, publicClient } = await createViemFromPrivyWallet(
          wallet,
        );

        const userAddress = getAddress(wallet.address as Address);
        const walletAccount = walletClient.account ?? userAddress;
        const walletChain = walletClient.chain;

        let lockAddress: Address;
        try {
          lockAddress = getAddress(params.lockAddress);
        } catch (addressError) {
          throw new Error("Invalid lock address provided");
        }

        const recipient = params.recipient
          ? getAddress(params.recipient)
          : userAddress;
        const keyManager = params.keyManager
          ? getAddress(params.keyManager)
          : recipient;
        const referrer = params.referrer
          ? getAddress(params.referrer)
          : zeroAddress;
        const data = (params.data || "0x") as Hex;

        log.info("Purchasing key", {
          lockAddress,
          recipient,
          keyManager,
          referrer,
        });

        // Get key price and token address
        const [keyPrice, tokenAddress] = await Promise.all([
          publicClient.readContract({
            address: lockAddress,
            abi: COMPLETE_LOCK_ABI,
            functionName: "keyPrice",
            args: [],
          }) as unknown as Promise<bigint>,
          publicClient.readContract({
            address: lockAddress,
            abi: COMPLETE_LOCK_ABI,
            functionName: "tokenAddress",
            args: [],
          }) as unknown as Promise<Address>,
        ]);

        log.info("Lock details retrieved", {
          keyPrice: keyPrice.toString(),
          tokenAddress,
        });

        // Handle token approval if needed (ERC20)
        const isETH = tokenAddress === zeroAddress;

        if (!isETH) {
          const allowance = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [userAddress, lockAddress],
          }) as bigint;

          if (allowance < keyPrice) {
            log.info("Approving token spend", { tokenAddress, keyPrice });
            const approveTx = await walletClient.writeContract({
              address: tokenAddress,
              abi: ERC20_ABI,
              functionName: "approve",
              args: [lockAddress, keyPrice],
              account: walletAccount,
              chain: walletChain,
            });
            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            log.info("Token approval successful", { transactionHash: approveTx });
          }
        }

        // Purchase key
        log.info("Initiating key purchase transaction");
        const purchaseTx = await walletClient.writeContract({
          address: lockAddress,
          abi: COMPLETE_LOCK_ABI,
          functionName: "purchase",
          args: [
            [keyPrice], // values
            [recipient], // recipients
            [referrer], // referrers
            [keyManager], // keyManagers
            [data], // data
          ],
          value: isETH ? keyPrice : 0n,
          account: walletAccount,
          chain: walletChain,
        });

        log.info("Waiting for transaction confirmation", {
          transactionHash: purchaseTx,
        });

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: purchaseTx,
        });

        const tokenIds = extractTokenIdsFromReceipt(receipt);

        log.info("Key purchase successful", {
          transactionHash: purchaseTx,
          recipient,
          lockAddress,
          tokenIds: tokenIds.map(id => id.toString()),
        });

        setState({ isLoading: false, error: null, isSuccess: true });

        return {
          success: true,
          transactionHash: purchaseTx,
          tokenIds,
        };

      } catch (error: any) {
        const errorMsg = error.message || "Key purchase failed";
        log.error("Key purchase error", { error, params });
        setState({ isLoading: false, error: errorMsg, isSuccess: false });
        return { success: false, error: errorMsg };
      }
    },
    [wallet]
  );

  return {
    purchaseKey,
    ...state,
  };
};
