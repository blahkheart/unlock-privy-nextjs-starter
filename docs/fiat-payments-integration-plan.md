# Universal Fiat Payment Integration for Unlock Protocol

## Overview

This document outlines a comprehensive plan to create a **pluggable, provider-agnostic fiat payment system** for the entire Unlock Protocol ecosystem. The goal is to enable any Unlock developer to add "Pay with Fiat" functionality for their locks with minimal configuration, without being tied to any specific payment provider or codebase implementation.

## Core Vision

Instead of building a Stereum Pay-specific integration tied to this codebase, we propose creating:

1. **A standardized protocol specification** that any fiat payment provider can implement
2. **Implementation standards and reference examples** that show how to implement the pattern
3. **Reference implementations** (starting with Stereum Pay) that demonstrate the standard
4. **Universal integration points** that work across the entire Unlock ecosystem

This allows any payment provider to become "Unlock-compatible" by implementing the standard interface, and any Unlock developer to enable fiat payments with minimal code changes.

## Architecture

### High-Level Flow

```
┌─────────────┐
│   User      │
│  (Buyer)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│          Unlock Checkout (with Fiat Plugin)              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Crypto Payment │ Fiat Payment (Provider Option) │  │
│  └───────────────────────────────────────────────────┘  │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│       Fiat Plugin Service (Universal Interface)          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ POST /fiat/checkout                                │ │
│  │ GET  /fiat/orders/:referenceId                     │ │
│  │ POST /fiat/webhook (provider → service)            │ │
│  └────────────────────────────────────────────────────┘ │
└──────┬──────────────────────┬───────────────────────────┘
       │                      │
       ▼                      ▼
┌─────────────────┐  ┌──────────────────────┐
│ Payment Provider│  │ Fulfillment Service   │
│  (Stereum Pay,  │  │ (Mints Keys On-Chain) │
│   Stripe, etc.) │  │                      │
└─────────────────┘  └──────────────────────┘
       │                      │
       │                      ▼
       │              ┌──────────────┐
       │              │  Unlock Lock │
       │              │  Smart Contract│
       └──────────────►              │
                    ┌──────────────┘
```

### Key Principles

1. **Provider-Agnostic**: The core interface doesn't care if you use Stereum Pay, Stripe, or any future provider
2. **Stateless Webhooks**: Payment providers send standardized events to the fulfillment service
3. **Server-Driven Minting**: After fiat settlement, the service mints keys on-chain using a relayer wallet
4. **Idempotent Operations**: All operations can be safely retried without duplicate charges or mints
5. **Multi-Chain Support**: Works across all Unlock-supported networks

## Core Components

### 1. Protocol Specification: "Unlock Fiat Provider Interface"

A public specification document that defines:

- **Standard Payment States**: `created → pending → paid → minting → fulfilled | failed | refunded`
- **ReferenceId System**: Provider-agnostic unique identifier that links fiat payment → order → on-chain mint
- **Webhook Event Schema**: Standardized event structure all providers must emit
- **Security Requirements**: HMAC verification, replay protection, idempotency keys
- **Error Handling**: Standardized error codes and retry strategies
- **Compliance Guidelines**: KYC/AML considerations, data minimization

**Document Location**: `docs/unlock-fiat-provider-interface.md` (to be created)

### 2. Implementation Guidelines & Code Examples

A specification document with:

- **Standard Interfaces**: TypeScript interface definitions that any implementation must follow
- **Implementation Guidelines**: Step-by-step patterns for building fulfillment logic
- **Code Examples**: Reference implementations that developers can adapt
- **Provider-Specific Guides**: Examples for Stereum Pay, Stripe, PayPal, PayStack, etc.
- **Security Patterns**: HMAC verification, replay protection, idempotency implementations

**Document Location**: `docs/unlock-fiat-provider-implementation-guide.md` (to be created)

**Standard Interface Specification**:

Developers implementing fiat payment fulfillment should follow this interface pattern:

