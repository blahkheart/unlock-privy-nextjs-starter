import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { usePrivy } from "@privy-io/react-auth";
import { KeyPurchaseExample } from "@/components/KeyPurchaseExample";
import { WalletInfo } from "@/components/WalletInfo";
import { UnlockReadOperationsDemo } from "@/components/UnlockReadOperationsDemo";
import { DeployLockDemo } from "@/components/DeployLockDemo";
import { LockManagerDemo } from "@/components/LockManagerDemo";
import { getClientConfig } from "@/lib/blockchain/config";

/**
 * Examples page demonstrating the new hooks and utilities
 * Shows practical usage of:
 * - Smart wallet selection
 * - Advanced key purchase
 * - Wallet management
 * - Logging and error handling
 */
export default function ExamplesPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const chainConfig = getClientConfig();

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Examples · Unlock × Privy Starter</title>
      </Head>
      <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "2rem",
          paddingBottom: "1rem",
          borderBottom: "2px solid #E5E7EB"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <h1 style={{ fontSize: "2rem", fontWeight: "700", margin: 0 }}>
                Enhanced Features Examples
              </h1>
              <span style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: "#DBEAFE",
                color: "#1E40AF",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "600",
                border: "1px solid #93C5FD"
              }}>
                {chainConfig.name} (Chain {chainConfig.chainId})
              </span>
            </div>
            <p style={{ color: "#6B7280", fontSize: "0.875rem" }}>
              Signed in as: {user?.email?.address || user?.wallet?.address || "anonymous"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => router.push("/locks")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#F3F4F6",
                color: "#374151",
                border: "1px solid #D1D5DB",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Original Demo
            </button>
            <button
              onClick={logout}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#EF4444",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Introduction */}
        <div style={{
          padding: "1.5rem",
          backgroundColor: "#EEF2FF",
          border: "1px solid #C7D2FE",
          borderRadius: "0.5rem",
          marginBottom: "2rem",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "#4338CA" }}>
            🚀 What's New?
          </h2>
          <p style={{ marginBottom: "0.75rem", color: "#4338CA" }}>
            This page demonstrates the enhanced patterns and utilities copied from the p2einferno-app:
          </p>
          <ul style={{ marginLeft: "1.5rem", color: "#4338CA", lineHeight: "1.75" }}>
            <li><strong>Smart Wallet Selection:</strong> Automatically prioritizes external wallets over embedded ones</li>
            <li><strong>Lock Deployment:</strong> Deploy new Unlock Protocol locks with custom parameters</li>
            <li><strong>Lock Management:</strong> Add managers and grant keys to users</li>
            <li><strong>Advanced Key Purchase:</strong> Handles ERC20 approvals and comprehensive error handling</li>
            <li><strong>Structured Logging:</strong> Better debugging with sanitized, structured logs</li>
            <li><strong>Transaction Utilities:</strong> Extract token IDs and analyze receipts</li>
            <li><strong>Type Safety:</strong> Full TypeScript support throughout</li>
          </ul>
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "2rem",
          marginBottom: "2rem",
        }}>
          {/* Wallet Info Component */}
          <WalletInfo />

          {/* Key Purchase Example Component */}
          <KeyPurchaseExample />
        </div>

        {/* Deploy Lock Demo */}
        <div style={{ marginBottom: "2rem" }}>
          <DeployLockDemo />
        </div>

        {/* Lock Manager Demo */}
        <div style={{ marginBottom: "2rem" }}>
          <LockManagerDemo />
        </div>

        {/* Unlock Read Operations Demo */}
        <UnlockReadOperationsDemo />

        {/* Additional Info */}
        <div style={{
          marginTop: "2rem",
          padding: "1.5rem",
          backgroundColor: "#F0FDF4",
          border: "1px solid #86EFAC",
          borderRadius: "0.5rem",
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.75rem", color: "#166534" }}>
            📚 Learn More
          </h3>
          <p style={{ marginBottom: "0.5rem", color: "#166534" }}>
            Check out the following files to understand the implementation:
          </p>
          <ul style={{ marginLeft: "1.5rem", color: "#166534", lineHeight: "1.75", fontSize: "0.875rem" }}>
            <li><code>hooks/unlock/</code> - All Unlock Protocol hooks (read & write operations)</li>
            <li><code>hooks/useSmartWalletSelection.ts</code> - Smart wallet selection logic</li>
            <li><code>lib/blockchain/providers/privy-viem.ts</code> - Privy + Viem integration</li>
            <li><code>lib/blockchain/shared/transaction-utils.ts</code> - Transaction utilities</li>
            <li><code>lib/blockchain/shared/abi-definitions.ts</code> - Contract ABIs and addresses</li>
            <li><code>lib/utils/logger/</code> - Structured logging system</li>
          </ul>
        </div>

        {/* Environment Info */}
        <div style={{
          marginTop: "2rem",
          padding: "1rem",
          backgroundColor: "#FEF3C7",
          borderRadius: "0.375rem",
          fontSize: "0.75rem",
          color: "#92400E",
        }}>
          <strong>💡 Tip:</strong> Open your browser console to see structured logs in action. 
          Set <code>NEXT_PUBLIC_LOG_LEVEL=debug</code> in your <code>.env.local</code> for verbose logging.
        </div>
      </main>
    </>
  );
}
