import type { NextApiRequest, NextApiResponse } from 'next';
import { getKeyPrice } from '@/lib/unlock/pricing';
import { createSterumPayClient, formatAmount, generateIdempotencyKey, validateCustomerData } from '@/lib/stereum-pay/api';
import { getClientConfig } from '@/lib/blockchain/config';
import { getLogger } from '@/lib/utils/logger';
import { storePurchaseIntent } from '@/lib/stereum-pay/purchase-intents';
import { getETHPriceInUSD } from '@/lib/oracles/price-oracle';
import type { UnlockPurchaseIntent } from '@/lib/stereum-pay/types';

const log = getLogger('stereum-checkout');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      lockAddress, 
      recipient, 
      currency = 'USDT',
      network = 'POLYGON',
      customerInfo 
    } = req.body;

    // Validate required fields
    if (!lockAddress || !recipient || !customerInfo) {
      return res.status(400).json({ 
        error: 'Missing required fields: lockAddress, recipient, customerInfo' 
      });
    }

    // Validate customer data for the selected currency
    const customerValidation = validateCustomerData(customerInfo, currency);
    if (!customerValidation.isValid) {
      return res.status(400).json({ 
        error: 'Invalid customer data',
        details: customerValidation.errors
      });
    }

    log.info('Creating Stereum checkout', {
      lockAddress,
      recipient,
      currency,
      network,
      customer_name: customerInfo.name
    });

    // 1. Get current lock price in wei
    const chainConfig = getClientConfig();
    const lockPriceWei = await getKeyPrice(lockAddress, chainConfig.chainId);
    
    // 2. Convert to USD equivalent using price oracle
    const ethToUsd = await getETHPriceInUSD();
    const lockPriceUsd = (Number(lockPriceWei) / 1e18) * ethToUsd;
    
    // 3. Add bundled costs (gas + processing)
    const gasCostUsd = 5; // Estimated gas cost in USD
    const processingFee = lockPriceUsd * 0.03; // 3% processing fee
    const totalPriceUsd = lockPriceUsd + gasCostUsd + processingFee;

    // 4. Create Stereum Pay client
    const sterumClient = createSterumPayClient({
      apiKey: process.env.STEREUM_API_KEY!,
      username: process.env.STEREUM_USERNAME!,
      password: process.env.STEREUM_PASSWORD!,
      publicKey: process.env.STEREUM_PUBLIC_KEY!,
      baseUrl: process.env.STEREUM_BASE_URL || 'https://api.stereum.tech'
    });

    // 5. Generate unique idempotency key
    const idempotencyKey = generateIdempotencyKey();

    // 6. Create charge
    const chargeResult = await sterumClient.createCharge({
      country: "BO",
      amount: formatAmount(totalPriceUsd),
      network: network,
      currency: currency,
      idempotency_key: idempotencyKey,
      charge_reason: `Unlock Protocol Key - ${lockAddress.slice(0, 10)}...`,
      customer: customerInfo,
      callback: `${process.env.BASE_URL}/api/stereum/webhook`,
      reservation_validity_time: 15  // 15 minutes for payment
    });

    if (!chargeResult.success || !chargeResult.data) {
      log.error('Stereum charge creation failed', { 
        error: chargeResult.error,
        lockAddress,
        recipient
      });
      
      return res.status(500).json({ 
        error: chargeResult.error || 'Failed to create charge' 
      });
    }

    const charge = chargeResult.data;

    // 7. Store purchase intent (STATELESS - in-memory)
    // WITH DATABASE: Replace with your database storage call
    const purchaseIntent: UnlockPurchaseIntent = {
      id: `intent_${idempotencyKey}`,
      lockAddress,
      recipientAddress: recipient,
      sterumTransactionId: charge.id,
      sterumIdempotencyKey: idempotencyKey,
      amount: totalPriceUsd,
      currency,
      status: 'pending',
      metadata: {
        lockName: `Lock ${lockAddress.slice(0, 10)}...`,
        keyDuration: 0, // You'd get this from the lock contract if needed
        chainId: chainConfig.chainId,
        customerInfo,
        lockPriceWei: lockPriceWei.toString()
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(charge.expiration_time)
    };

    storePurchaseIntent(purchaseIntent);

    log.info('Purchase intent stored', {
      idempotency_key: idempotencyKey,
      transaction_id: charge.id
    });

    log.info('Stereum checkout created successfully', {
      transaction_id: charge.id,
      payment_link: charge.payment_link,
      amount: charge.amount,
      currency: charge.currency,
      expires_at: new Date(charge.expiration_time).toISOString()
    });

    res.json({
      success: true,
      paymentLink: charge.payment_link,
      transactionId: charge.id,
      qrCode: charge.qr_base64,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.transaction_status,
      expiresAt: new Date(charge.expiration_time).toISOString(),
      collectingAccount: charge.collecting_account,
      bundledPrice: {
        lockPrice: lockPriceUsd,
        gasCost: gasCostUsd,
        processingFee: processingFee,
        total: totalPriceUsd
      }
    });

  } catch (error) {
    log.error('Checkout creation failed', { error });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}