```typescript
// Standard interface that all implementations must follow
interface FiatProviderAdapter {
  // Create a checkout session
  createSession(input: {
    lockAddress: string;
    network: number;
    recipient: string;
    quantity: number;
    fiatCurrency: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    checkoutUrl: string;
    referenceId: string;
    expiresAt: number;
  }>;

  // Verify webhook signature
  verifySignature(headers: Record<string, string>, rawBody: string): boolean;

  // Map provider-specific webhook to standard event
  mapWebhook(payload: unknown): StandardFiatEvent;

  // Optional: Refund support
  refund?(referenceId: string, reason?: string): Promise<{ success: boolean }>;
}

interface StandardFiatEvent {
  eventId: string;
  referenceId: string;
  status: "created" | "pending" | "paid" | "failed" | "refunded";
  amount: {
    fiat: string;
    crypto: string;
    currency: string;
  };
  paymentId: string;
  occurredAt: number;
  metadata?: Record<string, unknown>;
}
```

**Implementation Approach**: Developers implement these interfaces in their own codebase following the specification and code examples. No packages to maintain, no dependencies to update.

### 3. Reference Implementation Examples

Code examples and patterns that developers can reference:

- **Stereum Pay Implementation Example**: Complete code example showing how to implement the standard for Stereum Pay
- **Stripe Implementation Example**: Pattern for implementing with Stripe
- **Multi-Provider Pattern**: How to support multiple providers in one implementation
- **Next.js API Routes Example**: Complete working example for Next.js
- **Express.js Example**: Complete working example for Express.js

**Approach**: These are **reference examples**, not maintained packages. Developers copy, adapt, and maintain their own implementations based on these patterns.

## Standardized APIs

### Fiat Plugin Service API

The fulfillment service exposes these standardized endpoints:

#### `POST /fiat/checkout`

Creates a fiat checkout session for a lock purchase.

**Request Body**:

```json
{
  "lockAddress": "0x123...",
  "network": 84532,
  "recipient": "0xabc...",
  "quantity": 1,
  "referrer": "0xdef...",
  "fiatCurrency": "USD",
  "metadata": {
    "userId": "user123",
    "campaign": "spring-sale"
  }
}
```

**Response**:

```json
{
  "referenceId": "order_abc123",
  "checkoutUrl": "https://stereum-pay.com/checkout/xyz",
  "statusUrl": "https://fiat-service.unlock-protocol.com/fiat/orders/order_abc123",
  "expiresAt": 1234567890
}
```

#### `GET /fiat/orders/:referenceId`

Gets order status and on-chain minting details.

**Response**:

```json
{
  "referenceId": "order_abc123",
  "status": "fulfilled",
  "payment": {
    "status": "paid",
    "amount": "50.00",
    "currency": "USD",
    "paymentId": "pay_xyz789",
    "paidAt": 1234567890
  },
  "fulfillment": {
    "status": "fulfilled",
    "txHash": "0xdef456...",
    "tokenIds": ["1"],
    "network": 84532,
    "fulfilledAt": 1234567900
  }
}
```

**Status Values**:

- `pending`: Checkout session created, awaiting payment
- `paid`: Fiat payment confirmed, minting queued
- `minting`: On-chain purchase transaction submitted
- `fulfilled`: Key successfully minted
- `failed`: Payment or minting failed
- `refunded`: Payment refunded (on-chain key may be revoked if policy allows)

#### `POST /fiat/webhook`

Receives standardized webhook events from payment providers.

**Headers**:

- `X-Fiat-Provider`: Provider identifier (e.g., "stereum", "stripe")
- `X-Signature`: HMAC signature of request body
- `X-Timestamp`: Unix timestamp (for replay protection)

**Request Body** (Standardized):

```json
{
  "eventId": "evt_123",
  "referenceId": "order_abc123",
  "status": "paid",
  "amount": {
    "fiat": "50.00",
    "crypto": "0.001",
    "currency": "USD"
  },
  "paymentId": "pay_xyz789",
  "occurredAt": 1234567890,
  "metadata": {}
}
```

**Response**: `200 OK` (processed asynchronously)

#### Internal Fulfillment Job

When webhook status is `paid`, the service:

1. Validates the order hasn't been fulfilled (idempotency check)
2. Fetches current on-chain key price using viem
3. Validates price hasn't increased beyond tolerance
4. Executes on-chain purchase:
   - **ETH locks**: `lock.purchase([keyPrice], [recipient], [referrer], [keyManager], [data], { value: keyPrice })`
   - **ERC-20 locks**: `token.approve(lockAddress, keyPrice)` → `lock.purchase([keyPrice], ..., { value: 0 })`
