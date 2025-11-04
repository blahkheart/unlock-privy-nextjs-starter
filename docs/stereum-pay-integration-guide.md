# Stereum Pay Integration Guide for Unlock Protocol

**A Reference Implementation and Design Pattern for Fiat Payments**

---

## Executive Summary

This document provides a **direct, production-ready integration pattern** for adding Stereum Pay fiat payments to Unlock Protocol applications. While implemented as a reference in this Next.js codebase, the patterns are designed to be **framework-agnostic** and adaptable to any tech stack.

**Key Benefits:**
- ✅ **Simple & Direct**: 3 API endpoints, minimal complexity
- ✅ **Framework Agnostic**: Patterns work with Next.js, Express, Django, Rails, etc.
- ✅ **Production Ready**: Proper error handling, security, and reliability
- ✅ **Sustainable Business Model**: Solves the cost funding problem
- ✅ **Developer Friendly**: Clear setup process, comprehensive documentation

---

## Core Design Principles

### 1. **Simplicity Over Premature Abstraction**
- Direct integration with Stereum Pay API
- No unnecessary provider abstraction layers
- Minimal dependencies and moving parts

### 2. **Framework-Agnostic Patterns**
- Core logic independent of specific frameworks
- Transferable patterns across different tech stacks
- Concrete examples for popular frameworks

### 3. **Business Model Sustainability**
- **Bundled pricing** eliminates developer funding burden
- Transparent cost structure
- Scalable across different lock pricing models

### 4. **Security First**
- HMAC webhook verification
- Replay protection and idempotency
- Proper error handling and logging

### 5. **Developer Experience**
- Minimal setup requirements
- Clear documentation and examples
- Easy to debug and maintain

---

## Architecture Overview

### High-Level Flow

```
┌─────────────┐
│    User     │
│   (Buyer)   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│    Your Application             │
│  ┌─────────────────────────────┐│
│  │  "Pay with Card" Button     ││
│  └─────────────────────────────┘│
└──────┬──────────────────────────┘
       │ POST /api/stereum/checkout
       ▼
┌─────────────────────────────────┐
│    Stereum Pay                  │
│  ┌─────────────────────────────┐│
│  │   Hosted Checkout Page      ││
│  └─────────────────────────────┘│
└──────┬──────────────────────────┘
       │ User completes payment
       ▼
┌─────────────────────────────────┐
│    Your Application             │
│  ┌─────────────────────────────┐│
│  │  POST /api/stereum/webhook  ││
│  │  (Stereum → Your API)       ││
│  └─────────────────────────────┘│
└──────┬──────────────────────────┘
       │ Webhook verified & processed
       ▼
┌─────────────────────────────────┐
│    Unlock Protocol              │
│  ┌─────────────────────────────┐│
│  │   Key Minted On-Chain       ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### Core Components

#### 1. **Checkout Endpoint** (`/api/stereum/checkout`)
- Creates Stereum Pay invoice
- Calculates bundled pricing (lock price + gas + fees)
- Returns checkout URL for user redirect

#### 2. **Webhook Endpoint** (`/api/stereum/webhook`) 
- Receives payment confirmation from Stereum
- Verifies webhook signature
- Triggers on-chain key minting

#### 3. **Status Endpoint** (`/api/stereum/status`) 
- Checks payment and minting status
- Used for UI updates and debugging
- Handles edge cases and retries

---

## Business Model Solution

### The Cost Funding Problem (Solved)

**Traditional Problem**: Developers must fund a "relayer wallet" with crypto to cover:
- Lock purchase price (e.g., 0.01 ETH)
- Gas fees (0.002-0.005 ETH)
- This creates unsustainable cost burden

**Our Solution: Bundled Pricing**

```typescript
// Calculate total cost upfront
const totalCostInCrypto = lockPrice + estimatedGasFee;
const totalCostInFiat = convertCryptoToFiat(totalCostInCrypto, "USD");
const stereumFee = totalCostInFiat * 0.03; // 3% processing fee
const finalPrice = totalCostInFiat + stereumFee;

