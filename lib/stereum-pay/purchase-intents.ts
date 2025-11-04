/**
 * STATELESS IMPLEMENTATION: In-memory purchase intent storage
 * 
 * ⚠️ FOR TESTING ONLY - Data is lost on server restart
 * 
 * WITH DATABASE: Replace this with your database (PostgreSQL, MongoDB, etc.)
 * - Store purchase intents with idempotency_key as primary key
 * - Include fields: lockAddress, recipientAddress, chainId, lockPriceWei, customerInfo, etc.
 * - Add indexes on idempotency_key and transaction_id for fast lookups
 * - Add TTL/expiration cleanup for old records
 */

import type { UnlockPurchaseIntent } from './types';
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('stereum-purchase-intents');

// In-memory store (lost on server restart)
const purchaseIntents = new Map<string, UnlockPurchaseIntent>();

/**
 * Store purchase intent (STATELESS VERSION)
 * 
 * WITH DATABASE: 
 * await db.purchaseIntents.create({
 *   idempotency_key,
 *   lockAddress,
 *   recipientAddress,
 *   sterumTransactionId,
 *   chainId,
 *   lockPriceWei,
 *   amount,
 *   currency,
 *   customerInfo,
 *   status: 'pending',
 *   createdAt: new Date(),
 *   expiresAt: new Date(Date.now() + 15 * 60 * 1000)
 * });
 */
export function storePurchaseIntent(intent: UnlockPurchaseIntent): void {
  purchaseIntents.set(intent.sterumIdempotencyKey, intent);
  
  log.info('Purchase intent stored', {
    idempotency_key: intent.sterumIdempotencyKey,
    transaction_id: intent.sterumTransactionId,
    lock_address: intent.lockAddress,
    status: intent.status
  });

  // Cleanup expired intents (prevent memory leak)
  cleanupExpiredIntents();
}

/**
 * Retrieve purchase intent by idempotency key (STATELESS VERSION)
 * 
 * WITH DATABASE:
 * const intent = await db.purchaseIntents.findOne({
 *   where: { idempotency_key }
 * });
 */
export function getPurchaseIntentByIdempotencyKey(
  idempotencyKey: string
): UnlockPurchaseIntent | null {
  const intent = purchaseIntents.get(idempotencyKey);
  
  if (intent) {
    log.debug('Purchase intent retrieved', {
      idempotency_key: idempotencyKey,
      status: intent.status
    });
  } else {
    log.debug('Purchase intent not found', { idempotency_key: idempotencyKey });
  }
  
  return intent || null;
}

/**
 * Update purchase intent status (STATELESS VERSION)
 * 
 * WITH DATABASE:
 * await db.purchaseIntents.update({
 *   where: { id: intentId },
 *   data: {
 *     status,
 *     transactionHash,
 *     updatedAt: new Date(),
 *     ...(status === 'minted' && { mintedAt: new Date() })
 *   }
 * });
 */
export function updatePurchaseIntentStatus(
  idempotencyKey: string,
  status: UnlockPurchaseIntent['status'],
  transactionHash?: string
): void {
  const intent = purchaseIntents.get(idempotencyKey);
  
  if (!intent) {
    log.warn('Purchase intent not found for status update', {
      idempotency_key: idempotencyKey,
      status
    });
    return;
  }

  intent.status = status;
  intent.updatedAt = new Date();
  
  if (transactionHash) {
    intent.transactionHash = transactionHash;
  }
  
  if (status === 'minted') {
    intent.mintedAt = new Date();
  }
  
  if (status === 'paid') {
    intent.paidAt = new Date();
  }

  purchaseIntents.set(idempotencyKey, intent);
  
  log.info('Purchase intent status updated', {
    idempotency_key: idempotencyKey,
    status,
    transaction_hash: transactionHash
  });
}

/**
 * Get purchase intent by transaction ID (STATELESS VERSION)
 * 
 * WITH DATABASE:
 * const intent = await db.purchaseIntents.findOne({
 *   where: { sterumTransactionId: transactionId }
 * });
 */
export function getPurchaseIntentByTransactionId(
  transactionId: string
): UnlockPurchaseIntent | null {
  for (const intent of purchaseIntents.values()) {
    if (intent.sterumTransactionId === transactionId) {
      log.debug('Purchase intent found by transaction ID', {
        transaction_id: transactionId,
        idempotency_key: intent.sterumIdempotencyKey
      });
      return intent;
    }
  }
  
  log.debug('Purchase intent not found by transaction ID', { transaction_id: transactionId });
  return null;
}

/**
 * Cleanup expired purchase intents to prevent memory leaks
 */
function cleanupExpiredIntents(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, intent] of purchaseIntents.entries()) {
    if (intent.expiresAt.getTime() < now) {
      purchaseIntents.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    log.debug('Cleaned up expired purchase intents', { count: cleaned });
  }
}

/**
 * Get all purchase intents (for debugging/admin purposes)
 */
export function getAllPurchaseIntents(): UnlockPurchaseIntent[] {
  return Array.from(purchaseIntents.values());
}

/**
 * Clear all purchase intents (for testing)
 */
export function clearAllPurchaseIntents(): void {
  purchaseIntents.clear();
  log.debug('All purchase intents cleared');
}