5. Stores transaction hash and token IDs
6. Marks order as `fulfilled`

## Provider Adapter: Stereum Pay

### Reference Implementation

The Stereum Pay adapter serves as the **reference implementation** of the Fiat Provider Interface.

**Reference Implementation**: Complete code example showing how to implement the standard for Stereum Pay

**Implementation Details**:

1. **Session Creation**: Maps Unlock checkout request to Stereum Pay invoice/checkout session
2. **Webhook Verification**: Validates Stereum Pay HMAC signatures per their documentation
3. **Event Mapping**: Converts Stereum Pay webhook events to standardized `StandardFiatEvent` format
4. **FX Calculation**: Handles fiat → crypto conversion using Stereum's rates or external oracle

**Configuration**:

```typescript
// Reference implementation example - developers implement their own
// See specification for full interface requirements

class StereumPayAdapter implements FiatProviderAdapter {
  // Implementation following standard spec
  // ... (see full example in Fulfillment Service Implementation section)
}

const adapter = new StereumPayAdapter({
  apiKey: process.env.STEREUM_API_KEY,
  webhookSecret: process.env.STEREUM_WEBHOOK_SECRET,
  baseUrl: "https://api.stereum-pay.com", // or sandbox
});
```

### Provider Setup Guide

#### Stereum Pay Setup

**Step 1: Create Account & Get Credentials**

1. **Register Account**: Sign up at https://stereum-pay.com (or follow instructions in `MI_STEREUM_PAY-EN.pdf`)
2. **Navigate to Developer Settings**: Access your dashboard and go to API settings
3. **Obtain Credentials**:
   - **API Key**: Used to create checkout sessions and interact with Stereum Pay API
   - **Webhook Secret**: Used to verify webhook signatures from Stereum Pay
   - Copy both values and store them securely

**Step 2: Configure Webhook URL**

In your Stereum Pay dashboard:

1. Navigate to Webhooks section
2. Set webhook URL to your fulfillment service endpoint:
   ```
   https://your-fulfillment-service.com/fiat/webhook
   ```
3. Select required webhook events:
   - `payment.created` - When a payment is initiated
   - `payment.succeeded` - When payment completes successfully
   - `payment.failed` - When payment fails
   - `payment.refunded` - When a refund is issued (optional)

**Step 3: Environment Configuration**

Set environment variables in your fulfillment service:

```bash
# .env file for fulfillment service
STEREUM_API_KEY=sk_live_xxx_xxx_xxx          # From Stereum Pay dashboard
STEREUM_WEBHOOK_SECRET=whsec_xxx_xxx_xxx     # From Stereum Pay dashboard
RELAYER_PRIVATE_KEY=0x1234...                # Your relayer wallet private key
BASE_SEPOLIA_RPC_URL=https://...             # Blockchain RPC endpoint
```

**Step 4: Sandbox vs Production**

- **Sandbox/Test**: Use test API keys and `baseUrl: "https://api-sandbox.stereum-pay.com"`
- **Production**: Use live API keys and `baseUrl: "https://api.stereum-pay.com"`

#### Other Providers Setup

The setup process is similar for any provider:

1. **Register** with the payment provider (Stripe, PayPal, etc.)
2. **Get API Credentials** from their developer dashboard:
   - API Key / Client ID (for creating sessions)
   - Webhook Secret (for verifying webhooks)
3. **Configure Webhook** in provider dashboard pointing to:
   ```
   https://your-fulfillment-service.com/fiat/webhook
   ```
4. **Set Environment Variables** following the same pattern:
   ```bash
   STRIPE_API_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   PAYPAL_CLIENT_ID=...
   PAYPAL_WEBHOOK_SECRET=...
   ```

**Provider Registration Checklist:**

For each provider you want to support:

- [ ] Account created and verified
- [ ] API key/credentials obtained
- [ ] Webhook secret obtained
- [ ] Webhook URL configured in provider dashboard
- [ ] Required webhook events enabled
- [ ] Test payment completed successfully
- [ ] Webhook received and verified in fulfillment service

## Fulfillment Service Implementation

### What is the Fulfillment Service?

