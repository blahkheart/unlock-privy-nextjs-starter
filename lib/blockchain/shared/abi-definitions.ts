/**
 * Consolidated ABI definitions and contract interfaces
 * Single source of truth for all smart contract ABIs
 */

// Import the base Public Lock ABI from the existing abis directory
import PublicLockABI from "../../../abis/PublicLockV15.json";

// ============================================================================
// UNLOCK PROTOCOL ABIS
// ============================================================================

/**
 * Unlock Factory ABI for lock creation
 */
export const UNLOCK_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "bytes", name: "data", type: "bytes" },
      { internalType: "uint16", name: "lockVersion", type: "uint16" },
    ],
    name: "createUpgradeableLockAtVersion",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_expirationDuration", type: "uint256" },
      { internalType: "address", name: "_tokenAddress", type: "address" },
      { internalType: "uint256", name: "_keyPrice", type: "uint256" },
      { internalType: "uint256", name: "_maxNumberOfKeys", type: "uint256" },
      { internalType: "string", name: "_lockName", type: "string" },
      { internalType: "bytes12", name: "_salt", type: "bytes12" },
    ],
    name: "createLock",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Additional Public Lock ABI functions for extended functionality
 */
export const ADDITIONAL_LOCK_ABI = [
  // Initialize function for lock creation
  {
    inputs: [
      { internalType: "address", name: "_lockCreator", type: "address" },
      { internalType: "uint256", name: "_expirationDuration", type: "uint256" },
      { internalType: "address", name: "_tokenAddress", type: "address" },
      { internalType: "uint256", name: "_keyPrice", type: "uint256" },
      { internalType: "uint256", name: "_maxNumberOfKeys", type: "uint256" },
      { internalType: "string", name: "_lockName", type: "string" },
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Purchase function for buying keys
  {
    inputs: [
      { internalType: "uint256[]", name: "_values", type: "uint256[]" },
      { internalType: "address[]", name: "_recipients", type: "address[]" },
      { internalType: "address[]", name: "_referrers", type: "address[]" },
      { internalType: "address[]", name: "_keyManagers", type: "address[]" },
      { internalType: "bytes[]", name: "_data", type: "bytes[]" },
    ],
    name: "purchase",
    outputs: [
      { internalType: "uint256[]", name: "tokenIds", type: "uint256[]" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  // Lock management functions
  {
    inputs: [{ internalType: "address", name: "_account", type: "address" }],
    name: "addLockManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_account", type: "address" }],
    name: "isLockManager",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // Token address function to check what token the lock uses
  {
    inputs: [],
    name: "tokenAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // Key price function
  {
    inputs: [],
    name: "keyPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Renounce lock manager function
  {
    inputs: [],
    name: "renounceLockManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Update key pricing
  {
    inputs: [
      { internalType: "uint256", name: "_keyPrice", type: "uint256" },
      { internalType: "address", name: "_tokenAddress", type: "address" },
    ],
    name: "updateKeyPricing",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Update lock configuration
  {
    inputs: [
      { internalType: "uint256", name: "_newExpirationDuration", type: "uint256" },
      { internalType: "uint256", name: "_maxNumberOfKeys", type: "uint256" },
      { internalType: "uint256", name: "_maxKeysPerAcccount", type: "uint256" },
    ],
    name: "updateLockConfig",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Grant keys (bulk operation)
  {
    inputs: [
      { internalType: "address[]", name: "_recipients", type: "address[]" },
      { internalType: "uint256[]", name: "_expirationTimestamps", type: "uint256[]" },
      { internalType: "address[]", name: "_keyManagers", type: "address[]" },
    ],
    name: "grantKeys",
    outputs: [
      { internalType: "uint256[]", name: "", type: "uint256[]" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Extend key expiration
  {
    inputs: [
      { internalType: "uint256", name: "_value", type: "uint256" },
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
      { internalType: "address", name: "_referrer", type: "address" },
      { internalType: "bytes", name: "_data", type: "bytes" },
    ],
    name: "extend",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // Lend key
  {
    inputs: [
      { internalType: "address", name: "_from", type: "address" },
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
    ],
    name: "lendKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Unlend key
  {
    inputs: [
      { internalType: "address", name: "_recipient", type: "address" },
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
    ],
    name: "unlendKey",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Grant key extension
  {
    inputs: [
      { internalType: "uint256", name: "_tokenId", type: "uint256" },
      { internalType: "uint256", name: "_duration", type: "uint256" },
    ],
    name: "grantKeyExtension",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

/**
 * Complete Public Lock ABI combining base and additional functions
 */
export const COMPLETE_LOCK_ABI = [
  ...((PublicLockABI as any).abi || (PublicLockABI as any)),
  ...ADDITIONAL_LOCK_ABI,
];

// ============================================================================
// ERC20 ABIS
// ============================================================================

/**
 * Standard ERC20 ABI functions needed for token operations
 */
export const ERC20_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ============================================================================
// EVENT SIGNATURES
// ============================================================================

/**
 * Common event signatures for log parsing
 */
export const EVENT_SIGNATURES = {
  TRANSFER:
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  NEW_LOCK:
    "0x01017ed19df0c7f8acc436147b234b09664a9fb4797b4fa3fb9e599c2eb67be7",
  APPROVAL:
    "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
} as const;

/**
 * Unlock Factory event interfaces for log parsing
 */
export const UNLOCK_FACTORY_EVENTS = [
  "event NewLock(address indexed lockOwner, address indexed newLockAddress)",
] as const;

// ============================================================================
// CONTRACT ADDRESSES
// ============================================================================

/**
 * Unlock Protocol factory contract addresses by chain ID
 */
export const UNLOCK_FACTORY_ADDRESSES: Record<number, string> = {
  1: "0x3d5409CcE1d45233dE1D4eBDEe74b8E004abDD13", // Ethereum mainnet
  5: "0x1FF7e338d5E582138C46044dc238543Ce555C963", // Goerli testnet
  10: "0x99b1348a9129ac49c6de7F11245773dE2f51fB0c", // Optimism
  100: "0x1bc53f4303c711cc693F6Ec3477B83703DcB317f", // Gnosis Chain
  137: "0xE8E5cd156f89F7bdB267EabD5C43Af3d5AF2A78f", // Polygon
  8453: "0xd0b14797b9D08493392865647384974470202A78", // Base mainnet
  42161: "0x1FF7e338d5E582138C46044dc238543Ce555C963", // Arbitrum One
  84532: "0x259813B665C8f6074391028ef782e27B65840d89", // Base Sepolia testnet
} as const;

// ============================================================================
// ABI UTILITIES
// ============================================================================

/**
 * Get the appropriate ABI for a given contract type
 */
export const getContractABI = (contractType: "lock" | "factory" | "erc20") => {
  switch (contractType) {
    case "lock":
      return COMPLETE_LOCK_ABI;
    case "factory":
      return UNLOCK_FACTORY_ABI;
    case "erc20":
      return ERC20_ABI;
    default:
      throw new Error(`Unknown contract type: ${contractType}`);
  }
};
