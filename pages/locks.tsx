import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { usePrivy, useWallets, toViemAccount } from "@privy-io/react-auth";
import { ethers } from "ethers";
// Import the ABIs for Unlock (factory) and PublicLock contracts.  These were
// extracted from the Unlock Protocol NPM package and bundled in the `abis`
// directory.  Each file contains only the `abi` array from the compiled
// artifact.
import UnlockABI from "../abis/UnlockV14.json";
import PublicLockABI from "../abis/PublicLockV15.json";

/**
 * LocksPage provides a simple interface for interacting with the Unlock Protocol
 * contracts after a user has authenticated with Privy.  It shows how to:
 *
 *  - Instantiate `ethers` providers and signers from Privy wallets
 *    (see docs for obtaining an Ethers provider【13798773557552†L207-L221】)
 *  - Deploy a new lock via `createLock` or `createUpgradeableLockAtVersion`【176988022041719†L63-L94】
 *  - Update lock configuration and pricing【130131594066044†L70-L98】
 *  - Grant keys, extend memberships, and manage lending【130131594066044†L193-L205】【130131594066044†L246-L262】【130131594066044†L579-L588】
 *
 * Note that this page is deliberately minimal to serve as a template.  In a
 * production app you may want to add form validation, status indicators and
 * better error handling.
 */
