import { useState, useEffect } from "react";
import { type User } from "@privy-io/react-auth";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("hooks:detect-connected-wallet-address");

/**
 * Hook that provides consistent wallet address detection across all components.
 *
 * Uses the same prioritization logic:
 * 1. Connected provider address (from window.ethereum)
 * 2. Privy user wallet address
 * 3. null if no wallet available
 *
 * This ensures all components are checking the exact same wallet address
 * and prevents auth inconsistencies.
 */
export function useDetectConnectedWalletAddress(user?: User | null) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  // Track connected wallet address via window.ethereum
  useEffect(() => {
    let isMounted = true;

    const readProviderAddress = async () => {
      if (typeof window === "undefined") return;

      try {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
          // No provider, fall back to Privy user wallet
          const privyAddress = user?.wallet?.address || null;
          if (isMounted) setConnectedAddress(privyAddress);
          return;
        }

        const accounts = await ethereum.request({ method: "eth_accounts" });
        const providerAddress = accounts?.[0] || null;

        if (isMounted) {
          setConnectedAddress(providerAddress || user?.wallet?.address || null);
        }
      } catch (error) {
        log.error("Error reading provider address", { error });
        if (isMounted) {
          setConnectedAddress(user?.wallet?.address || null);
        }
      }
    };

    readProviderAddress();

    // Listen for account changes
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (isMounted) {
          setConnectedAddress(accounts[0] || user?.wallet?.address || null);
        }
      };

      (window as any).ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        isMounted = false;
        (window as any).ethereum?.removeListener?.(
          "accountsChanged",
          handleAccountsChanged,
        );
      };
    }

    return () => {
      isMounted = false;
    };
  }, [user?.wallet?.address]);

  return {
    walletAddress: connectedAddress,
  };
}
