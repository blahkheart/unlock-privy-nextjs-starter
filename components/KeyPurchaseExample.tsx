import { useState, useEffect } from "react";
import { useKeyPurchase, useKeyPrice } from "@/hooks/unlock";
import { useSmartWalletSelection } from "@/hooks/useSmartWalletSelection";
import { formatWalletAddress } from "@/lib/utils/wallet-address";
import { getLogger } from "@/lib/utils/logger";
import { ErrorMessage } from "./ui/ErrorMessage";
import { SterumCheckoutButton } from "./SterumCheckoutButton";
import { formatEther, type Address } from "viem";

const log = getLogger("components:key-purchase-example");

/**
 * Example component demonstrating the advanced key purchase hook
 * Shows how to purchase Unlock Protocol keys with automatic ERC20 approval
 */
export function KeyPurchaseExample() {
  const wallet = useSmartWalletSelection();
  const { purchaseKey, isLoading, error, isSuccess } = useKeyPurchase();
  const { getKeyPrice } = useKeyPrice();
  const [lockAddress, setLockAddress] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [keyPrice, setKeyPrice] = useState<string>("");
  const [keyPriceLoading, setKeyPriceLoading] = useState(false);
  const [fiatTransactionId, setFiatTransactionId] = useState<string | null>(null);

  // Fetch key price when lock address changes
  useEffect(() => {
    if (lockAddress && wallet?.address) {
      setKeyPriceLoading(true);
      getKeyPrice(lockAddress as Address)
        .then((price) => {
          if (price) {
            setKeyPrice(formatEther(price));
          } else {
            setKeyPrice("");
          }
        })
        .catch((error) => {
          log.error("Failed to fetch key price", { error });
          setKeyPrice("");
        })
        .finally(() => {
          setKeyPriceLoading(false);
        });
    } else {
      setKeyPrice("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockAddress, wallet?.address]);

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

  const handleFiatPurchaseSuccess = (data: { transactionId: string; paymentLink: string }) => {
    setFiatTransactionId(data.transactionId);
    log.info("Fiat purchase initiated", { transactionId: data.transactionId });
  };

  const handleFiatPurchaseError = (error: string) => {
    log.error("Fiat purchase failed", { error });
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
        🔑 Key Purchase Options
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

      {/* Lock Address Input */}
      <div style={{ marginBottom: "1.5rem" }}>
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
        {lockAddress && keyPrice && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6B7280" }}>
            Key Price: {keyPrice} ETH
          </p>
        )}
      </div>

      {/* Purchase Options - Side by Side */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        marginBottom: "1rem"
      }}>
        {/* Direct Crypto Purchase */}
        <div style={{
          padding: "1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          backgroundColor: "#FFFFFF"
        }}>
          <h4 style={{ 
            fontSize: "0.875rem", 
            fontWeight: "600", 
            marginBottom: "0.75rem",
            color: "#10B981"
          }}>
            💰 Direct Crypto Purchase
          </h4>
          
          <button
            onClick={handlePurchase}
            disabled={!wallet || !lockAddress || isLoading}
            style={{
              width: "100%",
              padding: "0.75rem 1.5rem",
              backgroundColor: wallet && lockAddress && !isLoading ? "#10B981" : "#9CA3AF",
              color: "white",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: wallet && lockAddress && !isLoading ? "pointer" : "not-allowed",
              border: "none",
              fontSize: "0.875rem",
            }}
          >
            {isLoading ? "Processing..." : "Purchase with Crypto"}
          </button>

          {error && (
            <div style={{ marginTop: "0.75rem" }}>
              <ErrorMessage>
                ❌ {error}
              </ErrorMessage>
            </div>
          )}

          {isSuccess && lastTxHash && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#D1FAE5",
              border: "1px solid #6EE7B7",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
              color: "#065F46",
            }}>
              ✅ Success! Transaction: {formatWalletAddress(lastTxHash)}
            </div>
          )}
        </div>

        {/* Fiat Purchase */}
        <div style={{
          padding: "1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          backgroundColor: "#FFFFFF"
        }}>
          <h4 style={{ 
            fontSize: "0.875rem", 
            fontWeight: "600", 
            marginBottom: "0.75rem",
            color: "#8B5CF6"
          }}>
            💳 Fiat Payment (Stereum Pay)
          </h4>
          
          {lockAddress && wallet ? (
            <SterumCheckoutButton
              lockAddress={lockAddress}
              lockName={`Lock ${lockAddress.slice(0, 8)}...`}
              keyPrice={keyPrice || "Loading..."}
              currency="USDT"
              network="POLYGON"
              onSuccess={handleFiatPurchaseSuccess}
              onError={handleFiatPurchaseError}
              disabled={!lockAddress || keyPriceLoading}
            />
          ) : (
            <p style={{ 
              fontSize: "0.75rem", 
              color: "#6B7280", 
              textAlign: "center",
              padding: "0.5rem"
            }}>
              Enter lock address and connect wallet
            </p>
          )}

          {fiatTransactionId && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#DDD6FE",
              border: "1px solid #A78BFA",
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
              color: "#5B21B6",
            }}>
              ✅ Payment initiated! Transaction ID: {fiatTransactionId.slice(0, 8)}...
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
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
          <li><strong>Direct Purchase:</strong> Automatic ERC20 token approval, smart wallet selection, comprehensive error handling</li>
          <li><strong>Fiat Purchase:</strong> Pay with card (USDT/USDC/BOB), no crypto required, automatic key minting on payment</li>
        </ul>
      </div>
    </div>
  );
}
