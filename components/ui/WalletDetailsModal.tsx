import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { getClientConfig } from "@/lib/blockchain/config";
import { toast } from "@/lib/utils/toast";

interface WalletDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

// Icons as simple SVGs
const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
}) => {
  const { balances, loading, error, refreshBalances, networkName } =
    useWalletBalances({ enabled: isOpen });

  const config = getClientConfig();
  const shortAddress = `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 6)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success("Address copied to clipboard!");
  };

  const viewOnExplorer = () => {
    const explorerUrl = `${config.blockExplorer}/address/${walletAddress}`;
    window.open(explorerUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-orange-500">
            <WalletIcon />
            Wallet Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Network Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Network:</span>
            <span className="font-medium text-white">{networkName}</span>
          </div>

          {/* Address Section */}
          <Card className="p-4 bg-gray-800/50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wallet Address</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-8 w-8 p-0"
                    title="Copy Address"
                  >
                    <CopyIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={viewOnExplorer}
                    className="h-8 w-8 p-0"
                    title="View on Explorer"
                  >
                    <ExternalLinkIcon />
                  </Button>
                </div>
              </div>
              <div className="bg-gray-900/60 rounded p-3 font-mono text-xs sm:text-sm break-all">
                {walletAddress}
              </div>
            </div>
          </Card>

          {/* Balances Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Balances</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalances}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshIcon spinning={loading} />
              </Button>
            </div>

            {error ? (
              <div className="text-red-400 text-sm text-center py-4">
                {error}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ETH Balance */}
                <Card className="p-4 bg-gray-800/30">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold">
                      {loading ? (
                        <div className="w-16 h-4 bg-gray-700 animate-pulse rounded mx-auto" />
                      ) : (
                        balances.eth.formatted
                      )}
                    </div>
                    <div className="text-xs text-gray-400">ETH</div>
                  </div>
                </Card>

                {/* USDC Balance */}
                <Card className="p-4 bg-gray-800/30">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold">
                      {loading ? (
                        <div className="w-16 h-4 bg-gray-700 animate-pulse rounded mx-auto" />
                      ) : (
                        balances.usdc.formatted
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {balances.usdc.symbol}
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 order-2 sm:order-1"
            >
              Close
            </Button>
            <Button onClick={copyAddress} className="flex-1 order-1 sm:order-2">
              <CopyIcon />
              <span className="ml-2">Copy Address</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
