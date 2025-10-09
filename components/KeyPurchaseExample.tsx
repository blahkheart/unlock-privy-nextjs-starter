import { useState } from "react";
import { useKeyPurchase } from "@/hooks/unlock";
import { useSmartWalletSelection } from "@/hooks/useSmartWalletSelection";
import { formatWalletAddress } from "@/lib/utils/wallet-address";
import { getLogger } from "@/lib/utils/logger";
import { ErrorMessage } from "./ui/ErrorMessage";

const log = getLogger("components:key-purchase-example");

/**
 * Example component demonstrating the advanced key purchase hook
 * Shows how to purchase Unlock Protocol keys with automatic ERC20 approval
 */
export function KeyPurchaseExample() {
  const wallet = useSmartWalletSelection();
  const { purchaseKey, isLoading, error, isSuccess } = useKeyPurchase();
  const [lockAddress, setLockAddress] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!lockAddress) {
      log.warn("Lock address is required");
      return;
    }

    log.info("Initiating key purchase", { lockAddress });
    const result = await purchaseKey({ lockAddress });

    if (result.success && result.transactionHash) {
      setLastTxHash(result.transactionHash);
      log.info("Purchase successful", {
        transactionHash: result.transactionHash,
        tokenIds: result.tokenIds,
      });
    }
  };

  return (
    <div style={{ 
      padding: "1.5rem", 
      border: "1px solid #E5E7EB", 
      borderRadius: "0.5rem",
      backgroundColor: "#F9FAFB",
      marginTop: "2rem"
    }}>
      <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "600" }}>
        🔑 Advanced Key Purchase
      </h3>
      
      {wallet ? (
        <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#6B7280" }}>
          Connected: {formatWalletAddress(wallet.address)}
        </p>
      ) : (
        <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#EF4444" }}>
          ⚠️ No wallet connected
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>Lock Address:</span>
          <input
            type="text"
            value={lockAddress}
            onChange={(e) => setLockAddress(e.target.value)}
            placeholder="0x..."
            style={{
              padding: "0.5rem",
              border: "1px solid #D1D5DB",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
            }}
          />
        </label>

        <button
          onClick={handlePurchase}
          disabled={!wallet || !lockAddress || isLoading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: wallet && lockAddress && !isLoading ? "#10B981" : "#9CA3AF",
            color: "white",
            borderRadius: "0.375rem",
            fontWeight: "600",
            cursor: wallet && lockAddress && !isLoading ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {isLoading ? "Processing..." : "Purchase Key"}
        </button>

        {error && (
          <ErrorMessage>
            ❌ {error}
          </ErrorMessage>
        )}

        {isSuccess && lastTxHash && (
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#D1FAE5",
            border: "1px solid #6EE7B7",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
            color: "#065F46",
          }}>
            ✅ Success! Transaction: {formatWalletAddress(lastTxHash)}
          </div>
        )}
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        backgroundColor: "#EEF2FF",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        color: "#4338CA",
      }}>
        <strong>Features:</strong>
        <ul style={{ marginTop: "0.5rem", marginLeft: "1.25rem" }}>
          <li>Automatic ERC20 token approval</li>
          <li>Smart wallet selection (prioritizes external wallets)</li>
          <li>Comprehensive error handling</li>
          <li>Transaction receipt parsing</li>
        </ul>
      </div>
    </div>
  );
}
