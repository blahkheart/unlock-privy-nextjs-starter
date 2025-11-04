/**
 * Stereum Pay Webhook utilities
 * Handles webhook signature verification and notification processing
 */

import crypto from 'crypto';
import { getLogger } from '@/lib/utils/logger';
import type {
  SterumWebhookNotification,
  SterumTestNotification,
  WebhookVerificationResult,
  TransactionStatus
} from './types';

const log = getLogger('stereum-webhooks');

// Webhook tolerance: 2 minutes as recommended by Stereum
const WEBHOOK_TOLERANCE_MS = 2 * 60 * 1000;

/**
 * Verify Stereum Pay webhook signature using HMAC-SHA256
 * Uses the API KEY as the secret for HMAC generation
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  apiKey: string,
  timestamp: number
): boolean {
  try {
    // Generate expected signature using HMAC-SHA256 with API KEY
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(rawBody, 'utf8')
      .digest('hex');

    log.debug('Webhook signature verification', {
      received_signature: receivedSignature,
      expected_signature: expectedSignature,
      timestamp: timestamp,
      body_length: rawBody.length
    });

    // Use timing-safe comparison to prevent timing attacks
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!signaturesMatch) {
      log.warn('Webhook signature verification failed', {
        received: receivedSignature,
        expected: expectedSignature
      });
      return false;
    }

    return true;

  } catch (error) {
    log.error('Webhook signature verification error', { error });
    return false;
  }
}

/**
 * Verify webhook timestamp to prevent replay attacks
 * Checks that the webhook was sent within the tolerance window
 */
export function verifyWebhookTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const webhookTime = timestamp; // Timestamp is already in milliseconds
  const timeDiff = Math.abs(now - webhookTime);

  log.debug('Webhook timestamp verification', {
    webhook_time: new Date(webhookTime).toISOString(),
    current_time: new Date(now).toISOString(),
    difference_ms: timeDiff,
    tolerance_ms: WEBHOOK_TOLERANCE_MS
  });

  if (timeDiff > WEBHOOK_TOLERANCE_MS) {
    log.warn('Webhook timestamp outside tolerance window', {
      time_difference_minutes: timeDiff / (60 * 1000),
      tolerance_minutes: WEBHOOK_TOLERANCE_MS / (60 * 1000)
    });
    return false;
  }

  return true;
}

/**
 * Parse and verify a Stereum Pay webhook
 * Handles both test and transaction notifications
 */
export function verifyAndParseWebhook(
  rawBody: string,
  headers: { [key: string]: string | undefined },
  apiKey: string
): WebhookVerificationResult {
  try {
    // Extract required headers (note: actual header names from Stereum docs)
    const signature = headers['x-signature'];
    const timestampHeader = headers['x-timestamp'];

    if (!signature) {
      log.warn('Missing x-signature header in webhook');
      return {
        isValid: false,
        error: 'Missing x-signature header'
      };
    }

    if (!timestampHeader) {
      log.warn('Missing x-timestamp header in webhook');
      return {
        isValid: false,
        error: 'Missing x-timestamp header'
      };
    }

    const timestamp = parseInt(timestampHeader);
    if (isNaN(timestamp)) {
      log.warn('Invalid timestamp in webhook header', { timestamp: timestampHeader });
      return {
        isValid: false,
        error: 'Invalid timestamp format'
      };
    }

    // Verify timestamp first (faster check)
    if (!verifyWebhookTimestamp(timestamp)) {
      return {
        isValid: false,
        error: 'Webhook timestamp outside tolerance window'
      };
    }

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, apiKey, timestamp)) {
      return {
        isValid: false,
        error: 'Invalid webhook signature'
      };
    }

    // Parse the notification
    let notification: SterumWebhookNotification | SterumTestNotification;
    try {
      notification = JSON.parse(rawBody);
    } catch (parseError) {
      log.error('Failed to parse webhook JSON', { error: parseError });
      return {
        isValid: false,
        error: 'Invalid JSON payload'
      };
    }

    // Validate notification structure
    if (!notification.notification_type || !notification.id || !notification.timestamp) {
      log.warn('Invalid webhook notification structure', { notification });
      return {
        isValid: false,
        error: 'Invalid notification structure'
      };
    }

    log.info('Webhook verified successfully', {
      notification_type: notification.notification_type,
      notification_id: notification.id,
      timestamp: new Date(notification.timestamp).toISOString()
    });

    return {
      isValid: true,
      notification: notification as SterumWebhookNotification
    };

  } catch (error) {
    log.error('Webhook verification error', { error });
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Webhook verification failed'
    };
  }
}

/**
 * Check if a notification is a test notification
 */
export function isTestNotification(notification: any): notification is SterumTestNotification {
  return notification.notification_type === 'test';
}

/**
 * Check if a notification is a transaction notification
 */
export function isTransactionNotification(notification: any): notification is SterumWebhookNotification {
  return notification.notification_type === 'transaction' && notification.transaction;
}

/**
 * Get human-readable status description
 */
export function getStatusDescription(status: TransactionStatus): string {
  const descriptions: Record<TransactionStatus, string> = {
    INICIADO: 'Transaction initiated',
    PENDIENTE: 'Payment pending',
    PAGADO: 'Payment completed',
    CANCELADO: 'Transaction cancelled',
    ERROR: 'Transaction error'
  };

  return descriptions[status] || `Unknown status: ${status}`;
}

/**
 * Check if transaction is in a final state
 */
export function isTransactionFinal(status: TransactionStatus): boolean {
  return ['PAGADO', 'CANCELADO', 'ERROR'].includes(status);
}

/**
 * Check if payment was successful
 */
export function isPaymentSuccessful(status: TransactionStatus): boolean {
  return status === 'PAGADO';
}

/**
 * Extract transaction details for logging
 */
export function extractTransactionLogData(notification: SterumWebhookNotification) {
  const { transaction } = notification;
  
  return {
    notification_id: notification.id,
    transaction_id: transaction.id,
    status: transaction.status,
    amount: transaction.amount,
    amount_received: transaction.amount_received,
    currency: transaction.currency,
    network: transaction.network,
    fee: transaction.fee,
    idempotency_key: transaction.idempotency_key,
    payment_date: transaction.payment_date ? new Date(transaction.payment_date).toISOString() : undefined,
    created_date: new Date(transaction.created_date).toISOString()
  };
}

/**
 * Create a standardized webhook response
 * Always return 200 with JSON for successful processing
 */
export function createWebhookResponse(success: boolean = true, message: string = 'OK') {
  return {
    status: success ? 200 : 400,
    body: {
      success,
      message,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Idempotency tracking for webhook processing
 * Prevents duplicate processing of the same notification
 */
const processedNotifications = new Set<string>();

export function isNotificationProcessed(notificationId: string): boolean {
  return processedNotifications.has(notificationId);
}

export function markNotificationProcessed(notificationId: string): void {
  processedNotifications.add(notificationId);
  
  // Clean up old entries periodically (keep last 1000)
  if (processedNotifications.size > 1000) {
    const entries = Array.from(processedNotifications);
    const toKeep = entries.slice(-500); // Keep last 500
    processedNotifications.clear();
    toKeep.forEach(id => processedNotifications.add(id));
  }
}