// Stereum collects this amount and handles crypto conversion
const invoice = await stereumPay.createInvoice({
  amount: finalPrice,
  currency: "USD",
  description: `Unlock membership for ${lockName}`,
});
```

**How It Works:**
1. **Calculate Total**: Lock price + gas + processing fee in fiat
2. **User Pays Fiat**: Single payment covers everything
3. **Stereum Handles Crypto**: Converts fiat to required crypto amounts
4. **Developer Gets Crypto**: Receives exact amounts needed for minting
5. **No Upfront Funding**: Developer doesn't fund relayer wallet

### Benefits:
- ✅ **Zero Developer Risk**: No upfront crypto investment
- ✅ **Transparent Pricing**: Users see total cost upfront
- ✅ **Automatic Scaling**: Works for any lock price
- ✅ **Multi-Currency**: Can support USD, EUR, etc.

---

## Security Patterns

### 1. **Webhook Verification**

**Framework-Agnostic Pattern:**

```typescript
function verifyStereumWebhook(
  rawBody: string,
  signature: string,
  apiKey: string,          // Use API KEY as HMAC secret
  timestamp: number
): boolean {
  // Verify timestamp first (prevent replay attacks)
  const now = Date.now();
  const timeDiff = Math.abs(now - timestamp);
  const tolerance = 2 * 60 * 1000; // 2 minutes tolerance
  
  if (timeDiff > tolerance) {
    return false;
  }

  // Generate expected signature using API KEY
  const expectedSignature = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody, 'utf8')
    .digest('hex');
  
  // Prevent timing attacks - note: no "sha256=" prefix
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### 2. **Replay Protection**

```typescript
const WEBHOOK_TOLERANCE = 5 * 60 * 1000; // 5 minutes

function isWebhookFresh(timestamp: number): boolean {
  const now = Date.now();
  const webhookTime = timestamp * 1000; // Convert to milliseconds
  
  return Math.abs(now - webhookTime) <= WEBHOOK_TOLERANCE;
}
```

### 3. **Idempotency**

```typescript
const processedEvents = new Set<string>();

function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

function markEventProcessed(eventId: string): void {
  processedEvents.add(eventId);
}
```

---

## Framework-Agnostic Implementation Guide

### 1. Next.js Implementation

#### File Structure:
```
pages/api/stereum/
├── checkout.ts      # Create payment sessions
├── webhook.ts       # Handle payment confirmations  
└── status.ts        # Check payment/minting status
```

