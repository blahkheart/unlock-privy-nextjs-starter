import { useSmartWalletSelection } from "@/hooks/useSmartWalletSelection";
import { useWalletManagement } from "@/hooks/useWalletManagement";
import { useDetectConnectedWalletAddress } from "@/hooks/useDetectConnectedWalletAddress";
import { formatWalletAddress } from "@/lib/utils/wallet-address";
import { useUser } from "@privy-io/react-auth";

/**
 * Component that displays wallet information using the new hooks
 * Demonstrates smart wallet selection and wallet management
 */
export function WalletInfo() {
  const { user } = useUser();
  const selectedWallet = useSmartWalletSelection();
  const { walletAddress } = useDetectConnectedWalletAddress(user);
  const { ethereumEmbeddedWallets, externalWallets, handleCreateWallet, isCreating } = useWalletManagement();

  return (
    <div style={{
      padding: "1.5rem",
      border: "1px solid #E5E7EB",
      borderRadius: "0.5rem",
      backgroundColor: "#F9FAFB",
      marginTop: "2rem"
    }}>
      <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "600" }}>
        👛 Wallet Information
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Selected Wallet */}
        <div>
          <p style={{ fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.25rem" }}>
            Selected Wallet:
          </p>
          {selectedWallet ? (
            <div style={{ fontSize: "0.875rem", color: "#059669" }}>
              ✅ {formatWalletAddress(selectedWallet.address)}
              <span style={{ marginLeft: "0.5rem", color: "#6B7280" }}>
                ({selectedWallet.walletClientType || selectedWallet.connectorType})
              </span>
            </div>
          ) : (
            <p style={{ fontSize: "0.875rem", color: "#DC2626" }}>
              ❌ No wallet selected
            </p>
          )}
        </div>

        {/* Detected Address */}
        <div>
          <p style={{ fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.25rem" }}>
            Detected Address:
          </p>
          <p style={{ fontSize: "0.875rem", color: "#374151" }}>
            {walletAddress ? formatWalletAddress(walletAddress) : "None"}
          </p>
        </div>

        {/* Wallet Counts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}>
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#DBEAFE",
            borderRadius: "0.375rem",
          }}>
            <p style={{ fontSize: "0.75rem", color: "#1E40AF", marginBottom: "0.25rem" }}>
              Embedded Wallets
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1E3A8A" }}>
              {ethereumEmbeddedWallets.length}
            </p>
          </div>
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#D1FAE5",
            borderRadius: "0.375rem",
          }}>
            <p style={{ fontSize: "0.75rem", color: "#065F46", marginBottom: "0.25rem" }}>
              External Wallets
            </p>
            <p style={{ fontSize: "1.5rem", fontWeight: "700", color: "#064E3B" }}>
              {externalWallets.length}
            </p>
          </div>
        </div>

        {/* Create Wallet Button */}
        {ethereumEmbeddedWallets.length === 0 && (
          <button
            onClick={handleCreateWallet}
            disabled={isCreating}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: isCreating ? "#9CA3AF" : "#6366F1",
              color: "white",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: isCreating ? "not-allowed" : "pointer",
              border: "none",
              fontSize: "0.875rem",
            }}
          >
            {isCreating ? "Creating..." : "Create Embedded Wallet"}
          </button>
        )}
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        backgroundColor: "#FEF3C7",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        color: "#92400E",
      }}>
        <strong>Smart Wallet Selection:</strong> Automatically prioritizes external wallets (MetaMask, etc.) over embedded wallets for better UX.
      </div>
    </div>
  );
}
