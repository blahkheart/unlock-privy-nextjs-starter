import type { NextApiRequest, NextApiResponse } from 'next';
import { createSterumPayClient } from '@/lib/stereum-pay/api';
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('stereum-status');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transactionId } = req.query;

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid transactionId parameter' });
  }

  try {
    log.debug('Checking transaction status', { transaction_id: transactionId });

    // Create Stereum Pay client
    const sterumClient = createSterumPayClient({
      apiKey: process.env.STEREUM_API_KEY!,
      username: process.env.STEREUM_USERNAME!,
      password: process.env.STEREUM_PASSWORD!,
      publicKey: process.env.STEREUM_PUBLIC_KEY!,
      baseUrl: process.env.STEREUM_BASE_URL || 'https://api.stereum.tech'
    });

    const statusResult = await sterumClient.getTransactionStatus(transactionId);
    
    if (!statusResult.success || !statusResult.data) {
      log.error('Failed to get transaction status', {
        transaction_id: transactionId,
        error: statusResult.error
      });
      
      return res.status(500).json({ 
        error: statusResult.error || 'Failed to get status' 
      });
    }

    const status = statusResult.data;
    
    log.debug('Transaction status retrieved', {
      transaction_id: status.id,
      status: status.status,
      amount: status.amount,
      currency: status.currency
    });

    // TODO: Also get purchase intent status from your database
    // const purchaseIntent = await getPurchaseIntentByTransactionId(transactionId);
    
    const response = {
      // Stereum Pay transaction details
      stereum: {
        id: status.id,
        status: status.status,
        statusDescription: status.status_description,
        amount: status.amount,
        currency: status.currency,
        country: status.country,
        fee: status.fee,
        createdAt: new Date(status.created_date).toISOString(),
        expiresAt: new Date(status.expiration_time).toISOString(),
        paidAt: status.payment_date ? new Date(status.payment_date).toISOString() : null,
        idempotencyKey: status.idempotency_key,
        onMainNet: status.on_main_net
      },
      
      // Purchase intent details (from your database)
      // unlock: purchaseIntent ? {
      //   intentId: purchaseIntent.id,
      //   lockAddress: purchaseIntent.lockAddress,
      //   recipient: purchaseIntent.recipientAddress,
      //   status: purchaseIntent.status, // 'pending', 'paid', 'minted', 'failed'
      //   transactionHash: purchaseIntent.transactionHash,
      //   mintedAt: purchaseIntent.mintedAt
      // } : null,

      // Combined status
      overallStatus: getOverallStatus(status.status),
      isPaymentComplete: status.status === 'PAGADO',
      isExpired: status.status === 'CANCELADO' || new Date() > new Date(status.expiration_time),
      canRetry: status.status === 'PENDIENTE' && new Date() < new Date(status.expiration_time)
    };

    res.json(response);

  } catch (error) {
    log.error('Status check failed', { error, transaction_id: transactionId });
    res.status(500).json({ error: 'Failed to check status' });
  }
}

/**
 * Convert Stereum status to user-friendly overall status
 */
function getOverallStatus(stereumStatus: string): string {
  switch (stereumStatus) {
    case 'PENDIENTE':
      return 'awaiting_payment';
    case 'PAGADO':
      return 'payment_complete';
    case 'CANCELADO':
      return 'cancelled';
    case 'ERROR':
      return 'error';
    default:
      return 'unknown';
  }
}

// TODO: Implement this function to get purchase intent from your database
// async function getPurchaseIntentByTransactionId(transactionId: string) {
//   // Query your database for purchase intent linked to this transaction
//   return null;
// }