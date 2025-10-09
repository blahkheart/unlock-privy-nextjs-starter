import { useEffect, useState } from "react";
import type React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import UnlockABI from "../abis/UnlockV14.json";
import PublicLockABI from "../abis/PublicLockV15.json";
import { getClientConfig } from "@/lib/blockchain/config";

/**
 * LocksPage - Elegant interface for Unlock Protocol contract interactions
 * Features glassmorphic design with Tailwind CSS
 */
export default function LocksPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const chainConfig = getClientConfig();

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

  // Minimal, glassy UI primitives for consistency
  const SectionCard: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ className, children }) => (
    <div
      className={[
        "mb-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_30px_-10px_rgba(0,0,0,0.6)]",
        className || "",
      ].join(" ")}
    >
      {children}
    </div>
  );

  const Label: React.FC<React.PropsWithChildren> = ({ children }) => (
    <label className="block text-[13px] font-medium text-gray-300 mb-1.5">{children}</label>
  );

  const inputBase =
    "w-full px-4 h-11 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-[15px] transition-all placeholder:text-gray-500";

  const TextField = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    mono = false,
  }: {
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    mono?: boolean;
  }) => (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        className={[inputBase, mono ? "font-mono text-sm" : ""].join(" ")}
      />
    </div>
  );

  return (
    <>
      <Head>
        <title>Manage Locks · Unlock × Privy</title>
      </Head>
      <main className="relative min-h-screen text-white">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f1a] via-[#0a0d17] to-[#070a12]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(600px 200px at 10% 0%, rgba(59,130,246,0.18) 0%, transparent 60%), radial-gradient(800px 300px at 120% 40%, rgba(168,85,247,0.15) 0%, transparent 70%)",
            }}
          />
          {/* subtle grain could be added via CSS if desired */}
        </div>
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          {/* Header */}
          <SectionCard className="mb-8 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Lock Management
                  </h1>
                  <span className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-full text-xs font-semibold border border-blue-500/20">
                    {chainConfig.name} (Chain {chainConfig.chainId})
                  </span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Signed in as: {user?.email?.address || user?.wallet?.address || "anonymous"}
                </p>
              </div>
              <button
                onClick={logout}
                className="h-10 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm"
              >
                Logout
              </button>
            </div>
          </SectionCard>

          {/* Status Notification */}
          {status && (
            <SectionCard className="p-4 border-blue-400/25 bg-blue-500/10">
              <p className="text-blue-200 text-sm">{status}</p>
            </SectionCard>
          )}

          {/* Create Lock Section */}
          <SectionCard className="p-5 sm:p-6">
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
                  className="h-11 px-5 rounded-lg border border-blue-400/30 bg-blue-500/10 hover:bg-blue-500/20 transition-colors font-medium"
                >
                  Create Lock
                </button>
                <button
                  onClick={handleCreateUpgradeableLock}
                  className="h-11 px-5 rounded-lg border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors font-medium"
                >
                  Create Upgradeable (v{lockVersion})
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Update Lock Section */}
          <SectionCard className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Update Lock
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mb-4">You'll be prompted for the lock address when performing these actions.</p>
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
                  className="h-11 px-5 rounded-lg border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors font-medium"
                >
                  Update Pricing
                </button>
                <button
                  onClick={handleUpdateLockConfig}
                  className="h-11 px-5 rounded-lg border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition-colors font-medium"
                >
                  Update Config
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Grant Keys Section */}
          <SectionCard className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Grant Keys
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm mb-4">Enter comma-separated values for recipients, expirations, and managers.</p>
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
                className="h-11 px-5 rounded-lg border border-green-400/30 bg-green-500/10 hover:bg-green-500/20 transition-colors font-medium"
              >
                Grant Keys
              </button>
            </div>
          </SectionCard>

          {/* Extend Membership Section */}
          <SectionCard className="p-5 sm:p-6">
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
                  className="h-11 px-5 rounded-lg border border-yellow-400/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors font-medium"
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
                  className="h-11 px-5 rounded-lg border border-yellow-400/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors font-medium"
                >
                  Grant Extension
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Lend/Unlend Section */}
          <SectionCard className="p-5 sm:p-6 mb-10">
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
                  className="h-11 px-5 rounded-lg border border-pink-400/30 bg-pink-500/10 hover:bg-pink-500/20 transition-colors font-medium"
                >
                  Lend Key
                </button>
                <button
                  onClick={handleUnlendKey}
                  className="h-11 px-5 rounded-lg border border-pink-400/30 bg-pink-500/10 hover:bg-pink-500/20 transition-colors font-medium"
                >
                  Unlend Key
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </main>
    </>
  );
}
