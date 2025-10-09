import type { Address } from "viem";

export interface UnlockHookOptions {
  enabled?: boolean;
}

export interface KeyInfo {
  tokenId: bigint;
  owner: Address;
  expirationTimestamp: bigint;
  isValid: boolean;
}

export interface LockInfo {
  tokenAddress: Address;
  keyPrice: bigint;
  isValid: boolean;
}

// ============================================================================
// WRITE OPERATION TYPES
// ============================================================================

// Key Purchase Types
export interface KeyPurchaseParams {
  lockAddress: Address;
  recipient?: Address; // defaults to connected wallet
  keyManager?: Address;
  referrer?: Address;
  data?: `0x${string}`;
}

export interface KeyPurchaseResult {
  success: boolean;
  transactionHash?: string;
  tokenIds?: bigint[];
  error?: string;
}

// Lock Deployment Types
export interface LockDeploymentParams {
  name: string;
  expirationDuration: bigint;
  tokenAddress: Address;
  keyPrice: bigint;
  maxNumberOfKeys: bigint;
  lockVersion?: number; // defaults to 14
}

export interface LockDeploymentResult {
  success: boolean;
  transactionHash?: string;
  lockAddress?: Address;
  error?: string;
}

// Key Grant Types (for lock managers)
export interface KeyGrantParams {
  lockAddress: Address;
  recipientAddress: Address;
  keyManagers: Address[];
}

export interface KeyGrantResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Add Lock Manager Types
export interface AddLockManagerParams {
  lockAddress: Address;
  managerAddress: Address;
}

export interface AddLockManagerResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Shared Operation State
export interface OperationState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}