export default function LocksPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();

  // Local state to track connected signer and contracts
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [unlockContract, setUnlockContract] = useState<ethers.Contract | null>(null);

  // Lock creation form inputs
  const [lockName, setLockName] = useState("Example Lock");
  const [expirationDuration, setExpirationDuration] = useState("2592000"); // 30 days
  const [tokenAddress, setTokenAddress] = useState("0x0000000000000000000000000000000000000000");
  const [keyPrice, setKeyPrice] = useState("10000000000000000"); // 0.01 ETH in wei
  const [maxNumberOfKeys, setMaxNumberOfKeys] = useState("100");
  const [lockVersion, setLockVersion] = useState("15");
  const [status, setStatus] = useState<string | null>(null);

  // Update pricing/config inputs
  const [newPrice, setNewPrice] = useState("20000000000000000"); // 0.02 ETH in wei
  const [newExpirationDuration, setNewExpirationDuration] = useState("2592000");
  const [newMaxNumberOfKeys, setNewMaxNumberOfKeys] = useState("200");
  const [newMaxKeysPerAccount, setNewMaxKeysPerAccount] = useState("1");

  // Grant keys inputs
  const [recipients, setRecipients] = useState("");
  const [expirationTimestamps, setExpirationTimestamps] = useState("");
  const [keyManagers, setKeyManagers] = useState("");

  // Extend/lend/unlend inputs
  const [tokenId, setTokenId] = useState("");
  const [duration, setDuration] = useState("3600"); // 1 hour
  const [extendValue, setExtendValue] = useState("0");
  const [referrer, setReferrer] = useState("0x0000000000000000000000000000000000000000");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");

  // Obtain the Unlock factory address from environment variables.  You must
  // configure this in `.env.local` (e.g. NEXT_PUBLIC_UNLOCK_ADDRESS=0x...)
  const unlockAddress = process.env.NEXT_PUBLIC_UNLOCK_ADDRESS;

  // When the component mounts or when wallets change, derive an ethers signer
  useEffect(() => {
    const initSigner = async () => {
      if (!ready || !authenticated) return;
      if (!wallets || wallets.length === 0) return;
      try {
        // Use the first connected wallet.  You can present a selector to
        // the user if multiple wallets are connected.
        const wallet = wallets[0];
        // Ensure the wallet is on the correct network; optionally call
        // wallet.switchChain(chainId) here.
        const privyProvider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(privyProvider);
        const signer = await ethersProvider.getSigner();
        setSigner(signer);
        if (unlockAddress) {
          const unlock = new ethers.Contract(unlockAddress, (UnlockABI as any).abi || (UnlockABI as any), signer);
          setUnlockContract(unlock);
        }
      } catch (error) {
        console.error("Error getting signer", error);
      }
    };
    initSigner();
  }, [ready, authenticated, wallets, unlockAddress]);

  // Redirect unauthenticated users to login page
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  /**
   * Helper: encode the initialize function for a new lock.  This function
   * encodes the call to `initialize(address,uint256,address,uint256,uint256,string)`
   * using the PublicLock ABI.  It returns a hex string that can be passed to
   * `createUpgradeableLockAtVersion` or `createUpgradeableLock` on the Unlock
   * contract【176988022041719†L63-L94】.
   */
  const encodeInitialize = (
    creator: string,
    expiration: bigint,
    token: string,
    price: bigint,
    maxKeys: bigint,
    name: string
  ) => {
    const iface = new ethers.Interface((PublicLockABI as any).abi || (PublicLockABI as any));
    return iface.encodeFunctionData("initialize", [creator, expiration, token, price, maxKeys, name]);
  };

  /**
   * Deploy a new upgradeable lock at a specific version.  This uses the
   * `createUpgradeableLockAtVersion` function on the Unlock contract【176988022041719†L63-L94】.
   */
  const handleCreateUpgradeableLock = async () => {
    if (!unlockContract || !signer) return;
    try {
      setStatus("Deploying upgradeable lock...");
      const creator = await signer.getAddress();
      const calldata = encodeInitialize(
        creator,
        BigInt(expirationDuration),
        tokenAddress,
        BigInt(keyPrice),
        BigInt(maxNumberOfKeys),
        lockName
      );
      const tx = await unlockContract.createUpgradeableLockAtVersion(calldata, BigInt(lockVersion));
      await tx.wait();
      setStatus(`Lock deployed at tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error deploying lock");
    }
  };

  /**
   * Deploy a new lock using the `createLock` helper (legacy).  This will deploy
   * a lock using the current PublicLock version【176988022041719†L107-L118】.  Note that
   * `createLock` includes a `_salt` argument in the contract interface which is
   * not used anymore; we pass a zero value.
   */
  const handleCreateLock = async () => {
    if (!unlockContract || !signer) return;
    try {
      setStatus("Deploying lock...");
      const tx = await unlockContract.createLock(
        BigInt(expirationDuration),
        tokenAddress,
        BigInt(keyPrice),
        BigInt(maxNumberOfKeys),
        lockName,
        ethers.toBeHex(0)
      );
      await tx.wait();
      setStatus(`Lock deployed at tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error deploying lock");
    }
  };

  /**
   * Update the key price of a lock by calling `updateKeyPricing`【130131594066044†L70-L80】.  The
   * user must be a lock manager on the lock.  The lock address should be
   * provided by the user.  For demonstration purposes we prompt for the
   * address via `prompt()`.  In a full UI you would manage this through
   * state.
   */
  const handleUpdateKeyPricing = async () => {
    const lockAddress = prompt("Enter the lock address to update pricing:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Updating key pricing...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const tx = await lock.updateKeyPricing(BigInt(newPrice), tokenAddress);
      await tx.wait();
      setStatus(`Key price updated in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error updating pricing");
    }
  };

  /**
   * Update lock configuration via `updateLockConfig`【130131594066044†L90-L103】.
   */
  const handleUpdateLockConfig = async () => {
    const lockAddress = prompt("Enter the lock address to update config:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Updating lock config...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const tx = await lock.updateLockConfig(
        BigInt(newExpirationDuration),
        BigInt(newMaxNumberOfKeys),
        BigInt(newMaxKeysPerAccount)
      );
      await tx.wait();
      setStatus(`Config updated in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error updating lock config");
    }
  };

  /**
   * Grant keys to a list of recipients by calling `grantKeys`【130131594066044†L193-L197】.
   */
  const handleGrantKeys = async () => {
    const lockAddress = prompt("Enter the lock address to grant keys on:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Granting keys...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const recipientsArray = recipients.split(",").map((addr) => addr.trim());
      const expirationArray = expirationTimestamps
        .split(",")
        .map((ts) => (ts.trim() ? BigInt(ts.trim()) : BigInt(0)));
      const managersArray = keyManagers.split(",").map((addr) => addr.trim());
      const tx = await lock.grantKeys(recipientsArray, expirationArray, managersArray);
      await tx.wait();
      setStatus(`Keys granted in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error granting keys");
    }
  };

  /**
   * Extend an existing key via the `extend` function【130131594066044†L246-L262】.  This will
   * charge the caller `_value` tokens (ETH or ERC‑20 depending on lock
   * configuration).  For ERC‑20 locks you may need to approve spending ahead of
   * time.
   */
  const handleExtend = async () => {
    const lockAddress = prompt("Enter the lock address to extend a key on:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Extending key...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const tx = await lock.extend(BigInt(extendValue), BigInt(tokenId), referrer, "0x");
      await tx.wait();
      setStatus(`Key extended in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error extending key");
    }
  };

  /**
   * Lend a key by calling `lendKey`【130131594066044†L579-L588】.  The caller must be the
   * key manager of the token.  Ownership is transferred to `toAddress` while
   * retaining management rights.
   */
  const handleLendKey = async () => {
    const lockAddress = prompt("Enter the lock address to lend a key on:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Lending key...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const tx = await lock.lendKey(fromAddress, toAddress, BigInt(tokenId));
      await tx.wait();
      setStatus(`Key lent in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error lending key");
    }
  };

  /**
   * Unlend a key by calling `unlendKey`【130131594066044†L579-L588】.  The caller must be
   * the key manager.  Ownership is returned to `toAddress`.
   */
  const handleUnlendKey = async () => {
    const lockAddress = prompt("Enter the lock address to unlend a key on:");
    if (!signer || !lockAddress) return;
    try {
      setStatus("Unlending key...");
      const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
      const tx = await lock.unlendKey(toAddress, BigInt(tokenId));
      await tx.wait();
      setStatus(`Key ownership returned in tx ${tx.hash}`);
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || "Error unlending key");
    }
  };

  return (
    <>
      <Head>
        <title>Manage Locks · Unlock × Privy Starter</title>
      </Head>
      <main style={{ padding: "1rem", maxWidth: "800px", margin: "0 auto" }}>
        <h1>Unlock × Privy Starter – Lock Management</h1>
        <p>
          Signed in as: {user?.email?.address || user?.wallet?.address || "anonymous"}
        </p>
        <button onClick={logout} style={{ marginBottom: "1rem" }}>Logout</button>
        {status && (
          <p style={{ padding: "0.5rem", backgroundColor: "#F3F4F6", borderRadius: "0.25rem" }}>{status}</p>
        )}
        {/* Create Lock Section */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Create a New Lock</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>
              Name:
              <input value={lockName} onChange={(e) => setLockName(e.target.value)} />
            </label>
            <label>
              Expiration (seconds):
              <input value={expirationDuration} onChange={(e) => setExpirationDuration(e.target.value)} />
            </label>
            <label>
              Currency (ERC‑20 address or 0x0 for ETH):
              <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} />
            </label>
            <label>
              Key price (wei):
              <input value={keyPrice} onChange={(e) => setKeyPrice(e.target.value)} />
            </label>
            <label>
              Maximum number of keys:
              <input value={maxNumberOfKeys} onChange={(e) => setMaxNumberOfKeys(e.target.value)} />
            </label>
            <label>
              Lock version (for upgradeable locks):
              <input value={lockVersion} onChange={(e) => setLockVersion(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={handleCreateLock}>Create Lock</button>
              <button onClick={handleCreateUpgradeableLock}>Create Upgradeable Lock</button>
            </div>
          </div>
        </section>
        {/* Update Section */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Update Lock</h2>
          <p>You will be prompted for the lock address when performing these actions.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>
              New key price (wei):
              <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            </label>
            <button onClick={handleUpdateKeyPricing}>Update Key Pricing</button>
            <label>
              New expiration (seconds):
              <input value={newExpirationDuration} onChange={(e) => setNewExpirationDuration(e.target.value)} />
            </label>
            <label>
              New max number of keys:
              <input value={newMaxNumberOfKeys} onChange={(e) => setNewMaxNumberOfKeys(e.target.value)} />
            </label>
            <label>
              New max keys per account:
              <input value={newMaxKeysPerAccount} onChange={(e) => setNewMaxKeysPerAccount(e.target.value)} />
            </label>
            <button onClick={handleUpdateLockConfig}>Update Lock Config</button>
          </div>
        </section>
        {/* Grant Section */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Grant Keys</h2>
          <p>Enter arrays of recipients, expirations and managers separated by commas.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>
              Recipients:
              <input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="0x1234...,0x5678..." />
            </label>
            <label>
              Expiration timestamps (Unix seconds or 0 for default):
              <input value={expirationTimestamps} onChange={(e) => setExpirationTimestamps(e.target.value)} placeholder="0,0" />
            </label>
            <label>
              Key managers (optional):
              <input value={keyManagers} onChange={(e) => setKeyManagers(e.target.value)} placeholder="0x0,0x0" />
            </label>
            <button onClick={handleGrantKeys}>Grant Keys</button>
          </div>
        </section>
        {/* Extend Section */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Extend Membership</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>
              Token ID:
              <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
            </label>
            <label>
              Amount to pay (wei) – set to 0 for default pricing:
              <input value={extendValue} onChange={(e) => setExtendValue(e.target.value)} />
            </label>
            <label>
              Referrer (optional):
              <input value={referrer} onChange={(e) => setReferrer(e.target.value)} />
            </label>
            <button onClick={handleExtend}>Extend Key</button>
            <label>
              Duration to grant (seconds) – for free extensions via `grantKeyExtension`:
              <input value={duration} onChange={(e) => setDuration(e.target.value)} />
            </label>
            <button
              onClick={async () => {
                const lockAddress = prompt("Enter the lock address to grant a key extension:");
                if (!signer || !lockAddress) return;
                try {
                  setStatus("Granting key extension...");
                  const lock = new ethers.Contract(lockAddress, (PublicLockABI as any).abi || (PublicLockABI as any), signer);
                  const tx = await lock.grantKeyExtension(BigInt(tokenId), BigInt(duration));
                  await tx.wait();
                  setStatus(`Key extension granted in tx ${tx.hash}`);
                } catch (err: any) {
                  console.error(err);
                  setStatus(err.message || "Error granting extension");
                }
              }}
            >
              Grant Key Extension
            </button>
          </div>
        </section>
        {/* Lend / Unlend Section */}
        <section style={{ marginTop: "2rem" }}>
          <h2>Lend / Unlend a Key</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label>
              Token ID:
              <input value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
            </label>
            <label>
              From (current owner address):
              <input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} />
            </label>
            <label>
              To (recipient address):
              <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
            </label>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={handleLendKey}>Lend Key</button>
              <button onClick={handleUnlendKey}>Unlend Key</button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}