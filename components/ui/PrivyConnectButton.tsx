import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  CustomDropdown,
  CustomDropdownItem,
  CustomDropdownLabel,
  CustomDropdownSeparator,
} from "./CustomDropdown";
import { WalletDetailsModal } from "./WalletDetailsModal";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import { useDetectConnectedWalletAddress } from "@/hooks/useDetectConnectedWalletAddress";
import { formatWalletAddress } from "@/lib/utils/wallet-address";
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("PrivyConnectButton");

// Simple SVG Icons
const UserIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LogOutIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const UnlinkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const Avatar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full items-center justify-center bg-gray-700 ${className}`}
  >
    {children}
  </div>
);

export function PrivyConnectButton() {
  const {
    user,
    logout,
    linkEmail,
    linkFarcaster,
    unlinkWallet,
    linkWallet,
    login,
  } = usePrivy();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Use the consistent wallet address detection hook
  const { walletAddress } = useDetectConnectedWalletAddress(user);

  // Use the wallet balances hook
  const { balances, loading: balancesLoading } = useWalletBalances({
    enabled: isMenuOpen || showWalletModal,
  });

  // Format the wallet address consistently
  const shortAddress = formatWalletAddress(walletAddress);

  const handleViewWalletDetails = () => {
    setShowWalletModal(true);
  };

  if (!user) return null;

  const numAccounts = user.linkedAccounts?.length ?? 0;
  const canRemoveAccount = numAccounts > 1;

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLinkWallet = async () => {
    try {
      await linkWallet();
    } catch (error) {
      log.error("Failed to link wallet:", error);
    }
  };

  const handleUnlinkWallet = async () => {
    if (walletAddress) {
      try {
        await unlinkWallet(walletAddress);
      } catch (error) {
        log.error("Failed to unlink wallet:", error);
      }
    }
  };

  const handleRefreshConnection = async () => {
    setIsRefreshing(true);
    try {
      // Re-login to refresh the wallet connection
      await login();
    } catch (error) {
      log.error("Failed to refresh user:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const trigger = (
    <div className="relative h-10 w-auto pl-2 pr-4 rounded-full flex items-center space-x-2 hover:bg-gray-800 transition-colors">
      <Avatar>
        <UserIcon />
      </Avatar>
      <span className="text-sm font-medium">{shortAddress}</span>
    </div>
  );

  return (
    <>
      <CustomDropdown
        trigger={trigger}
        align="end"
        onOpenChange={setIsMenuOpen}
      >
        <CustomDropdownLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">My Wallet</p>
            <p className="text-xs leading-none text-gray-400">
              {shortAddress}
            </p>
          </div>
        </CustomDropdownLabel>

        {/* Balance Display */}
        {walletAddress && (
          <div className="px-4 py-2 border-b border-gray-700">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">ETH:</span>
                <span className="font-medium">
                  {balancesLoading ? (
                    <div className="w-12 h-3 bg-gray-700 animate-pulse rounded" />
                  ) : (
                    balances.eth.formatted
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">
                  {balances.usdc.symbol}:
                </span>
                <span className="font-medium">
                  {balancesLoading ? (
                    <div className="w-12 h-3 bg-gray-700 animate-pulse rounded" />
                  ) : (
                    balances.usdc.formatted
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Details */}
        {walletAddress && (
          <CustomDropdownItem onClick={handleViewWalletDetails}>
            <span className="mr-2"><EyeIcon /></span>
            <span>View Wallet Details</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownItem onClick={copyAddress}>
          <span className="mr-2"><CopyIcon /></span>
          <span>{copied ? "Copied!" : "Copy Address"}</span>
        </CustomDropdownItem>
        <CustomDropdownItem
          onClick={handleRefreshConnection}
          disabled={isRefreshing}
        >
          <span className="mr-2"><RefreshIcon spinning={isRefreshing} /></span>
          <span>{isRefreshing ? "Refreshing..." : "Refresh Connection"}</span>
        </CustomDropdownItem>
        <CustomDropdownSeparator />

        {/* Wallet Management Section */}
        <CustomDropdownItem onClick={handleLinkWallet}>
          <span className="mr-2"><PlusIcon /></span>
          <span>Link New Wallet</span>
        </CustomDropdownItem>

        {walletAddress && (
          <CustomDropdownItem
            onClick={handleUnlinkWallet}
            disabled={!canRemoveAccount}
          >
            <span className="mr-2"><UnlinkIcon /></span>
            <span>Unlink Wallet</span>
          </CustomDropdownItem>
        )}

        <CustomDropdownSeparator />

        {/* Account Linking Section */}
        {!user.email && (
          <CustomDropdownItem onClick={linkEmail}>
            <span className="mr-2"><MailIcon /></span>
            <span>Link Email</span>
          </CustomDropdownItem>
        )}
        {!user.farcaster && (
          <CustomDropdownItem onClick={linkFarcaster}>
            <span className="mr-2"><ExternalLinkIcon /></span>
            <span>Link Farcaster</span>
          </CustomDropdownItem>
        )}
        <CustomDropdownSeparator />
        <CustomDropdownItem onClick={logout}>
          <span className="mr-2"><LogOutIcon /></span>
          <span>Log out</span>
        </CustomDropdownItem>
      </CustomDropdown>

      {/* Wallet Details Modal */}
      {walletAddress && (
        <WalletDetailsModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          walletAddress={walletAddress}
        />
      )}
    </>
  );
}
