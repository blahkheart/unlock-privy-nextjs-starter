// Individual read hooks
export { useHasValidKey } from "./useHasValidKey";
export { useIsLockManager } from "./useIsLockManager";
export { useKeyPrice } from "./useKeyPrice";
export { useLockTokenAddress } from "./useLockTokenAddress";

// Write hooks
export { useKeyPurchase } from "./useKeyPurchase";
export { useDeployLock } from "./useDeployLock";
export { useAddLockManager } from "./useAddLockManager";
export { useLockManagerKeyGrant } from "./useLockManagerKeyGrant";

// Utility hooks
export { usePrivyWriteWallet } from "./usePrivyWriteWallet";

// Types
export type {
  UnlockHookOptions,
  KeyInfo,
  LockInfo,
  KeyPurchaseParams,
  KeyPurchaseResult,
  LockDeploymentParams,
  LockDeploymentResult,
  KeyGrantParams,
  KeyGrantResult,
  AddLockManagerParams,
  AddLockManagerResult,
  OperationState,
} from "./types";

// Import hooks for composite
import { useHasValidKey } from "./useHasValidKey";
import { useIsLockManager } from "./useIsLockManager";
import { useKeyPrice } from "./useKeyPrice";
import { useLockTokenAddress } from "./useLockTokenAddress";
import type { UnlockHookOptions } from "./types";

/**
 * Convenience composite hook for read operations
 * Provides all read-only Unlock Protocol operations in one hook
 * 
 * @example
 * ```typescript
 * const { hasValidKey, isLockManager, keyPrice, tokenAddress } = useUnlockReadOperations();
 * 
 * const checkAccess = async () => {
 *   const keyInfo = await hasValidKey.checkHasValidKey(userAddress, lockAddress);
 *   const isManager = await isLockManager.checkIsLockManager(userAddress, lockAddress);
 *   const price = await keyPrice.getKeyPrice(lockAddress);
 * };
 * ```
 */
export const useUnlockReadOperations = (options: UnlockHookOptions = {}) => {
  const hasValidKey = useHasValidKey(options);
  const isLockManager = useIsLockManager(options);
  const keyPrice = useKeyPrice(options);
  const tokenAddress = useLockTokenAddress(options);

  return {
    hasValidKey,
    isLockManager,
    keyPrice,
    tokenAddress,
  };
};
