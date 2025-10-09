# Unlock × Privy Next.js Starter

This repository provides a **production-ready** Next.js project that demonstrates how to authenticate users with Privy and interact with Unlock Protocol smart contracts. It includes battle-tested patterns, hooks, and utilities for building robust membership‑based web3 applications.

## ✨ Features

### Core Features
- **Privy Authentication** – Users can log in via email, phone, OAuth or external wallets. An embedded wallet is automatically provisioned on sign‑in so that even non‑crypto users receive a wallet.

- **Unlock Protocol Integration** – Deploy new locks (upgradeable or default versions), update lock pricing/configuration, grant keys, extend memberships and lend/unlend keys.

- **Dual Library Support** – Use both Ethers.js v6 and Viem for blockchain interactions, with seamless Privy wallet integration.

- **Typed ABIs** – The project includes comprehensive ABI definitions for PublicLockV15, UnlockV14, and ERC20 tokens.

### 🚀 Enhanced Features (New!)

- **Smart Wallet Selection** – Automatically prioritizes external wallets (MetaMask, WalletConnect) over embedded wallets for optimal UX.

- **Advanced Key Purchase Hook** – Production-ready `useKeyPurchase` hook with automatic ERC20 token approval, comprehensive error handling, and transaction receipt parsing.

- **Structured Logging System** – Sanitized, leveled logging with support for both development and production environments.

- **Transaction Utilities** – Extract token IDs from receipts, analyze transactions, and handle confirmations consistently.

- **Blockchain Configuration** – Centralized chain configuration supporting multiple networks (Ethereum, Base, Polygon, etc.).

- **Wallet Management Hooks** – Detect wallet addresses, manage embedded wallets, and handle wallet state consistently.

- **Error Handling Utilities** – Parse and handle blockchain errors gracefully with user-friendly messages.

## Getting Started

### 1. Install dependencies

```bash
git clone <this-repo-url>
cd unlock-privy-nextjs-starter
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Minimum Required Configuration:**

```env
# Required: Get from https://dashboard.privy.io
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here

# Optional: Network selection (defaults to Base Sepolia)
NEXT_PUBLIC_CHAIN_ID=84532
```

**Supported Networks:**

The starter template comes pre-configured with 8 networks and their Unlock Protocol factory addresses:

| Network | Chain ID | Factory Address | Testnet |
|---------|----------|----------------|---------|
| **Base Sepolia** | 84532 | `0x259813B665C8f6074391028ef782e27B65840d89` | ✅ Recommended |
| Base | 8453 | `0xd0b14797b9D08493392865647384974470202A78` | ❌ |
| Ethereum | 1 | `0x3d5409CcE1d45233dE1D4eBDEe74b8E004abDD13` | ❌ |
| Polygon | 137 | `0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f` | ❌ |
| Arbitrum One | 42161 | `0x1FF7e338d5E582138C46044dc238543Ce555C963` | ❌ |
| Optimism | 10 | `0x99b1348a9129ac49c6de7F11245773dE2f51fB0c` | ❌ |
| Gnosis Chain | 100 | `0x1bc53f4303c711cc693F6Ec3477B83703DcB317f` | ❌ |
| Goerli | 5 | `0x1FF7e338d5E582138C46044dc238543Ce555C963` | ✅ Deprecated |

**Custom RPC URLs (Optional):**

By default, the app uses public RPC endpoints. For production or better reliability, add your own:

```env
# Example: Using Alchemy
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

See `.env.example` for all available RPC URL overrides.

**Logging Configuration:**

```env
# Development: see all logs
NEXT_PUBLIC_LOG_LEVEL=debug

# Production: silent
NEXT_PUBLIC_LOG_LEVEL=silent
```

**Specific Lock Addresses (Optional):**

If you have existing Unlock Protocol locks you want to interact with (e.g., for admin access control):

