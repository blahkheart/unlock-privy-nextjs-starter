/**
 * Privy + Viem Integration
 * Client-side Privy wallet integration for viem wallet clients
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  type WalletClient,
  http,
} from "viem";
import { type ConnectedWallet } from "@privy-io/react-auth";
import { getClientConfig } from "../config";
import { createPublicClientUnified } from "../config/clients/public-client";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("blockchain:privy-viem");

/**
 * Combined wallet and public client from Privy wallet
 * Returns wallet client and public client for blockchain operations
 */
export async function createViemFromPrivyWallet(
  wallet: ConnectedWallet,
): Promise<{
  walletClient: WalletClient;
  publicClient: ReturnType<typeof createPublicClientUnified>;
}> {
  if (!wallet || !wallet.address) {
    throw new Error("No wallet provided or wallet not connected");
  }

  log.info("Creating viem client from Privy wallet", {
    address: wallet.address,
    walletClientType: wallet.walletClientType,
    connectorType: wallet.connectorType,
  });

  const config = getClientConfig();

  // Switch to the app's configured chain if needed
  if (wallet.chainId !== `eip155:${config.chainId}`) {
    log.info("Switching wallet to correct chain", {
      currentChain: wallet.chainId,
      targetChain: `eip155:${config.chainId}`,
    });

    try {
      await wallet.switchChain(config.chainId);
    } catch (error) {
      log.error("Failed to switch chain", { error, targetChain: config.chainId });
      throw new Error(`Failed to switch to chain ${config.chainId}`);
    }
  }

  // Get EIP1193 provider from Privy wallet
  let provider: any;
  try {
    provider = await wallet.getEthereumProvider();
  } catch (error) {
    log.error("Failed to get Ethereum provider from wallet", { error });
    throw new Error("Failed to get Ethereum provider from wallet");
  }

  if (!provider) {
    throw new Error("No provider available for wallet");
  }

  // Create wallet client and public client
  try {
    // Create public client for read operations
    const publicClient = createPublicClientUnified();

    // Create wallet client for write operations
    const walletClient = createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: publicClient.chain,
      transport: custom(provider),
    });

    log.info("Viem clients created successfully", {
      address: wallet.address,
      chainId: config.chainId,
    });

    return { walletClient, publicClient };
  } catch (error) {
    log.error("Failed to create viem clients", { error });
    throw new Error("Failed to create viem clients from Privy wallet");
  }
}
