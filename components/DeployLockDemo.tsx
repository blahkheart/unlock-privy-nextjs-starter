import { useState } from "react";
import { useDeployLock } from "@/hooks/unlock";
import { parseEther, zeroAddress, type Address } from "viem";

export const DeployLockDemo = () => {
  const { deployLock, isLoading, error, isSuccess } = useDeployLock();
  const [lockName, setLockName] = useState("My Lock");
  const [keyPrice, setKeyPrice] = useState("0.01");
  const [maxKeys, setMaxKeys] = useState("1000");
  const [duration, setDuration] = useState("31536000"); // 1 year in seconds
  const [result, setResult] = useState<{ txHash?: string; lockAddress?: string } | null>(null);

  const handleDeploy = async () => {
    try {
      const deployResult = await deployLock({
        name: lockName,
        expirationDuration: BigInt(duration),
        tokenAddress: zeroAddress, // ETH
        keyPrice: parseEther(keyPrice),
        maxNumberOfKeys: BigInt(maxKeys),
      });

      if (deployResult.success) {
        setResult({
          txHash: deployResult.transactionHash,
          lockAddress: deployResult.lockAddress,
        });
      }
    } catch (err) {
      console.error("Deploy error:", err);
    }
  };

  return (
    <div style={{
      border: "1px solid #e2e8f0",
      borderRadius: "8px",
      padding: "1.5rem",
      backgroundColor: "#f8fafc",
    }}>
      <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>🏗️ Deploy Lock</h2>
      <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1rem" }}>
        Create a new Unlock Protocol lock contract
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Lock Name
          </label>
          <input
            type="text"
            value={lockName}
            onChange={(e) => setLockName(e.target.value)}
            placeholder="My Lock"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Key Price (ETH)
          </label>
          <input
            type="text"
            value={keyPrice}
            onChange={(e) => setKeyPrice(e.target.value)}
            placeholder="0.01"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Max Keys
          </label>
          <input
            type="text"
            value={maxKeys}
            onChange={(e) => setMaxKeys(e.target.value)}
            placeholder="1000"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
            Duration (seconds)
          </label>
          <input
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="31536000"
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
            }}
          />
          <small style={{ fontSize: "0.75rem", color: "#64748b" }}>
            31536000 = 1 year, 2592000 = 30 days
          </small>
        </div>

        <button
          onClick={handleDeploy}
          disabled={isLoading || !lockName}
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: isLoading ? "#94a3b8" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: 500,
          }}
        >
          {isLoading ? "Deploying..." : "Deploy Lock"}
        </button>

        {error && (
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "4px",
            color: "#991b1b",
            fontSize: "0.875rem",
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {isSuccess && result && (
          <div style={{
            padding: "0.75rem",
            backgroundColor: "#d1fae5",
            border: "1px solid #a7f3d0",
            borderRadius: "4px",
            color: "#065f46",
            fontSize: "0.875rem",
          }}>
            <div><strong>✅ Lock Deployed!</strong></div>
            {result.lockAddress && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Lock Address:</strong>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {result.lockAddress}
                </div>
              </div>
            )}
            {result.txHash && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Transaction:</strong>
                <div style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {result.txHash}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