The **Fulfillment Service** is not a separate service to deploy. Instead, it's a **specification and implementation guide** that developers add to their existing backend application (Next.js API routes, Express.js, etc.).

**Think of it as**: Code you add to your own app that bridges fiat payment providers (Stereum Pay, Stripe, PayPal, PayStack, etc.) and blockchain (Unlock Protocol). When a fiat payment succeeds, your backend automatically mints the NFT key on-chain.

### How It Works

1. **Add API Routes to Your App** - Implement the fulfillment endpoints in your existing backend:

   - `POST /api/fiat/checkout` - Creates payment sessions
   - `GET /api/fiat/orders/:id` - Gets order status
   - `POST /api/fiat/webhook` - Receives payment webhooks

2. **Follow the Implementation Standard** - Implement the fulfillment logic following the specification and code examples:

   - Review the standard interface specification
   - Look at reference implementation examples for your payment provider
   - Implement the interface in your own codebase

3. **Use Your API Keys** - Simply configure your payment provider API keys (from Stereum Pay, Stripe, PayPal, PayStack, etc.) as environment variables

4. **That's It!** - Your existing app deployment handles everything. No Docker, no separate services, no special hosting needed.

### Example: Next.js Implementation

In a Next.js app, you'd add these API routes to your `pages/api/` or `app/api/` directory:

```typescript
// pages/api/fiat/checkout.ts (or app/api/fiat/checkout/route.ts)
// Example implementation following the standard specification

// Implement the FiatProviderAdapter interface following the spec
class StereumPayAdapter implements FiatProviderAdapter {
  private apiKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; webhookSecret: string; baseUrl: string }) {
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl;
  }

  async createSession(input: {
    lockAddress: string;
    network: number;
    recipient: string;
    quantity: number;
    fiatCurrency: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    checkoutUrl: string;
    referenceId: string;
    expiresAt: number;
  }> {
    // Implement according to Stereum Pay API documentation
    // Following the standard interface spec
    const response = await fetch(`${this.baseUrl}/checkout`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: /* calculate from lock price */,
        currency: input.fiatCurrency,
        metadata: {
          lockAddress: input.lockAddress,
          network: input.network,
          recipient: input.recipient,
          quantity: input.quantity,
          ...input.metadata,
        },
      }),
    });
    const data = await response.json();
    return {
      checkoutUrl: data.checkout_url,
      referenceId: data.reference_id,
      expiresAt: data.expires_at,
    };
  }

  verifySignature(headers: Record<string, string>, rawBody: string): boolean {
    // Implement HMAC verification following Stereum Pay documentation
    // and the security requirements in the specification
    const signature = headers["x-stereum-signature"];
    const expectedSignature = /* calculate HMAC using webhookSecret */;
    return signature === expectedSignature;
  }

  mapWebhook(payload: unknown): StandardFiatEvent {
    // Map Stereum Pay webhook format to StandardFiatEvent
    // Following the standard event schema
    const data = payload as any;
    return {
      eventId: data.id,
      referenceId: data.reference_id,
      status: this.mapStatus(data.status),
      amount: {
        fiat: data.amount.fiat,
        crypto: data.amount.crypto,
        currency: data.currency,
      },
      paymentId: data.payment_id,
      occurredAt: data.created_at,
      metadata: data.metadata,
    };
  }

  private mapStatus(status: string): "created" | "pending" | "paid" | "failed" | "refunded" {
    // Map provider status to standard status
    // Implementation follows spec mapping rules
  }
}

const adapter = new StereumPayAdapter({
  apiKey: process.env.STEREUM_API_KEY!,
  webhookSecret: process.env.STEREUM_WEBHOOK_SECRET!,
  baseUrl: process.env.STEREUM_API_URL || "https://api.stereum-pay.com",
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { lockAddress, network, recipient, quantity, fiatCurrency } = req.body;

  const session = await adapter.createSession({
    lockAddress,
    network,
    recipient,
    quantity,
    fiatCurrency,
  });

  res.json(session);
}
```

