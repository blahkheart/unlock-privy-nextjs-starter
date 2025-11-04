/**
 * TypeScript interfaces for Stereum Pay API integration
 * Based on official Stereum Pay API documentation v2.4
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface SterumAuthConfig {
  apiKey: string;
  username: string;
  password: string;
  publicKey: string;        // RSA public key for password encryption
  baseUrl: string;          // https://api.stereum.tech
}

export interface JWTTokenRequest {
  username: string;
  password: string;         // RSA encrypted password
}

export interface JWTTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;       // 480 minutes (8 hours)
  expires_at: number;
  provider_id: "stereum";
  sign_in_provider: "stereum";
  user: {
    id: string;
    status: "ACTIVO";
    user_type: "EMPRESA";
    role: "ROLE_API";
    email: string;
    username: string;
    name: string;
  };
  session_id: string;
}

// ============================================================================
// TRANSACTION CREATION TYPES
// ============================================================================

export interface CreateChargeRequest {
  country: "BO";                           // Country code (default BO)
  amount: string;                          // Decimal amount as string (e.g., "100.00")
  network: "POLYGON" | "CSL";              // Payment network
  currency: "USDT" | "USDC" | "BOB";       // Payment currency
  idempotency_key: string;                 // UUID for uniqueness (max 50 chars)
  charge_reason: string;                   // Description (60 chars for BOB, 200 for crypto)
  callback?: string;                       // Optional callback URL
  reservation_validity_time?: number;      // QR validity in minutes (default 10)
  customer: {
    name: string;                          // Required for BOB payments (max 60 chars)
    lastname: string;                      // Required for BOB payments (max 60 chars)
    document_number: string;               // Required for BOB payments (max 20 chars)
    email?: string;                        // Optional
    phone?: string;                        // Optional
    address?: string;                      // Optional
    city?: string;                         // Optional
    country?: string;                      // Optional 2-digit code
    state?: string;                        // Optional
    zip_code?: string;                     // Optional
  };
}

export interface CreateChargeResponse {
  amount: number;
  currency: string;
  network: string;
  id: string;                              // Transaction ID (36 chars)
  qr_base64: string;                       // Base64 QR code
  payment_link: string;                    // Payment URL
  transaction_status: TransactionStatus;
  on_main_net: boolean;                    // true for mainnet, false for testnet
  collecting_account?: string;             // Wallet address for USDT/USDC
  expiration_time: number;                 // Expiration timestamp in milliseconds
}

// ============================================================================
// TRANSACTION STATUS TYPES
// ============================================================================

export type TransactionStatus = 
  | "INICIADO"      // Initial state
  | "PENDIENTE"     // Pending payment
  | "PAGADO"        // Payment completed
  | "CANCELADO"     // Payment cancelled/expired
  | "ERROR";        // Error in processing

export interface TransactionStatusResponse {
  id: string;
  amount: number;
  currency: string;
  country: string;
  status: TransactionStatus;
  fee: number;
  created_date: number;                    // Timestamp in milliseconds
  status_description: string;              // Human readable status
  on_main_net: boolean;
  idempotency_key: string;
  expiration_time: number;
  payment_date?: number;                   // Timestamp when paid
}

// ============================================================================
// WEBHOOK NOTIFICATION TYPES
// ============================================================================

export interface SterumWebhookNotification {
  notification_type: "transaction" | "test";
  id: string;
  transaction: {
    country: string;
    amount: number;
    amount_received?: number;              // Actual amount received
    status_description: string;
    on_main_net: boolean;
    fee: number;
    idempotency_key: string;
    currency: string;
    network?: string;                      // Optional field
    id: string;
    created_date: number;
    payment_date?: number;
    status: TransactionStatus;
  };
  timestamp: number;                       // Timestamp in milliseconds
}

export interface SterumTestNotification {
  notification_type: "test";
  notification: {
    hello: "world";
  };
  id: string;
  timestamp: number;
}

// ============================================================================
// CURRENCY CONVERSION TYPES
// ============================================================================

export interface CurrencyConversionRequest {
  country: "BO";
  from: "BOB";
  to: "USDT" | "USDC";
  amount: number;                          // Amount to convert
}

export interface CurrencyConversionResponse {
  country: string;
  from_currency: string;
  to_currency: string;
  amount: number;
  converted_amount: number;
  exchange_rate: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface SterumErrorResponse {
  timestamp: string;                       // ISO timestamp
  status: number;                          // HTTP status code
  error: string;                           // Error type
  message: string;                         // Error message (often in Spanish)
  path: string;                            // API endpoint path
}

// ============================================================================
// INTEGRATION SPECIFIC TYPES
// ============================================================================

/**
 * Configuration for Unlock Protocol + Stereum Pay integration
 */
export interface UnlockSterumConfig {
  stereum: SterumAuthConfig;
  unlock: {
    lockAddress: string;
    chainId: number;
    keyPrice: bigint;                      // Price in wei
    currency: "USDT" | "USDC" | "BOB";
    bundledPriceUSD: number;               // Total price including crypto conversion
  };
  webhooks: {
    apiKey: string;                        // Used for HMAC webhook verification
    endpoint: string;                      // Your webhook endpoint URL
  };
}

/**
 * Purchase intent linking Stereum payment with Unlock key
 */
export interface UnlockPurchaseIntent {
  id: string;                              // Unique intent ID
  lockAddress: string;
  recipientAddress: string;                // Wallet address to receive the key
  sterumTransactionId?: string;            // Set after Stereum charge creation
  sterumIdempotencyKey: string;            // Unique ID for Stereum integration
  amount: number;                          // Amount in fiat currency
  currency: "USDT" | "USDC" | "BOB";
  status: PurchaseIntentStatus;
  metadata: {
    userEmail?: string;
    lockName: string;
    keyDuration: number;                   // Duration in seconds
    chainId: number;
    lockPriceWei: string;                  // Lock price in wei (as string for precision)
    customerInfo: CreateChargeRequest['customer'];
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  mintedAt?: Date;                         // When the key was minted on-chain
  transactionHash?: string;                // Blockchain transaction hash
}

export type PurchaseIntentStatus =
  | "pending"                              // Waiting for payment
  | "paid"                                 // Payment completed, pending key mint
  | "minted"                               // Key successfully minted
  | "expired"                              // Payment window expired
  | "cancelled"                            // Purchase cancelled
  | "failed";                              // Payment or minting failed

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Standard operation result pattern
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  transactionHash?: string;                // For blockchain operations
}

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  isValid: boolean;
  notification?: SterumWebhookNotification;
  error?: string;
}

/**
 * JWT token with expiration tracking
 */
export interface AuthToken {
  token: string;
  expiresAt: Date;
  refreshToken: string;
  isExpired: () => boolean;
}

/**
 * RSA encryption utilities
 */
export interface RSAEncryptionConfig {
  publicKey: string;                       // PEM format public key
  algorithm: "RSA-OAEP";                   // Encryption algorithm
  encoding: "base64";                      // Output encoding
}