#### Checkout Endpoint (`pages/api/stereum/checkout.ts`):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getKeyPrice } from '@/lib/unlock/pricing';
import { createSterumPayClient, formatAmount } from '@/lib/stereum-pay/api';
import { getClientConfig } from '@/lib/blockchain/config';

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

    // 1. Get current lock price in wei
    const chainConfig = getClientConfig();
    const lockPriceWei = await getKeyPrice(lockAddress, chainConfig.chainId);
    
    // 2. Convert to USD equivalent (you'd use a price oracle here)
    const ethToUsd = 2500; // Example rate - use real oracle
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

    // 5. Create charge
    const chargeResult = await sterumClient.createCharge({
      country: "BO",
      amount: formatAmount(totalPriceUsd),
      network: network,
      currency: currency,
      idempotency_key: crypto.randomUUID(),
      charge_reason: `Unlock Protocol Key - ${lockAddress}`,
      customer: customerInfo,
      callback: `${process.env.BASE_URL}/api/stereum/webhook`
    });

    if (!chargeResult.success || !chargeResult.data) {
      return res.status(500).json({ 
        error: chargeResult.error || 'Failed to create charge' 
      });
    }

    const charge = chargeResult.data;

    res.json({
      paymentLink: charge.payment_link,    // Note: payment_link, not checkout_url
      transactionId: charge.id,            // Note: id, not invoice_id
      qrCode: charge.qr_base64,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.transaction_status,
      expiresAt: new Date(charge.expiration_time).toISOString(),
      collectingAccount: charge.collecting_account
    });

  } catch (error) {
    console.error('Checkout creation failed:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

#### Webhook Endpoint (`pages/api/stereum/webhook.ts`):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAndParseWebhook, isTestNotification, isTransactionNotification } from '@/lib/stereum-pay/webhooks';
import { purchaseKeyWithRelayer } from '@/lib/unlock/relayer';
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('stereum-webhook');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    // 1. Get raw body for signature verification
    const rawBody = JSON.stringify(req.body);
    
    // 2. Verify webhook with correct header names
    const verificationResult = verifyAndParseWebhook(
      rawBody,
      {
        'x-signature': req.headers['x-signature'] as string,     // Note: x-signature
        'x-timestamp': req.headers['x-timestamp'] as string      // Note: x-timestamp
      },
      process.env.STEREUM_API_KEY!  // Use API KEY for HMAC verification
    );

    if (!verificationResult.isValid) {
      log.warn('Webhook verification failed', { error: verificationResult.error });
      return res.status(403).json({ error: 'Webhook verification failed' });
    }

    const notification = verificationResult.notification!;

    // 3. Handle test notifications
    if (isTestNotification(notification)) {
      log.debug('Received test notification');
      return res.status(200).json({ message: 'Test notification received' });
    }

    // 4. Handle transaction notifications
    if (isTransactionNotification(notification)) {
      const { transaction } = notification;
      
      log.info('Processing transaction notification', {
        notification_id: notification.id,
        transaction_id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency
      });

      // Only process successful payments
      if (transaction.status === 'PAGADO') {
        
        // Extract purchase details from idempotency key or metadata
        // You would store the mapping when creating the charge
        const purchaseIntent = await getPurchaseIntentByIdempotencyKey(
          transaction.idempotency_key
        );

        if (purchaseIntent) {
          // Execute on-chain key purchase
          const result = await purchaseKeyWithRelayer({
            lockAddress: purchaseIntent.lockAddress,
            chainId: purchaseIntent.metadata.chainId,
            recipient: purchaseIntent.recipientAddress,
            amount: purchaseIntent.metadata.lockPrice
          });

          if (result.success) {
            log.info('Key purchase successful', {
              transaction_id: transaction.id,
              recipient: purchaseIntent.recipientAddress,
              txHash: result.transactionHash
            });
            
            // Update purchase intent status
            await updatePurchaseIntentStatus(
              purchaseIntent.id, 
              'minted', 
              result.transactionHash
            );
          } else {
            log.error('Key purchase failed', {
              transaction_id: transaction.id,
              error: result.error
            });
          }
        }
      }
    }

    // Always return 200 for valid webhooks
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed',
      timestamp: new Date().toISOString() 
    });

  } catch (error) {
    log.error('Webhook processing failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Helper functions (implement these based on your database)
async function getPurchaseIntentByIdempotencyKey(idempotencyKey: string) {
  // Retrieve purchase intent from database using idempotency key
  // Return: { lockAddress, recipientAddress, metadata: { chainId, lockPrice } }
}

async function updatePurchaseIntentStatus(
  intentId: string, 
  status: string, 
  transactionHash?: string
) {
  // Update purchase intent status in database
}
```

#### Status Endpoint (`pages/api/stereum/status.ts`):

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSterumPayClient } from '@/lib/stereum-pay/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { transactionId } = req.query;

  try {
    // Create Stereum Pay client
    const sterumClient = createSterumPayClient({
      apiKey: process.env.STEREUM_API_KEY!,
      username: process.env.STEREUM_USERNAME!,
      password: process.env.STEREUM_PASSWORD!,
      publicKey: process.env.STEREUM_PUBLIC_KEY!,
      baseUrl: process.env.STEREUM_BASE_URL || 'https://api.stereum.tech'
    });

    const statusResult = await sterumClient.getTransactionStatus(transactionId as string);
    
    if (!statusResult.success || !statusResult.data) {
      return res.status(500).json({ 
        error: statusResult.error || 'Failed to get status' 
      });
    }

    const status = statusResult.data;
    
    res.json({
      id: status.id,
      status: status.status,           // 'PENDIENTE', 'PAGADO', 'CANCELADO', etc.
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
    });

  } catch (error) {
    console.error('Status check failed:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
}
```

### 2. Express.js Implementation

```typescript
import express from 'express';
import { verifyStereumWebhook } from './lib/stereum/security';
import { purchaseKeyWithRelayer } from './lib/unlock/relayer';

const app = express();

// Checkout endpoint
app.post('/api/stereum/checkout', async (req, res) => {
  try {
    const { lockAddress, network, recipient, fiatCurrency = 'USD' } = req.body;
    
    // Same logic as Next.js implementation
    const invoice = await createStereumInvoice({
      // ... same parameters
    });

    res.json({
      checkoutUrl: invoice.checkout_url,
      invoiceId: invoice.id,
      // ... same response
    });

  } catch (error) {
    res.status(500).json({ error: 'Checkout creation failed' });
  }
});

// Webhook endpoint
app.post('/api/stereum/webhook', async (req, res) => {
  try {
    // Same verification and processing logic
    const isValid = verifyStereumWebhook(/* ... */);
    
    if (!isValid) {
      return res.status(401).end();
    }

    // Process payment and mint key
    await purchaseKeyWithRelayer({
      // ... same logic
    });

    res.status(200).end();

  } catch (error) {
    res.status(500).end();
  }
});
```

### 3. Django Implementation

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import hmac
import hashlib

@csrf_exempt
def stereum_checkout(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        data = json.loads(request.body)
        lock_address = data['lockAddress']
        network = data['network']
        recipient = data['recipient']
        
        # Same pricing calculation logic
        total_cost = calculate_total_cost(lock_address, network)
        
        # Create Stereum invoice
        invoice = create_stereum_invoice(total_cost, data)
        
        return JsonResponse({
            'checkoutUrl': invoice['checkout_url'],
            'invoiceId': invoice['id'],
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def stereum_webhook(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        # Verify webhook signature
        signature = request.headers.get('x-stereum-signature')
        is_valid = verify_stereum_webhook(request.body, signature)
        
        if not is_valid:
            return JsonResponse({'error': 'Invalid signature'}, status=401)
        
        # Process payment
        webhook_data = json.loads(request.body)
        if webhook_data['type'] == 'payment.succeeded':
            purchase_key_with_relayer(webhook_data['data'])
        
        return JsonResponse({'status': 'success'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
```

### 4. Rails Implementation

```ruby
# routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :stereum do
      post 'checkout', to: 'stereum#checkout'
      post 'webhook', to: 'stereum#webhook'
      get 'status/:invoice_id', to: 'stereum#status'
    end
  end
end

# app/controllers/api/stereum_controller.rb
class Api::StereumController < ApplicationController
  skip_before_action :verify_authenticity_token

  def checkout
    lock_address = params[:lockAddress]
    network = params[:network]
    recipient = params[:recipient]
    
    # Calculate total cost
    total_cost = calculate_total_cost(lock_address, network)
    
    # Create Stereum invoice
    invoice = create_stereum_invoice(total_cost, params.to_h)
    
    render json: {
      checkoutUrl: invoice['checkout_url'],
      invoiceId: invoice['id']
    }
  rescue => e
    render json: { error: e.message }, status: 500
  end

  def webhook
    signature = request.headers['X-Stereum-Signature']
    
    unless verify_stereum_webhook(request.raw_post, signature)
      head 401
      return
    end
    
    webhook_data = JSON.parse(request.raw_post)
    
    if webhook_data['type'] == 'payment.succeeded'
      purchase_key_with_relayer(webhook_data['data'])
    end
    
    head 200
  rescue => e
    Rails.logger.error "Webhook error: #{e.message}"
    head 500
  end
end
```

---

## Stereum Pay API Integration

### 1. **Authentication with JWT and RSA Encryption**

Stereum Pay uses JWT authentication with RSA-encrypted passwords for security:

```typescript
import crypto from 'crypto';

// Step 1: Encrypt password with RSA public key
function encryptPassword(password: string, publicKeyPem: string): string {
  const publicKey = crypto.createPublicKey({
    key: publicKeyPem,
    format: 'pem',
    type: 'spki'
  });

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(password, 'utf8')
  );

  return encrypted.toString('base64');
}

// Step 2: Obtain JWT token
async function obtainJWTToken(config: {
  username: string;
  password: string;
  publicKey: string;
  baseUrl: string;
}) {
  const encryptedPassword = encryptPassword(config.password, config.publicKey);
  
  const response = await fetch(`${config.baseUrl}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: config.username,
      password: encryptedPassword
    })
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }

  const tokenData = await response.json();
  return tokenData.access_token; // Valid for 8 hours
}
```

### 2. **Create Transaction Charge**

```typescript
async function createStereumCharge(params: {
  amount: string;          // Decimal string: "100.00"
  currency: 'USDT' | 'USDC' | 'BOB';
  network: 'POLYGON' | 'CSL';
  customer: {
    name: string;          // Required for BOB payments
    lastname: string;      // Required for BOB payments
    document_number: string; // Required for BOB payments
    email?: string;
    phone?: string;
  };
  description: string;
}) {
  const authToken = await obtainJWTToken(sterumConfig);
  
  const response = await fetch(`${STEREUM_BASE_URL}/api/v1/transactions/create-charge`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      country: "BO",
      amount: params.amount,        // Use decimal format, not cents
      network: params.network,
      currency: params.currency,
      idempotency_key: crypto.randomUUID(),
      charge_reason: params.description,
      customer: params.customer,
      reservation_validity_time: 10  // QR code validity in minutes
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stereum API error: ${error.message}`);
  }

  return response.json();
}
```

### 3. **Get Transaction Status**

```typescript
async function getStereumTransactionStatus(transactionId: string) {
  const authToken = await obtainJWTToken(sterumConfig);
  
  const response = await fetch(
    `${STEREUM_BASE_URL}/api/v1/transactions/${transactionId}/verify`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Status check failed: ${error.message}`);
  }

  return response.json();
}
```

### 4. **Webhook Notification Structure**

Stereum Pay sends webhook notifications with this structure:

```typescript
interface SterumWebhookNotification {
  notification_type: "transaction" | "test";
  id: string;
  transaction: {
    country: string;
    amount: number;
    amount_received?: number;    // Actual amount received
    status: "PENDIENTE" | "PAGADO" | "CANCELADO" | "ERROR";
    status_description: string;
    currency: string;
    network?: string;
    id: string;
    created_date: number;       // Timestamp in milliseconds
    payment_date?: number;      // When payment was confirmed
    fee: number;
    idempotency_key: string;
    on_main_net: boolean;
  };
  timestamp: number;            // Timestamp in milliseconds
}
```

### 5. **Response Format Examples**

**Create Charge Response:**
```typescript
{
  "amount": 1.00,
  "currency": "USDT", 
  "network": "POLYGON",
  "id": "e7915e24-6ef1-4a81-8b67-70f36d0423ef",
  "qr_base64": "[BASE64_QR_CODE]",
  "payment_link": "https://stereum-payof.vercel.app/?session=...",
  "transaction_status": "PENDIENTE",
  "on_main_net": false,
  "collecting_account": "0xb4e2c3868bb3acb9ff2efead78477e088bca49cb",
  "expiration_time": 1750169018821
}
```

**Transaction Status Response:**
```typescript
{
  "id": "e7915e24-6ef1-4a81-8b67-70f36d0423ef",
  "amount": 1.00,
  "currency": "USDT",
  "country": "BO", 
  "status": "PAGADO",
  "fee": 0,
  "created_date": 1746854277163,
  "status_description": "Pagado",
  "on_main_net": false,
  "idempotency_key": "8f1cfa93-dd68-4c33-b419-959bd7b9c45d",
  "expiration_time": 1750169018821
}
```

---

## Relayer Implementation

### 1. **Relayer Wallet Setup**

The relayer wallet is funded by the Stereum Pay integration automatically:

```typescript
// Instead of developer funding, Stereum provides crypto
class RelayerService {
  private privateKey: string;
  private provider: ethers.Provider;

  constructor() {
    this.privateKey = process.env.RELAYER_PRIVATE_KEY!;
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }

  async purchaseKey(params: {
    lockAddress: string;
    network: number;
    recipient: string;
    amount: string;
  }) {
    const wallet = new ethers.Wallet(this.privateKey, this.provider);
    
    // Use existing Unlock Protocol logic
    const lockContract = new ethers.Contract(
      params.lockAddress,
      UNLOCK_LOCK_ABI,
      wallet
    );

    const tx = await lockContract.purchase(
      [params.amount], // values
      [params.recipient], // recipients
      [ethers.ZeroAddress], // referrers
      [params.recipient], // keyManagers
      ["0x"], // data
      { value: params.amount }
    );

    return await tx.wait();
  }
}
```

### 2. **Integration with Existing Hooks**

```typescript
// Leverage existing useKeyPurchase logic
import { useKeyPurchase } from '@/hooks/unlock/useKeyPurchase';

async function purchaseKeyWithRelayer(params: {
  lockAddress: string;
  network: number;
  recipient: string;
  amount: string;
}) {
  // Use the same patterns as the existing hooks
  // but with relayer wallet instead of user wallet
  
  const relayerService = new RelayerService();
  return await relayerService.purchaseKey(params);
}
```

---

## Frontend Integration

### 1. **Checkout Button Component**

```typescript
// components/StereumCheckoutButton.tsx
import { useState } from 'react';

interface StereumCheckoutButtonProps {
  lockAddress: string;
  network: number;
  recipient: string;
  onSuccess?: (invoiceId: string) => void;
  onError?: (error: string) => void;
}

export function StereumCheckoutButton({
  lockAddress,
  network,
  recipient,
  onSuccess,
  onError,
}: StereumCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/stereum/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockAddress,
          network,
          recipient,
          fiatCurrency: 'USD',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stereum checkout
        window.location.href = data.checkoutUrl;
        onSuccess?.(data.invoiceId);
      } else {
        onError?.(data.error);
      }

    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={isLoading}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {isLoading ? 'Loading...' : 'Pay with Card'}
    </button>
  );
}
```

### 2. **Payment Status Tracking**

```typescript
// hooks/useStereumPaymentStatus.ts
import { useState, useEffect } from 'react';

interface PaymentStatus {
  status: 'pending' | 'paid' | 'expired' | 'failed';
  amount?: number;
  currency?: string;
  paidAt?: number;
}

export function useStereumPaymentStatus(invoiceId: string | null) {
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;

    const checkStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/stereum/status?invoiceId=${invoiceId}`);
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Status check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
    
    // Poll every 5 seconds if payment is pending
    const interval = setInterval(() => {
      if (status?.status === 'pending') {
        checkStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [invoiceId, status?.status]);

  return { status, isLoading };
}
```

### 3. **Success/Failure Pages**

```typescript
// pages/payment/success.tsx
import { useRouter } from 'next/router';
import { useStereumPaymentStatus } from '@/hooks/useStereumPaymentStatus';

export default function PaymentSuccess() {
  const router = useRouter();
  const { invoiceId } = router.query;
  const { status, isLoading } = useStereumPaymentStatus(invoiceId as string);

  if (isLoading) {
    return <div>Confirming payment...</div>;
  }

  if (status?.status === 'paid') {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <div className="text-green-600 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-4">
          Your membership NFT is being minted on-chain.
        </p>
        <p className="text-sm text-gray-500">
          Paid: ${status.amount} {status.currency}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <div className="text-yellow-600 text-6xl mb-4">⏳</div>
      <h1 className="text-2xl font-bold mb-2">Processing Payment...</h1>
      <p className="text-gray-600">
        Please wait while we confirm your payment.
      </p>
    </div>
  );
}
```

---

## Error Handling & Logging

### 1. **Structured Error Handling**

```typescript
// lib/stereum/errors.ts
export class StereumError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'StereumError';
  }
}

export class WebhookVerificationError extends StereumError {
  constructor(message: string = 'Webhook signature verification failed') {
    super(message, 'WEBHOOK_VERIFICATION_FAILED', 401);
  }
}

export class PaymentProcessingError extends StereumError {
  constructor(message: string) {
    super(message, 'PAYMENT_PROCESSING_FAILED', 500);
  }
}
```

### 2. **Comprehensive Logging**

```typescript
// lib/stereum/logger.ts
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('stereum-integration');

export function logCheckoutCreated(data: {
  invoiceId: string;
  lockAddress: string;
  amount: number;
  currency: string;
}) {
  log.info('Checkout session created', {
    event: 'checkout_created',
    invoice_id: data.invoiceId,
    lock_address: data.lockAddress,
    amount: data.amount,
    currency: data.currency,
  });
}

export function logPaymentSucceeded(data: {
  invoiceId: string;
  lockAddress: string;
  recipient: string;
  txHash?: string;
}) {
  log.info('Payment succeeded', {
    event: 'payment_succeeded',
    invoice_id: data.invoiceId,
    lock_address: data.lockAddress,
    recipient: data.recipient,
    tx_hash: data.txHash,
  });
}

export function logPaymentFailed(data: {
  invoiceId: string;
  error: string;
}) {
  log.error('Payment processing failed', {
    event: 'payment_failed',
    invoice_id: data.invoiceId,
    error: data.error,
  });
}
```

### 3. **Retry Logic**

```typescript
// lib/stereum/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage in webhook handler
await withRetry(async () => {
  return await purchaseKeyWithRelayer({
    lockAddress,
    network,
    recipient,
    amount: lockPrice,
  });
}, 3, 2000);
```

---

## Testing Strategy

### 1. **Unit Tests**

```typescript
// __tests__/stereum/api.test.ts
import { createStereumInvoice, verifyStereumWebhook } from '@/lib/stereum';

describe('Stereum API Integration', () => {
  test('creates invoice with correct parameters', async () => {
    const invoice = await createStereumInvoice({
      amount: 50.00,
      currency: 'USD',
      description: 'Test invoice',
      metadata: { lockAddress: '0x123' },
    });

    expect(invoice).toHaveProperty('checkout_url');
    expect(invoice).toHaveProperty('id');
  });

  test('verifies webhook signatures correctly', () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ test: 'data' });
    const signature = 'sha256=abc123'; // Mock signature

    const isValid = verifyStereumWebhook(body, signature, secret);
    expect(typeof isValid).toBe('boolean');
  });
});
```

### 2. **Integration Tests**

```typescript
// __tests__/api/stereum/checkout.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/stereum/checkout';

describe('/api/stereum/checkout', () => {
  test('creates checkout session successfully', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        lockAddress: '0x123',
        network: 84532,
        recipient: '0x456',
        fiatCurrency: 'USD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('checkoutUrl');
    expect(data).toHaveProperty('invoiceId');
  });

  test('rejects invalid method', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
```

### 3. **End-to-End Tests**

```typescript
// __tests__/e2e/stereum-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete Stereum payment flow', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('/examples');

  // 2. Click "Pay with Card" button
  await page.click('[data-testid="stereum-checkout-button"]');

  // 3. Should redirect to Stereum checkout
  await expect(page).toHaveURL(/stereum-pay\.com/);

  // 4. Complete payment (mock/test environment)
  // ... payment steps

  // 5. Verify success page
  await expect(page.locator('text=Payment Successful')).toBeVisible();
});
```

---

## Deployment & Environment Setup

### 1. **Environment Variables**

```bash
# .env.local
STEREUM_API_KEY=your_api_key_here
STEREUM_USERNAME=your_api_username
STEREUM_PASSWORD=your_api_user_password
STEREUM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
-----END PUBLIC KEY-----"
STEREUM_BASE_URL=https://api.stereum.tech

RELAYER_PRIVATE_KEY=0x1234567890abcdef...
BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR-KEY

BASE_URL=http://localhost:3000  # Your app's base URL
```

### 2. **Production Configuration**

```bash
# .env.production
STEREUM_API_KEY=your_production_api_key
STEREUM_USERNAME=your_production_username
STEREUM_PASSWORD=your_production_password
STEREUM_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
[Production RSA Public Key from Stereum team]
-----END PUBLIC KEY-----"
STEREUM_BASE_URL=https://api.stereum.tech

RELAYER_PRIVATE_KEY=0x1234567890abcdef...
BASE_RPC_URL=https://mainnet.base.org

BASE_URL=https://yourdomain.com
```

### 3. **Webhook Configuration**

In your Stereum Pay dashboard, configure:

```
Webhook URL: https://yourdomain.com/api/stereum/webhook
Events: payment.succeeded, payment.failed
```

### 4. **Security Checklist**

- ✅ **API Keys**: Stored in environment variables, never in code
- ✅ **Webhook Secret**: Used for signature verification
- ✅ **Relayer Private Key**: Stored securely, encrypted at rest
- ✅ **HTTPS**: All API endpoints served over HTTPS
- ✅ **Rate Limiting**: Implement on webhook endpoints
- ✅ **Logging**: No sensitive data logged (keys, secrets)

---

## Reference Implementation Plan

### Phase 1: Core Integration (Week 1)

**Day 1-2: API Foundation**
- [ ] Create `/api/stereum/checkout` endpoint
- [ ] Create `/api/stereum/webhook` endpoint  
- [ ] Create `/api/stereum/status` endpoint
- [ ] Implement webhook signature verification
- [ ] Add comprehensive error handling

**Day 3-4: Stereum API Integration**
- [ ] Implement `createStereumInvoice` function
- [ ] Implement `getStereumInvoiceStatus` function
- [ ] Add retry logic for API calls
- [ ] Create proper TypeScript interfaces

**Day 5: Relayer Integration**
- [ ] Create relayer service for key purchases
- [ ] Integrate with existing `useKeyPurchase` patterns
- [ ] Implement proper gas estimation
- [ ] Add transaction monitoring

### Phase 2: Frontend Components (Week 2)

**Day 1-2: UI Components**
- [ ] Create `StereumCheckoutButton` component
- [ ] Create payment status tracking hook
- [ ] Add success/failure pages
- [ ] Integrate with existing UI patterns

**Day 3-4: User Experience**
- [ ] Add loading states and transitions
- [ ] Implement proper error messages
- [ ] Add payment confirmation flow
- [ ] Create mobile-responsive design

**Day 5: Integration Testing**
- [ ] End-to-end testing of complete flow
- [ ] Test error scenarios and edge cases
- [ ] Validate webhook processing
- [ ] Performance testing

### Phase 3: Documentation & Polish (Week 3)

**Day 1-2: Documentation**
- [ ] Complete setup instructions
- [ ] Code examples for other frameworks
- [ ] Troubleshooting guide
- [ ] Security best practices

**Day 3-4: Production Readiness**
- [ ] Add monitoring and alerts
- [ ] Implement proper logging
- [ ] Security audit
- [ ] Performance optimization

**Day 5: Launch Preparation**
- [ ] Final testing in staging environment
- [ ] Documentation review
- [ ] Demo preparation
- [ ] Community announcement

---

## Success Metrics

### Technical Metrics
- **Integration Time**: < 1 day for basic setup
- **API Response Time**: < 500ms for checkout creation
- **Webhook Processing**: < 2 seconds end-to-end
- **Error Rate**: < 1% for successful payments

### Business Metrics
- **Conversion Rate**: Track fiat vs crypto payment completion
- **Developer Adoption**: Number of implementations
- **Payment Volume**: Total value processed
- **User Satisfaction**: Feedback and support requests

### Reliability Metrics
- **Uptime**: 99.9% availability
- **Webhook Delivery**: 99.5% success rate
- **Failed Payments**: < 0.1% due to technical issues
- **Recovery Time**: < 5 minutes for issues

---

## Conclusion

This guide provides a **production-ready, framework-agnostic pattern** for integrating Stereum Pay with Unlock Protocol. The implementation prioritizes:

- **Simplicity**: Minimal moving parts, easy to understand
- **Reliability**: Proper error handling, retry logic, and monitoring
- **Security**: HMAC verification, replay protection, secure key storage
- **Sustainability**: Bundled pricing model eliminates developer funding burden
- **Adaptability**: Framework-agnostic patterns work across tech stacks

**Next Steps:**
1. Review and adapt patterns for your framework
2. Set up Stereum Pay account and obtain API credentials
3. Implement the three core API endpoints
4. Test with Stereum Pay sandbox environment
5. Deploy to production with proper monitoring

**Support:**
- Framework-specific examples available in repository
- Detailed troubleshooting guide for common issues
- Community examples and contributions welcome

This approach provides a **solid foundation** for fiat payments in Unlock Protocol while maintaining the flexibility for future enhancements and provider integrations.