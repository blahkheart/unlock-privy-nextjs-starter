import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { formatEther, formatUnits } from "viem";
import { getLogger } from "@/lib/utils/logger";
import { createPublicClientUnified } from "@/lib/blockchain/config/clients/public-client";
import type { Address } from "viem";

const log = getLogger("hooks:useWalletBalances");

// USDC contract addresses per network
const USDC_ADDRESSES: Record<number, Address> = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Ethereum
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // Polygon
  42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Arbitrum
  10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Optimism
};

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface WalletBalance {
  eth: {
    balance: string;
    formatted: string;
    loading: boolean;
  };
  usdc: {
    balance: string;
    formatted: string;
    loading: boolean;
    symbol: string;
  };
}

interface UseWalletBalancesOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
}

export const useWalletBalances = (options: UseWalletBalancesOptions = {}) => {
  const { enabled = true, pollIntervalMs = 30000 } = options;
  const { user } = usePrivy();
  const [balances, setBalances] = useState<WalletBalance>({
    eth: { balance: "0", formatted: "0.0000", loading: true },
    usdc: { balance: "0", formatted: "0.00", loading: true, symbol: "USDC" },
  });
  const [error, setError] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address || null;

  useEffect(() => {
    if (!enabled || !walletAddress) {
      setBalances({
        eth: { balance: "0", formatted: "0.0000", loading: false },
        usdc: {
          balance: "0",
          formatted: "0.00",
          loading: false,
          symbol: "USDC",
        },
      });
      return;
    }

    const fetchBalances = async () => {
      try {
        setError(null);

        const client = createPublicClientUnified();
        const chainId = client.chain?.id || 84532;

        // Fetch ETH balance
        const ethBalance = await client.getBalance({
          address: walletAddress as Address,
        });

        let usdcBalance = 0n;
        let usdcSymbol = "USDC";

        // Fetch USDC balance if available for this chain
        const usdcAddress = USDC_ADDRESSES[chainId];
        if (usdcAddress) {
          try {
            usdcBalance = (await client.readContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [walletAddress as Address],
            })) as unknown as bigint;

            usdcSymbol = (await client.readContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "symbol",
              args: [],
            })) as unknown as string;
          } catch (usdcError) {
            log.warn("Error fetching USDC balance:", { error: usdcError });
          }
        }

        // Format balances
        const ethFormatted = formatEther(ethBalance);
        const usdcFormatted = formatUnits(usdcBalance, 6); // USDC has 6 decimals

        setBalances({
          eth: {
            balance: ethBalance.toString(),
            formatted: parseFloat(ethFormatted).toFixed(4),
            loading: false,
          },
          usdc: {
            balance: usdcBalance.toString(),
            formatted: parseFloat(usdcFormatted).toFixed(2),
            loading: false,
            symbol: usdcSymbol,
          },
        });
      } catch (err) {
        log.error("Error fetching wallet balances:", { error: err });
        setError("Failed to fetch balances");
        setBalances({
          eth: { balance: "0", formatted: "0.0000", loading: false },
          usdc: {
            balance: "0",
            formatted: "0.00",
            loading: false,
            symbol: "USDC",
          },
        });
      }
    };

    fetchBalances();

    // Refresh balances periodically
    const interval = setInterval(fetchBalances, pollIntervalMs);
    return () => clearInterval(interval);
  }, [walletAddress, enabled, pollIntervalMs]);

  const refreshBalances = async () => {
    if (!enabled || !walletAddress) return;

    setBalances((prev) => ({
      eth: { ...prev.eth, loading: true },
      usdc: { ...prev.usdc, loading: true },
    }));

    try {
      const client = createPublicClientUnified();
      const chainId = client.chain?.id || 84532;

      const ethBalance = await client.getBalance({
        address: walletAddress as Address,
      });

      let usdcBalance = 0n;
      let usdcSymbol = "USDC";

      const usdcAddress = USDC_ADDRESSES[chainId];
      if (usdcAddress) {
        try {
          const [balance, symbol] = await Promise.all([
            client.readContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [walletAddress as Address],
            }) as Promise<bigint>,
            client.readContract({
              address: usdcAddress,
              abi: ERC20_ABI,
              functionName: "symbol",
              args: [],
            }) as Promise<string>,
          ]);
          usdcBalance = balance as unknown as bigint;
          usdcSymbol = symbol as unknown as string;
        } catch (usdcError) {
          log.warn("Error fetching USDC balance during refresh:", {
            error: usdcError,
          });
        }
      }

      const ethFormatted = formatEther(ethBalance);
      const usdcFormatted = formatUnits(usdcBalance, 6);

      setBalances({
        eth: {
          balance: ethBalance.toString(),
          formatted: parseFloat(ethFormatted).toFixed(4),
          loading: false,
        },
        usdc: {
          balance: usdcBalance.toString(),
          formatted: parseFloat(usdcFormatted).toFixed(2),
          loading: false,
          symbol: usdcSymbol,
        },
      });
    } catch (err) {
      log.error("Error refreshing wallet balances:", { error: err });
      setError("Failed to refresh balances");
      setBalances((prev) => ({
        eth: { ...prev.eth, loading: false },
        usdc: { ...prev.usdc, loading: false },
      }));
    }
  };

  const client = createPublicClientUnified();
  const networkName = client.chain?.name || "Unknown Network";

  return {
    balances,
    loading: balances.eth.loading || balances.usdc.loading,
    error,
    refreshBalances,
    hasWallet: !!walletAddress,
    networkName,
  };
};