```typescript
// pages/api/fiat/webhook.ts
// Example webhook handler following the standard specification

import { executeKeyPurchase } from "@/lib/unlock"; // Your existing unlock logic

const adapter = new StereumPayAdapter({
  apiKey: process.env.STEREUM_API_KEY!,
  webhookSecret: process.env.STEREUM_WEBHOOK_SECRET!,
  baseUrl: process.env.STEREUM_API_URL || "https://api.stereum-pay.com",
});

export default async function handler(req, res) {
  // Verify webhook signature (security requirement from spec)
  const isValid = adapter.verifySignature(
    req.headers,
    JSON.stringify(req.body)
  );
  if (!isValid) return res.status(401).end();

  // Convert to standard event format
  const event = adapter.mapWebhook(req.body);

  if (event.status === "paid") {
    // Execute on-chain purchase using your existing unlock hooks/logic
    await executeKeyPurchase({
      lockAddress: event.metadata.lockAddress,
      network: event.metadata.network,
      recipient: event.metadata.recipient,
    });
  }

  res.status(200).end();
}
```

**Note**: These are reference implementations following the standard. Developers implement their own versions based on the specification and their payment provider's API documentation.

**No special infrastructure needed** - these run as part of your existing Next.js deployment (Vercel, Netlify, Railway, your own server, etc.).

### Multi-Provider Support

Want to support multiple payment providers? Implement adapters for each following the standard interface:

```typescript
// pages/api/fiat/checkout.ts
// Example: Supporting multiple providers following the standard

// Each developer implements their own adapters following the spec
const adapters = {
  stereum: new StereumPayAdapter({
    apiKey: process.env.STEREUM_API_KEY!,
    webhookSecret: process.env.STEREUM_WEBHOOK_SECRET!,
    baseUrl: process.env.STEREUM_API_URL || "https://api.stereum-pay.com",
  }),
  stripe: new StripeAdapter({
    // Your Stripe implementation following the standard interface
    apiKey: process.env.STRIPE_API_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  }),
  paystack: new PayStackAdapter({
    // Your PayStack implementation following the standard interface
    apiKey: process.env.PAYSTACK_API_KEY!,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET!,
  }),
};

export default async function handler(req, res) {
  const { provider = "stereum", ...params } = req.body;
  const adapter = adapters[provider];

  const session = await adapter.createSession(params);
  res.json(session);
}
```

**Note**: Each developer implements their own adapters following the standard specification. Reference implementations are provided as examples, but developers maintain their own code.

### What You Need

1. **API Keys from Payment Providers**:

   - Register with Stereum Pay → Get `STEREUM_API_KEY` and `STEREUM_WEBHOOK_SECRET`
   - Register with Stripe → Get `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET`
   - Register with PayPal → Get `PAYPAL_CLIENT_ID` and `PAYPAL_WEBHOOK_SECRET`
   - Register with PayStack → Get `PAYSTACK_API_KEY` and `PAYSTACK_WEBHOOK_SECRET`
   - etc.

2. **Relayer Wallet** (for on-chain transactions):

   - A wallet that will purchase keys and pay gas fees
   - Store the private key securely (environment variable): `RELAYER_PRIVATE_KEY=0x...`
   - Fund it with enough crypto to cover key purchases + gas

3. **Add Fulfillment Routes** to your existing backend following the specification

**That's all!** No Docker, no separate services, no special hosting. Your existing app deployment handles everything.

### Relayer Wallet Explained

The **Relayer Wallet** is a special wallet that:

- Belongs to the developer who implements the fulfillment service
- Automatically purchases Unlock keys when fiat payments succeed
- Pays for all blockchain transaction fees (gas)
- Must be funded by the developer with enough crypto to cover key purchases

**Security:** The private key must be stored securely (environment variables, AWS Secrets Manager, etc.) - never commit it to code!

## Integration Points

### Unlock Checkout Integration

**Plugin Registration**:

```typescript
// In Unlock Checkout config
{
  locks: { [lockAddress]: { network } },
  fiat: {
    enabled: true,
    provider: 'stereum',
    endpoint: 'https://fiat-service.unlock-protocol.com',
    options: {
      // Provider-specific options
      currency: 'USD',
      allowedCountries: ['US', 'CA', 'EU'],
    },
  },
}
```

**UI Flow**:

