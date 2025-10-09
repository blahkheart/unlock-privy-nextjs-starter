import { useState } from "react";
import { useUnlockReadOperations } from "@/hooks/unlock";
import { formatWalletAddress } from "@/lib/utils/wallet-address";
import { formatEther, type Address } from "viem";

/**
 * Demo component showing Unlock Protocol read operations
 * Demonstrates checking key validity, lock manager status, and key pricing
 */
export function UnlockReadOperationsDemo() {
  const { hasValidKey, isLockManager, keyPrice, tokenAddress } = useUnlockReadOperations();
  
  const [lockAddress, setLockAddress] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [results, setResults] = useState<{
    hasKey?: boolean;
    keyInfo?: any;
    isManager?: boolean;
    price?: string;
    token?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  const handleCheckAll = async () => {
    if (!lockAddress || !userAddress) return;
    
    setLoading(true);
    setResults({});

    try {
      const [keyInfo, managerStatus, priceResult, tokenResult] = await Promise.all([
        hasValidKey.checkHasValidKey(userAddress as Address, lockAddress as Address),
        isLockManager.checkIsLockManager(userAddress as Address, lockAddress as Address),
        keyPrice.getKeyPrice(lockAddress as Address),
        tokenAddress.getTokenAddress(lockAddress as Address),
      ]);

      setResults({
        hasKey: keyInfo?.isValid || false,
        keyInfo: keyInfo ? {
          tokenId: keyInfo.tokenId.toString(),
          expiration: new Date(Number(keyInfo.expirationTimestamp) * 1000).toLocaleString(),
        } : null,
        isManager: managerStatus || false,
        price: priceResult ? formatEther(priceResult) : "N/A",
        token: tokenResult || "N/A",
      });
    } catch (error) {
      console.error("Error checking lock info:", error);
    } finally {
      setLoading(false);
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
        🔍 Unlock Read Operations
      </h3>

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

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>User Address:</span>
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
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
          onClick={handleCheckAll}
          disabled={!lockAddress || !userAddress || loading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: lockAddress && userAddress && !loading ? "#3B82F6" : "#9CA3AF",
            color: "white",
            borderRadius: "0.375rem",
            fontWeight: "600",
            cursor: lockAddress && userAddress && !loading ? "pointer" : "not-allowed",
            border: "none",
          }}
        >
          {loading ? "Checking..." : "Check Lock Info"}
        </button>

        {Object.keys(results).length > 0 && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            backgroundColor: "#EEF2FF",
            borderRadius: "0.375rem",
            fontSize: "0.875rem",
          }}>
            <h4 style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#4338CA" }}>
              Results:
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "#4338CA" }}>
              <div>
                <strong>Has Valid Key:</strong> {results.hasKey ? "✅ Yes" : "❌ No"}
              </div>
              {results.keyInfo && (
                <div style={{ marginLeft: "1rem", fontSize: "0.75rem" }}>
                  <div>Token ID: {results.keyInfo.tokenId}</div>
                  <div>Expires: {results.keyInfo.expiration}</div>
                </div>
              )}
              <div>
                <strong>Is Lock Manager:</strong> {results.isManager ? "✅ Yes" : "❌ No"}
              </div>
              <div>
                <strong>Key Price:</strong> {results.price} ETH
              </div>
              <div>
                <strong>Token Address:</strong> {results.token === "0x0000000000000000000000000000000000000000" ? "ETH (Native)" : formatWalletAddress(results.token)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        marginTop: "1rem",
        padding: "0.75rem",
        backgroundColor: "#DBEAFE",
        borderRadius: "0.375rem",
        fontSize: "0.75rem",
        color: "#1E40AF",
      }}>
        <strong>Available Operations:</strong>
        <ul style={{ marginTop: "0.5rem", marginLeft: "1.25rem" }}>
          <li>Check if user has a valid key</li>
          <li>Check if user is a lock manager</li>
          <li>Get current key price</li>
          <li>Get lock token address (ETH or ERC20)</li>
        </ul>
      </div>
    </div>
  );
}
