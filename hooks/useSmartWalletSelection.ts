import { useMemo } from "react";
import { useWallets } from "@privy-io/react-auth";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("hooks:smart-wallet-selection");

/**
 * Smart wallet selection hook that prioritizes external wallets over embedded ones
 * Returns the best available wallet for blockchain operations
 *
 * Priority order:
 * 1. External wallet from useWallets (non-privy, like MetaMask)
 * 2. Injected wallet from useWallets
 * 3. Fallback to first available wallet (might be embedded)
 */
export const useSmartWalletSelection = () => {
  const { wallets } = useWallets();

  const selectedWallet = useMemo(() => {
    log.debug("Available wallets", { wallets });

    // Priority 1: External wallet from useWallets (non-privy)
    const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
    if (externalWallet) {
      log.info("✅ Found external wallet from useWallets", { externalWallet });
      return externalWallet;
    }

    // Priority 2: Injected wallet (like MetaMask) from useWallets
    const injectedWallet = wallets.find((w) => w.connectorType === "injected");
    if (injectedWallet) {
      log.info("✅ Found injected wallet from useWallets", { injectedWallet });
      return injectedWallet;
    }

    // Priority 3: Fallback to first available wallet (might be embedded)
    if (wallets.length > 0) {
      log.warn("⚠️ Falling back to first available wallet", {
        wallet: wallets[0],
      });
      return wallets[0];
    }

    log.info("❌ No wallets available");
    return null;
  }, [wallets]);

  return selectedWallet;
};
