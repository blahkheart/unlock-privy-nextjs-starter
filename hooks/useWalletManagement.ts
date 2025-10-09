import { useMemo, useState, useCallback } from "react";
import { getLogger } from "@/lib/utils/logger";
import {
  useUser,
  useCreateWallet as useCreateEthereumWallet,
  type WalletWithMetadata,
} from "@privy-io/react-auth";

const log = getLogger("hooks:wallet-management");

/**
 * Hook for managing wallet creation and detection
 * Provides utilities for creating embedded wallets and detecting external wallets
 */
export function useWalletManagement() {
  const { user } = useUser();
  const { createWallet: createEthereumWallet } = useCreateEthereumWallet();
  const [isCreating, setIsCreating] = useState(false);

  const ethereumEmbeddedWallets = useMemo<WalletWithMetadata[]>(
    () =>
      (user?.linkedAccounts.filter(
        (account) =>
          account.type === "wallet" &&
          account.walletClientType === "privy" &&
          account.chainType === "ethereum",
      ) as WalletWithMetadata[]) ?? [],
    [user],
  );

  const externalWallets = useMemo<WalletWithMetadata[]>(
    () =>
      (user?.linkedAccounts.filter(
        (account) =>
          account.type === "wallet" &&
          account.connectorType === "injected" &&
          account.chainType === "ethereum",
      ) as WalletWithMetadata[]) ?? [],
    [user],
  );

  const handleCreateWallet = useCallback(async () => {
    setIsCreating(true);
    try {
      await createEthereumWallet();
      log.info("Embedded wallet created successfully");
    } catch (error) {
      log.error("Error creating wallet:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [createEthereumWallet]);

  return {
    ethereumEmbeddedWallets,
    externalWallets,
    isCreating,
    handleCreateWallet,
  };
}