1. User selects "Pay with Card" or "Pay with Fiat"
2. Checkout calls `/fiat/checkout` with lock details
3. Redirects to provider's hosted checkout or embeds widget
4. User completes payment
5. Returns to Checkout with `referenceId` in URL
6. Checkout polls `/fiat/orders/:referenceId` or uses SSE
7. UI updates: "Payment confirmed" → "Minting..." → "Membership active! 🔑"

## Security & Compliance

### Webhook Security

- **HMAC Verification**: All webhooks must be signed with provider's secret
- **Replay Protection**: Timestamp-based validation (e.g., 5-minute window)
- **Idempotency**: Each `eventId` processed exactly once
- **Rate Limiting**: Prevent webhook spam attacks

### On-Chain Security

- **Price Validation**: Re-validate on-chain price at mint time vs. quoted price
- **Slippage Protection**: Reject fulfillment if price increased beyond tolerance
- **Gas Limits**: Enforce maximum gas per transaction to prevent DoS
- **Relayer Security**: Private keys stored in secure vault (AWS Secrets Manager, Vault, etc.)

### Compliance Considerations

- **KYC/AML**: Payment providers handle compliance (we don't store PII)
- **Data Minimization**: Store only `referenceId`, `lockAddress`, `recipient`, `txHash`
- **Privacy**: No user email/name required for on-chain minting
- **Audit Trail**: Full event log for compliance and debugging

### Refunds & Chargebacks

- **Payment Provider Handles**: Chargebacks processed by provider (e.g., Stereum Pay)
- **On-Chain Response**: Optional revocation via `expireAndRefundFor` if lock supports it
- **Grace Period**: Allow 30-day window for chargebacks before finalizing order

## Developer Experience

### Implementation Steps

**Prerequisites:**

1. Register with your chosen payment provider(s) and obtain API credentials (see [Provider Setup Guide](#provider-setup-guide))
   - Stereum Pay → Get `STEREUM_API_KEY` and `STEREUM_WEBHOOK_SECRET`
   - Stripe → Get `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET`
   - PayPal → Get `PAYPAL_CLIENT_ID` and `PAYPAL_WEBHOOK_SECRET`
   - PayStack → Get `PAYSTACK_API_KEY` and `PAYSTACK_WEBHOOK_SECRET`
   - Or any other supported provider
2. Create and fund a relayer wallet for on-chain transactions
3. Have an existing backend application (Next.js, Express.js, etc.)

**Steps:**

1. **Review the Standard Specification:**

   - Read the `Unlock Fiat Provider Interface` specification document
   - Review reference implementation examples for your chosen payment provider
   - Understand the standard interfaces and event schemas

2. **Add environment variables to your `.env`:**

   ```bash
   STEREUM_API_KEY=your_api_key_here
   STEREUM_WEBHOOK_SECRET=your_webhook_secret_here
   RELAYER_PRIVATE_KEY=0x_your_relayer_wallet_private_key
   BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

3. **Implement fulfillment API routes** in your backend following the specification:

   - Implement the `FiatProviderAdapter` interface following the standard
   - Use reference implementation examples as a guide
   - Adapt the code examples to your payment provider's API
   - Maintain your own implementation (no external packages needed)

4. **Configure your Checkout** to point to your API routes:

   ```typescript
   fiat: {
     enabled: true,
     provider: 'stereum', // or 'stripe', 'paypal', 'paystack', etc.
     endpoint: '/api/fiat' // Your own API routes
   }
   ```

5. **Configure webhook URL** in your payment provider dashboard to point to your webhook endpoint:
   ```
   https://your-app.com/api/fiat/webhook
   ```

**That's it!** Your existing app deployment handles everything. No Docker, no separate services needed.

### Adding Support for New Payment Providers

To add support for a payment provider not yet documented:

1. **Review the Standard Specification** - Understand the `FiatProviderAdapter` interface requirements
2. **Implement the Interface** - Create an adapter class that implements all required methods:
   - `createSession()` - Creates checkout sessions with your provider
   - `verifySignature()` - Verifies webhook signatures from your provider
   - `mapWebhook()` - Maps your provider's webhook format to `StandardFiatEvent`
3. **Submit a Reference Example** (Optional) - If you want to contribute, submit your implementation as a reference example for others
4. **Use in Your App** - Integrate your adapter into your fulfillment routes

No central registry or approval needed - developers implement and maintain their own adapters following the standard.

## Implementation Phases

### Phase 1: Foundation (Months 1-2)

- [ ] Publish **Fiat Provider Interface** specification document (EIP-style standard)
- [ ] Create **Implementation Guidelines** document with patterns and best practices
- [ ] Write **Stereum Pay Reference Implementation** example (complete code)
- [ ] Write **Stripe Reference Implementation** example (complete code)
- [ ] Create **Fulfillment Service** reference implementation examples (Next.js, Express.js)
- [ ] Write comprehensive documentation with code samples

**Deliverables**:

- Specification document (standard, like EIP)
- Implementation guidelines document
- Reference implementation examples (code samples developers can adapt)
- Example Next.js app showing complete implementation
- No packages to maintain - developers implement their own

### Phase 2: Unlock Checkout Integration (Months 3-4)

- [ ] Create **Checkout Integration Guidelines** - Document how to add fiat payment options to Unlock Checkout
- [ ] Provide **Reference Implementation Examples** - Code examples showing fiat payment integration patterns
- [ ] Document **UI Component Patterns** - Examples for fiat payment selection UI
- [ ] Document **Status Polling/SSE Patterns** - Implementation examples for status tracking
- [ ] Document **Error Handling Patterns** - Examples for retry logic and error management
- [ ] Beta test with select Unlock developers

**Deliverables**:

- Integration guidelines document
- Reference implementation examples for Checkout integration
- Updated Unlock Checkout documentation with fiat payment patterns
- Beta documentation

### Phase 3: Community Ecosystem (Months 5-6)

- [ ] **Additional Provider Examples**: Community contributions of reference implementations (Stripe, PayPal, PayStack, etc.)
- [ ] **Documentation Hub**: Centralized location for specification and reference examples
- [ ] **Community Examples Directory**: Curated list of community-submitted reference implementations
- [ ] Public launch and announcement

**Deliverables**:

- Community-contributed reference implementations for 2-3 additional providers
- Public documentation site with specification and examples
- Community examples directory

### Phase 4: Advanced Features (Months 7+)

- [ ] **Meta-Transaction Support**: Option for user-signed purchases (no relayer gas)
- [ ] **Multi-Currency**: Support for EUR, GBP, etc.
- [ ] **Subscription Payments**: Recurring fiat payments for subscription locks
- [ ] **Fraud Detection**: ML-based fraud scoring
- [ ] **Chargeback Automation**: Auto-revoke keys on chargeback

## Success Metrics

- **Adoption**: Number of locks offering fiat payments
- **Conversion**: Fiat checkout conversion rate vs. crypto-only
- **Revenue**: Total fiat revenue processed
- **Reliability**: Uptime, webhook success rate, fulfillment success rate
- **Developer Satisfaction**: Ease of setup, documentation quality

## Open Questions & Considerations

1. **Relayer Funding**: Who funds the relayer wallet? (Merchant, Unlock treasury, user-gasless?)
2. **Provider Certification**: Should providers be "certified" by Unlock before listing?
3. **Fee Model**: Transaction fee for fulfillment service? (e.g., 1% of fiat amount)
4. **Multi-Chain Strategy**: One relayer per chain, or shared relayer with multi-chain support?
5. **Refund Policy**: Should on-chain keys be revoked on refund, or left active?
6. **Documentation Format**: Should implementation examples be centralized in one repo, or distributed across community contributions?

## Next Steps

1. **Review & Approve**: Get feedback from Unlock core team and community
2. **Spec Finalization**: Lock down Fiat Provider Interface specification
3. **MVP Scoping**: Define Phase 1 MVP scope (what's essential vs. nice-to-have)
4. **Resource Allocation**: Assign developers, design reviewers, etc.
5. **Timeline Refinement**: Adjust phases based on resources and priorities

## References

- **Stereum Pay Documentation**: `docs/MI_STEREUM_PAY-EN.pdf`
- **Unlock Protocol Docs**: https://docs.unlock-protocol.com
- **Current Codebase**: `hooks/unlock/useKeyPurchase.ts` (reference implementation)
- **Privy Integration**: `lib/blockchain/providers/privy-viem.ts` (wallet integration pattern)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Authors**: Unlock Protocol Team  
**Status**: Proposal - Awaiting Review