```env
# Example: Admin lock for role-based access control
NEXT_PUBLIC_ADMIN_LOCK_ADDRESS=0x...

# Example: Application-specific locks
NEXT_PUBLIC_MEMBERSHIP_LOCK_ADDRESS=0x...
```

**Note:** The factory addresses for **deploying new locks** are automatically configured based on your `NEXT_PUBLIC_CHAIN_ID`. You only need to add specific lock addresses if your app needs to interact with pre-existing locks.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see a "Log in with Privy" button on the home page.

## How It Works

### 1. Authenticating with Privy

The app wraps your Next.js pages in a `PrivyProvider` (see `pages/_app.tsx`). Users click the Log in button on the home page to trigger the Privy login flow via the `useLogin` hook. After authentication, the user is redirected to `/locks`.

To interact with smart contracts the app needs an ethers signer. Privy wallets expose an EIP‑1193 provider, so the app calls `wallet.getEthereumProvider()` to obtain a provider and then wraps it with `new ethers.BrowserProvider(...)` to create a signer ([docs.privy.io](https://docs.privy.io)).

```javascript
const { wallets } = useWallets();
const wallet = wallets[0];
const privyProvider = await wallet.getEthereumProvider();
const ethersProvider = new ethers.BrowserProvider(privyProvider);
const signer = await ethersProvider.getSigner();
```

### 2. Deploying Locks

Unlock has a factory contract (`Unlock.sol`) that creates new membership locks. The recommended method is `createUpgradeableLockAtVersion`, which accepts the lock version and the encoded call to the initialize function of the PublicLock contract ([docs.unlock-protocol.com](https://docs.unlock-protocol.com)). Encoding can be done using `ethers.Interface` with the initialize signature:

```javascript
import { ethers } from 'ethers';
import PublicLockABI from '../abis/PublicLockV15.json';

// prepare calldata for initialize(address,uint256,address,uint256,uint256,string)
const iface = new ethers.Interface(PublicLockABI);
const calldata = iface.encodeFunctionData('initialize', [
  lockManager,
  expirationDuration,
  tokenAddress,    // use 0x000...0 for ETH
  keyPrice,        // in wei
  maxNumberOfKeys,
  lockName,
]);
const tx = await unlockContract.createUpgradeableLockAtVersion(calldata, lockVersion);
await tx.wait();
```

The app exposes a form where you can specify these parameters. If you prefer to deploy a lock using the current default version, call the `createLock` method instead ([docs.unlock-protocol.com](https://docs.unlock-protocol.com)).
### 3. Managing Locks

Once deployed, locks expose a rich API via the PublicLock interface. The starter app demonstrates several common management tasks:

| Function | Description | Example call |
|----------|-------------|--------------|
| `updateKeyPricing(newPrice, tokenAddress)` | Change the price and currency of keys | `await lock.updateKeyPricing(BigInt(newPrice), tokenAddress)` |
| `updateLockConfig(newExpiration, maxKeys, maxKeysPerAccount)` | Adjust the default expiration and supply limits | `await lock.updateLockConfig(newDur, newMax, newPerAccount)` |
| `grantKeys(recipients, expirations, managers)` | Mint free keys to specific recipients | `await lock.grantKeys(['0xabc…'], [0n], ['0xmanager…'])` |
| `extend(value, tokenId, referrer, data)` | Extend a key's expiration by paying the lock price | `await lock.extend(BigInt(value), tokenId, referrer, '0x')` |
| `grantKeyExtension(tokenId, duration)` | Give extra time for free | `await lock.grantKeyExtension(tokenId, duration)` |
| `lendKey(from, to, tokenId)` | Transfer ownership temporarily while retaining management rights | `await lock.lendKey(owner, borrower, tokenId)` |
| `unlendKey(recipient, tokenId)` | Return full ownership to a borrower | `await lock.unlendKey(recipient, tokenId)` |

Each of these functions can only be executed by accounts with the appropriate roles (e.g. lock managers or key granters). Privy's embedded wallets make it easy for non‑technical users to perform these actions by signing transactions in the browser.
### 4. File Structure

```
unlock-privy-nextjs-starter
├── pages
│   ├── _app.tsx           # wraps pages in PrivyProvider
│   ├── index.tsx          # login page
│   ├── locks.tsx          # original lock management UI
│   └── examples.tsx       # NEW: enhanced features demo
├── components
│   ├── KeyPurchaseExample.tsx      # NEW: advanced key purchase demo
│   ├── WalletInfo.tsx              # NEW: wallet management demo
│   ├── DeployLockDemo.tsx          # NEW: lock deployment interface
│   ├── LockManagerDemo.tsx         # NEW: manager operations demo
│   ├── UnlockReadOperationsDemo.tsx # NEW: read operations showcase
│   └── ui/                          # NEW: UI components
│       ├── PrivyConnectButton.tsx   # Privy wallet connect button
│       ├── CustomDropdown.tsx       # Dropdown menu component
│       ├── WalletDetailsModal.tsx   # Wallet details modal
│       ├── dialog.tsx               # Dialog component
│       ├── button.tsx               # Button component
│       └── card.tsx                 # Card component
├── hooks
│   ├── useSmartWalletSelection.ts        # NEW: smart wallet selection
│   ├── useWalletManagement.ts            # NEW: wallet management
│   ├── useDetectConnectedWalletAddress.ts # NEW: wallet detection
│   ├── useWalletBalances.ts              # NEW: wallet balance tracking
│   └── unlock/                           # NEW: Unlock Protocol hooks
│       ├── useHasValidKey.ts            # Check if user has valid key
│       ├── useIsLockManager.ts          # Check if user is lock manager
│       ├── useKeyPrice.ts               # Get lock key price
│       ├── useLockTokenAddress.ts       # Get lock token address
│       ├── useKeyPurchase.ts            # Advanced key purchase
│       ├── useDeployLock.ts             # Deploy new locks
│       ├── useAddLockManager.ts         # Add lock managers
│       ├── useLockManagerKeyGrant.ts    # Grant keys as manager
│       ├── usePrivyWriteWallet.ts       # Get writable wallet
│       ├── types.ts                     # TypeScript types
│       └── index.ts                     # Composite hooks
├── lib
│   ├── blockchain
│   │   ├── config
│   │   │   ├── index.ts                 # NEW: main config & exports
│   │   │   └── clients/                 # NEW: client creation
│   │   │       └── public-client.ts     # Read-only RPC client
│   │   ├── providers
│   │   │   └── privy-viem.ts            # NEW: Privy + Viem integration
│   │   └── shared
│   │       ├── abi-definitions.ts        # NEW: comprehensive ABIs
│   │       └── transaction-utils.ts      # NEW: transaction utilities
│   └── utils
│       ├── logger/                       # NEW: structured logging
│       │   ├── index.ts                  # Main logger export
│       │   ├── core.ts                   # Core logging logic
│       │   ├── levels.ts                 # Log levels
│       │   ├── sanitize.ts               # Data sanitization
│       │   ├── formatting.ts             # Output formatting
│       │   └── transport.ts              # Output transport
│       ├── wallet-address.ts             # NEW: address formatting
│       ├── error-utils.ts                # NEW: error handling
│       ├── toast.ts                      # NEW: toast notifications
│       └── cn.ts                         # NEW: class name utility
├── abis
│   ├── PublicLockV15.json
│   └── UnlockV14.json
├── .gitignore                            # Git ignore rules
├── next.config.js                        # Next.js configuration
├── tsconfig.json                         # TypeScript configuration
└── package.json
```
## 🎯 Quick Start Guide

### Common Use Cases

#### Purchase a Key
```typescript
import { useKeyPurchase } from "@/hooks/unlock";

function MyComponent() {
  const { purchaseKey, isLoading, error } = useKeyPurchase();
  
  const handlePurchase = async () => {
    const result = await purchaseKey({
      lockAddress: "0x...",
      recipient: "0x...", // optional
      referrer: "0x...",  // optional
    });
    
    if (result.success) {
      console.log("Purchased! Token IDs:", result.tokenIds);
      console.log("Transaction Hash:", result.transactionHash);
    }
  };
  
  return (
    <button onClick={handlePurchase} disabled={isLoading}>
      {isLoading ? "Processing..." : "Purchase Key"}
    </button>
  );
}
```

**Key Features:**
- ✅ Automatic ERC20 token approval
- ✅ Smart wallet integration
- ✅ Comprehensive error handling
- ✅ Transaction receipt parsing with token IDs

#### Get Selected Wallet
```typescript
import { useSmartWalletSelection } from "@/hooks/useSmartWalletSelection";

function MyComponent() {
  const wallet = useSmartWalletSelection();
  
  // wallet will be (in priority order):
  // 1. External wallet (MetaMask, etc.) if available
  // 2. Injected wallet from linked accounts
  // 3. First available wallet (embedded) as fallback
  
  return <div>Connected: {wallet?.address}</div>;
}
```

#### Format Wallet Addresses
```typescript
import { formatWalletAddress } from "@/lib/utils/wallet-address";

const short = formatWalletAddress("0x1234567890123456789012345678901234567890");
// Returns: "0x1234...7890"
```

#### Use Structured Logging
```typescript
import { getLogger } from "@/lib/utils/logger";

const log = getLogger("my-component");

log.debug("Debug message", { data: "..." });
log.info("User action", { userId: "123" });
log.warn("Warning message", { issue: "..." });
log.error("Error occurred", { error });
```

**Logging Features:**
- Automatic sanitization of sensitive data (private keys, secrets)
- Address formatting for readability
- Environment-based log levels
- Structured context support

#### Extract Transaction Data
```typescript
import { 
  extractTokenIdsFromReceipt,
  analyzeTransactionReceipt 
} from "@/lib/blockchain/shared/transaction-utils";

const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const tokenIds = extractTokenIdsFromReceipt(receipt);
const analysis = analyzeTransactionReceipt(receipt, { 
  operation: "purchaseKey" 
});

console.log("Token IDs:", tokenIds);
console.log("Gas used:", analysis.gasUsed);
```

#### Check Lock Information
```typescript
import { useUnlockReadOperations } from "@/hooks/unlock";

function MyComponent() {
  const { hasValidKey, isLockManager, keyPrice, tokenAddress } = useUnlockReadOperations();
  
  const checkLockInfo = async () => {
    // Check if user has a valid key
    const keyInfo = await hasValidKey.checkHasValidKey(userAddress, lockAddress);
    console.log("Has key:", keyInfo?.isValid);
    console.log("Expires:", new Date(Number(keyInfo?.expirationTimestamp) * 1000));
    
    // Check if user is a manager
    const isManager = await isLockManager.checkIsLockManager(userAddress, lockAddress);
    console.log("Is manager:", isManager);
    
    // Get key price
    const price = await keyPrice.getKeyPrice(lockAddress);
    console.log("Price:", formatEther(price));
    
    // Get token address (0x0 for ETH, or ERC20 address)
    const token = await tokenAddress.getTokenAddress(lockAddress);
    console.log("Token:", token);
  };
  
  return <button onClick={checkLockInfo}>Check Lock Info</button>;
}
```

#### Deploy a New Lock
```typescript
import { useDeployLock } from "@/hooks/unlock";
import { parseEther, zeroAddress } from "viem";

function DeployLockComponent() {
  const { deployLock, isLoading, error, isSuccess } = useDeployLock();
  
  const handleDeploy = async () => {
    const result = await deployLock({
      name: "My Membership Lock",
      expirationDuration: 31536000n, // 1 year in seconds
      tokenAddress: zeroAddress, // Use ETH (or pass ERC20 address)
      keyPrice: parseEther("0.01"), // 0.01 ETH per key
      maxNumberOfKeys: 1000n, // Maximum 1000 keys
      lockVersion: 14, // Optional: defaults to 14
    });
    
    if (result.success) {
      console.log("Lock deployed at:", result.lockAddress);
      console.log("Transaction:", result.transactionHash);
    }
  };
  
  return (
    <button onClick={handleDeploy} disabled={isLoading}>
      {isLoading ? "Deploying..." : "Deploy Lock"}
    </button>
  );
}
```

**Key Features:**
- ✅ Automatic factory address resolution per chain
- ✅ Upgradeable lock deployment
- ✅ Lock address extraction from receipt
- ✅ Support for ETH and ERC20 locks

#### Add Lock Manager
```typescript
import { useAddLockManager } from "@/hooks/unlock";

function AddManagerComponent() {
  const { addLockManager, isLoading, error, isSuccess } = useAddLockManager();
  
  const handleAddManager = async () => {
    const result = await addLockManager({
      lockAddress: "0x...", // Your lock address
      managerAddress: "0x...", // Address to grant manager role
    });
    
    if (result.success) {
      console.log("Manager added:", result.transactionHash);
    }
  };
  
  return (
    <button onClick={handleAddManager} disabled={isLoading}>
      {isLoading ? "Adding Manager..." : "Add Manager"}
    </button>
  );
}
```

**Requirements:**
- Connected wallet must already be a lock manager
- Includes automatic permission check before transaction

#### Grant Keys as Lock Manager
```typescript
import { useLockManagerKeyGrant } from "@/hooks/unlock";

function GrantKeyComponent() {
  const { grantKey, isLoading, error, isSuccess } = useLockManagerKeyGrant();
  
  const handleGrantKey = async () => {
    const result = await grantKey({
      lockAddress: "0x...", // Your lock address
      recipientAddress: "0x...", // Who receives the key
      keyManagers: ["0x..."], // Who can manage this key (usually recipient)
    });
    
    if (result.success) {
      console.log("Key granted:", result.transactionHash);
    }
  };
  
  return (
    <button onClick={handleGrantKey} disabled={isLoading}>
      {isLoading ? "Granting Key..." : "Grant Key"}
    </button>
  );
}
```

**Key Features:**
- ✅ Free key grants for lock managers
- ✅ Automatic manager permission check
- ✅ Support for custom key managers
- ✅ No payment required

## 🎨 Demo Pages

- **`/locks`** - Original demo with all lock management functions
- **`/examples`** - NEW! Interactive demo of enhanced features including:
  - Smart wallet selection visualization
  - Lock deployment with custom parameters
  - Lock manager operations (add managers, grant keys)
  - Advanced key purchase with status tracking
  - Wallet management utilities
  - Unlock Protocol read operations (check keys, managers, pricing)
  - Real-time logging examples

## 🚀 Key Features Explained

### Smart Wallet Selection
The `useSmartWalletSelection` hook provides intelligent wallet prioritization:
- **Priority 1:** External wallets (MetaMask, WalletConnect) - better UX for users with existing wallets
- **Priority 2:** Injected wallets from linked accounts
- **Priority 3:** Embedded Privy wallets (fallback)

This ensures the best user experience by automatically using their preferred wallet.

### Transaction Utilities
Comprehensive utilities for handling blockchain transactions:
- **`extractTokenIdsFromReceipt()`** - Extract NFT token IDs from transaction receipts
- **`extractTokenTransfers()`** - Parse transfer events
- **`extractLockAddressFromReceipt()`** - Get deployed lock addresses
- **`analyzeTransactionReceipt()`** - Complete transaction analysis
- **`waitForTransactionConfirmation()`** - Consistent confirmation handling

### Blockchain Configuration

The starter template provides a **centralized, organized blockchain configuration system** in `lib/blockchain/config/index.ts`:

**Features:**
- ✅ **8 Pre-configured Networks** - Ethereum, Base, Polygon, Arbitrum, Optimism, Gnosis, and testnets
- ✅ **Automatic Unlock Factory Resolution** - Each network includes its Unlock Protocol factory address
- ✅ **Environment Variable Overrides** - Use custom RPC URLs via env vars (e.g., `NEXT_PUBLIC_BASE_RPC_URL`)
- ✅ **Public RPC Fallbacks** - Works out of the box with public endpoints
- ✅ **Type-Safe Configuration** - Full TypeScript support with `ChainConfig` interface
- ✅ **Helper Functions** - Easy access to chain metadata, factory addresses, and supported chains

**Usage Example:**
```typescript
import { 
  getClientConfig, 
  getUnlockFactoryAddress,
  getUnlockSupportedChains,
  formatChainName 
} from "@/lib/blockchain/config";

// Get current chain config (from NEXT_PUBLIC_CHAIN_ID)
const config = getClientConfig();
console.log(config.name); // "Base Sepolia"
console.log(config.rpcUrl); // "https://sepolia.base.org"
console.log(config.unlockFactoryAddress); // "0x259813..."

// Get factory address for specific chain
const factoryAddress = getUnlockFactoryAddress(8453); // Base mainnet

// Get all Unlock-supported chains
const supportedChains = getUnlockSupportedChains();
console.log(supportedChains.length); // 8

// Format chain name
const name = formatChainName(84532); // "Base Sepolia"
```

**Network Detection & Automatic Factory Resolution:**
The app automatically detects the network from `NEXT_PUBLIC_CHAIN_ID` and:
1. Loads the appropriate chain configuration
2. **Automatically resolves the Unlock Protocol factory address** for that chain
3. Uses custom RPC URL if provided, otherwise falls back to public RPC
4. Logs the active network for debugging

**Example: Automatic Factory Address Resolution**
```typescript
import { requireUnlockFactoryAddress } from "@/lib/blockchain/config";

// In your hooks/components - factory address is automatically selected
const chainId = await publicClient.getChainId();
const factoryAddress = requireUnlockFactoryAddress(chainId);
// Returns: "0x259813..." for Base Sepolia (84532)
//          "0xd0b147..." for Base Mainnet (8453)
//          etc.

// No need to manually maintain factory addresses in your code!
// Simply switch NEXT_PUBLIC_CHAIN_ID and everything updates automatically
```

**Adding New Networks:**
Simply add a new entry to `CHAIN_CONFIGS` in `lib/blockchain/config/index.ts`:
```typescript
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // ... existing configs
  999: {
    chainId: 999,
    name: "My Custom Chain",
    rpcUrl: getRpcUrl(999, "https://rpc.mychain.com", "NEXT_PUBLIC_MYCHAIN_RPC_URL"),
    blockExplorer: "https://explorer.mychain.com",
    unlockFactoryAddress: "0x...", // if Unlock is deployed
    nativeCurrency: { name: "Token", symbol: "TKN", decimals: 18 },
  },
};
```

### Error Handling
User-friendly error messages with automatic parsing:
- Transaction rejection detection
- Insufficient funds handling
- Gas estimation errors
- Custom error codes for different scenarios

## 🆘 Troubleshooting

### Wallet Not Connecting?
- Verify `NEXT_PUBLIC_PRIVY_APP_ID` is correct in `.env.local`
- Ensure you're on the correct network (check `NEXT_PUBLIC_CHAIN_ID`)
- Check browser console for detailed error logs
- Try refreshing the page or reconnecting your wallet

### Transaction Failing?
- Verify the lock address is valid and deployed
- Check you have sufficient funds (including gas)
- Review structured logs in console for detailed error info
- Ensure you're on the correct network

### TypeScript Errors?
- Run `npm install` to ensure all dependencies are installed
- Verify `@/*` path alias is working in `tsconfig.json`
- Check that all imports use the correct paths

### Logs Not Showing?
- Set `NEXT_PUBLIC_LOG_LEVEL=debug` in `.env.local`
- Check browser console (logs appear there in development)
- Ensure logger is imported: `import { getLogger } from "@/lib/utils/logger"`

## 💡 Tips & Best Practices

1. **Check the console** - Structured logs provide detailed operation info
2. **Use the examples page** - Visit `/examples` to see all features in action
3. **Read the types** - Full TypeScript support with comprehensive JSDoc comments
4. **Start with examples** - Copy and modify the example components for your needs
5. **Test on testnet first** - Use Base Sepolia or Goerli before mainnet deployment

## 📦 What's Included

### Hooks (14)

**Wallet Hooks:**
- `useSmartWalletSelection` - Intelligent wallet selection
- `useWalletManagement` - Wallet creation and detection
- `useDetectConnectedWalletAddress` - Consistent address detection
- `useWalletBalances` - Track ETH and USDC balances
- `usePrivyWriteWallet` - Get writable wallet for transactions

**Unlock Protocol Write Hooks:**
- `useKeyPurchase` - Advanced key purchase with ERC20 approval
- `useDeployLock` - Deploy new Unlock Protocol locks
- `useAddLockManager` - Add managers to existing locks
- `useLockManagerKeyGrant` - Grant keys as a lock manager

**Unlock Protocol Read Hooks:**
- `useHasValidKey` - Check if user has valid key
- `useIsLockManager` - Check if user is lock manager
- `useKeyPrice` - Get current key price
- `useLockTokenAddress` - Get lock's token address
- `useUnlockReadOperations` - Composite hook for all read operations

### Utilities
- **Logger** - Structured, sanitized logging system
- **Transaction Utils** - Receipt parsing and analysis
- **Error Utils** - Error handling and parsing
- **Address Utils** - Formatting and validation
- **Class Utils** - Tailwind class merging

### Blockchain Infrastructure
- **Privy + Viem Integration** - Seamless wallet client creation
- **Multi-chain Config** - Support for multiple networks
- **Complete ABIs** - PublicLock, Unlock Factory, ERC20
- **Event Signatures** - For log parsing
- **Factory Addresses** - Pre-configured for all major networks

### Components (11)

**Demo Components** (`/components`):
- `KeyPurchaseExample` - Interactive key purchase demo
- `WalletInfo` - Wallet management visualization
- `DeployLockDemo` - Lock deployment interface
- `LockManagerDemo` - Manager operations and key granting
- `UnlockReadOperationsDemo` - Read operations showcase

**UI Components** (`/components/ui`):
- `PrivyConnectButton` - Full-featured wallet connect button with balance display
- `CustomDropdown` - Dropdown menu with portal rendering
- `WalletDetailsModal` - Detailed wallet information modal
- `Dialog` - Modal dialog component
- `Button` - Reusable button component
- `Card` - Card layout component

**Note:** Demo components are used in `/pages/examples.tsx`, UI components can be used throughout the app

## Next Steps

- **Customize the UI**: Build on the example components with your preferred UI library
- **Add more chains**: Extend `lib/blockchain/config/index.ts` with additional networks
- **Implement features**: Use the hooks as building blocks for your app
- **Deploy to production**: Set `NEXT_PUBLIC_LOG_LEVEL=silent` for production
- **Role management**: Explore `addLockManager`, `addKeyGranter`, and role-based access control
- **Custom hooks**: Build additional hooks using the provided utilities as examples

## 📚 References

The implementation patterns used in this starter are derived from:

- [Unlock Protocol Documentation](https://docs.unlock-protocol.com) - Lock deployment and key management
- [Privy Documentation](https://docs.privy.io) - Wallet integration and authentication
- [Viem Documentation](https://viem.sh) - Modern Ethereum library
- [Ethers.js Documentation](https://docs.ethers.org) - Ethereum library

## 🙏 Credits

The enhanced features in this starter template are adapted from production patterns used in a live web3 application. These patterns have been battle-tested in production and provide:

- Robust error handling
- Comprehensive logging
- Type safety
- Transaction reliability
- Excellent developer experience

## 📝 License

MIT

---

Feel free to build on this template, integrate UI libraries, or automate these actions via serverless functions or bots. Happy hacking! 🚀
