import { useState } from "react";
import { useAddLockManager, useLockManagerKeyGrant } from "@/hooks/unlock";
import { type Address } from "viem";

export const LockManagerDemo = () => {
  const { addLockManager, isLoading: isAddingManager, error: addManagerError, isSuccess: addManagerSuccess } = useAddLockManager();
  const { grantKey, isLoading: isGrantingKey, error: grantKeyError, isSuccess: grantKeySuccess } = useLockManagerKeyGrant();

  // Add Manager State
  const [lockAddressForManager, setLockAddressForManager] = useState("");
  const [newManagerAddress, setNewManagerAddress] = useState("");
  const [addManagerTxHash, setAddManagerTxHash] = useState("");

  // Grant Key State
  const [lockAddressForGrant, setLockAddressForGrant] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [keyManagerAddress, setKeyManagerAddress] = useState("");
  const [grantKeyTxHash, setGrantKeyTxHash] = useState("");

  const handleAddManager = async () => {
    try {
      const result = await addLockManager({
        lockAddress: lockAddressForManager as Address,
        managerAddress: newManagerAddress as Address,
      });

      if (result.success && result.transactionHash) {
        setAddManagerTxHash(result.transactionHash);
      }
    } catch (err) {
      console.error("Add manager error:", err);
    }
  };

  const handleGrantKey = async () => {
    try {
      const result = await grantKey({
        lockAddress: lockAddressForGrant as Address,
        recipientAddress: recipientAddress as Address,
        keyManagers: [keyManagerAddress as Address],
      });

      if (result.success && result.transactionHash) {
        setGrantKeyTxHash(result.transactionHash);
      }
    } catch (err) {
      console.error("Grant key error:", err);
    }
  };

  return (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "1.5rem",
      backgroundColor: "#f8fafc",
    }}>
      <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>🔐 Lock Manager Operations</h2>
      <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
        Manage lock permissions and grant keys (requires lock manager role)
      </p>

      {/* Add Lock Manager Section */}
      <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "1px solid #e2e8f0" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Add Lock Manager</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Lock Address
            </label>
            <input
              type="text"
              value={lockAddressForManager}
              onChange={(e) => setLockAddressForManager(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              New Manager Address
            </label>
            <input
              type="text"
              value={newManagerAddress}
              onChange={(e) => setNewManagerAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <button
            onClick={handleAddManager}
            disabled={isAddingManager || !lockAddressForManager || !newManagerAddress}
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: isAddingManager ? "#94a3b8" : "#8b5cf6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isAddingManager ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {isAddingManager ? "Adding Manager..." : "Add Manager"}
          </button>

          {addManagerError && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              color: "#991b1b",
              fontSize: "0.875rem",
            }}>
              <strong>Error:</strong> {addManagerError}
            </div>
          )}

          {addManagerSuccess && addManagerTxHash && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#d1fae5",
              border: "1px solid #a7f3d0",
              borderRadius: "4px",
              color: "#065f46",
              fontSize: "0.875rem",
            }}>
              <div><strong>✅ Manager Added!</strong></div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Transaction:</strong>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {addManagerTxHash}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grant Key Section */}
      <div>
        <h3 style={{ fontSize: "1rem", marginBottom: "1rem" }}>Grant Key</h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Lock Address
            </label>
            <input
              type="text"
              value={lockAddressForGrant}
              onChange={(e) => setLockAddressForGrant(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Recipient Address
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
              Key Manager Address
            </label>
            <input
              type="text"
              value={keyManagerAddress}
              onChange={(e) => setKeyManagerAddress(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.875rem",
              }}
            />
            <small style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Who can manage this key (usually the recipient)
            </small>
          </div>

          <button
            onClick={handleGrantKey}
            disabled={isGrantingKey || !lockAddressForGrant || !recipientAddress || !keyManagerAddress}
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: isGrantingKey ? "#94a3b8" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isGrantingKey ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            {isGrantingKey ? "Granting Key..." : "Grant Key"}
          </button>

          {grantKeyError && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              color: "#991b1b",
              fontSize: "0.875rem",
            }}>
              <strong>Error:</strong> {grantKeyError}
            </div>
          )}

          {grantKeySuccess && grantKeyTxHash && (
            <div style={{
              padding: "0.75rem",
              backgroundColor: "#d1fae5",
              border: "1px solid #a7f3d0",
              borderRadius: "4px",
              color: "#065f46",
              fontSize: "0.875rem",
            }}>
              <div><strong>✅ Key Granted!</strong></div>
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Transaction:</strong>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {grantKeyTxHash}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
