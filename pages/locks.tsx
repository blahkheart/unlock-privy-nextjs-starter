import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import UnlockABI from "../abis/UnlockV14.json";
import PublicLockABI from "../abis/PublicLockV15.json";

/**
 * LocksPage - Elegant interface for Unlock Protocol contract interactions
 * Features glassmorphic design with Tailwind CSS
 */
export default function LocksPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();

  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [unlockContract, setUnlockContract] = useState<ethers.Contract | null>(null);

  // Lock creation form inputs
  const [lockName, setLockName] = useState("Example Lock");
  const [expirationDuration, setExpirationDuration] = useState("2592000");
  const [tokenAddress, setTokenAddress] = useState("0x0000000000000000000000000000000000000000");
  const [keyPrice, setKeyPrice] = useState("10000000000000000");
  const [maxNumberOfKeys, setMaxNumberOfKeys] = useState("100");
  const [lockVersion, setLockVersion] = useState("15");
  const [status, setStatus] = useState<string | null>(null);

  // Update pricing/config inputs
  const [newPrice, setNewPrice] = useState("20000000000000000");
  const [newExpirationDuration, setNewExpirationDuration] = useState("2592000");
  const [newMaxNumberOfKeys, setNewMaxNumberOfKeys] = useState("200");
  const [newMaxKeysPerAccount, setNewMaxKeysPerAccount] = useState("1");

  // Grant keys inputs
  const [recipients, setRecipients] = useState("");
  const [expirationTimestamps, setExpirationTimestamps] = useState("");
  const [keyManagers, setKeyManagers] = useState("");

  // Extend/lend/unlend inputs
  const [tokenId, setTokenId] = useState("");
  const [duration, setDuration] = useState("3600");
  const [extendValue, setExtendValue] = useState("0");
  const [referrer, setReferrer] = useState("0x0000000000000000000000000000000000000000");
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");

  const unlockAddress = process.env.NEXT_PUBLIC_UNLOCK_ADDRESS;

  useEffect(() => {
    const initSigner = async () => {
      if (!ready || !authenticated || !wallets || wallets.length === 0) return;
      try {
        const wallet = wallets[0];
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

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

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

  if (!ready || !authenticated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Manage Locks · Unlock × Privy</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  Lock Management
                </h1>
                <p className="text-gray-400 text-sm">
                  Signed in as: {user?.email?.address || user?.wallet?.address || "anonymous"}
                </p>
              </div>
              <button
                onClick={logout}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500/20 to-pink-500/20 hover:from-red-500/30 hover:to-pink-500/30 border border-red-500/30 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Status Notification */}
          {status && (
            <div className="mb-6 backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-lg animate-fade-in">
              <p className="text-blue-200 text-sm">{status}</p>
            </div>
          )}

          {/* Create Lock Section */}
          <div className="mb-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Create New Lock
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lock Name</label>
                  <input
                    value={lockName}
                    onChange={(e) => setLockName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                    placeholder="My Membership Lock"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Expiration (seconds)</label>
                  <input
                    value={expirationDuration}
                    onChange={(e) => setExpirationDuration(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                    placeholder="2592000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Currency Address</label>
                  <input
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                    placeholder="0x0 for ETH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Key Price (wei)</label>
                  <input
                    value={keyPrice}
                    onChange={(e) => setKeyPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                    placeholder="10000000000000000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Keys</label>
                  <input
                    value={maxNumberOfKeys}
                    onChange={(e) => setMaxNumberOfKeys(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lock Version</label>
                  <input
                    value={lockVersion}
                    onChange={(e) => setLockVersion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 backdrop-blur-sm transition-all"
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleCreateLock}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                >
                  Create Lock
                </button>
                <button
                  onClick={handleCreateUpgradeableLock}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                >
                  Create Upgradeable Lock
                </button>
              </div>
            </div>
          </div>

          {/* Update Lock Section */}
          <div className="mb-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Update Lock
            </h2>
            <p className="text-gray-400 text-sm mb-4">You'll be prompted for the lock address when performing these actions.</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Key Price (wei)</label>
                  <input
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Expiration (seconds)</label>
                  <input
                    value={newExpirationDuration}
                    onChange={(e) => setNewExpirationDuration(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Max Keys</label>
                  <input
                    value={newMaxNumberOfKeys}
                    onChange={(e) => setNewMaxNumberOfKeys(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Keys Per Account</label>
                  <input
                    value={newMaxKeysPerAccount}
                    onChange={(e) => setNewMaxKeysPerAccount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleUpdateKeyPricing}
                  className="px-6 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Update Pricing
                </button>
                <button
                  onClick={handleUpdateLockConfig}
                  className="px-6 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Update Config
                </button>
              </div>
            </div>
          </div>

          {/* Grant Keys Section */}
          <div className="mb-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Grant Keys
            </h2>
            <p className="text-gray-400 text-sm mb-4">Enter comma-separated values for recipients, expirations, and managers.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Recipients</label>
                <input
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                  placeholder="0x1234..., 0x5678..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expiration Timestamps</label>
                <input
                  value={expirationTimestamps}
                  onChange={(e) => setExpirationTimestamps(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 backdrop-blur-sm transition-all"
                  placeholder="0, 0 (0 for default)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Key Managers (optional)</label>
                <input
                  value={keyManagers}
                  onChange={(e) => setKeyManagers(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                  placeholder="0x0, 0x0"
                />
              </div>
              <button
                onClick={handleGrantKeys}
                className="px-6 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-all duration-200 font-medium"
              >
                Grant Keys
              </button>
            </div>
          </div>

          {/* Extend Membership Section */}
          <div className="mb-6 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              Extend Membership
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Token ID</label>
                  <input
                    value={tokenId}
                    onChange={(e) => setTokenId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (wei)</label>
                  <input
                    value={extendValue}
                    onChange={(e) => setExtendValue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 backdrop-blur-sm transition-all"
                    placeholder="0 for default"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Referrer (optional)</label>
                  <input
                    value={referrer}
                    onChange={(e) => setReferrer(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (seconds)</label>
                  <input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500/50 backdrop-blur-sm transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleExtend}
                  className="px-6 py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Extend Key
                </button>
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
                  className="px-6 py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Grant Extension
                </button>
              </div>
            </div>
          </div>

          {/* Lend/Unlend Section */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
              Lend / Unlend Key
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Token ID</label>
                <input
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 backdrop-blur-sm transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">From Address</label>
                  <input
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                    placeholder="Current owner"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">To Address</label>
                  <input
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/50 backdrop-blur-sm transition-all font-mono text-sm"
                    placeholder="Recipient"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleLendKey}
                  className="px-6 py-2.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Lend Key
                </button>
                <button
                  onClick={handleUnlendKey}
                  className="px-6 py-2.5 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 rounded-lg transition-all duration-200 font-medium"
                >
                  Unlend Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
