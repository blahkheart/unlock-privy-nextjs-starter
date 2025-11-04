/**
 * Stereum Pay API client
 * Implements all Stereum Pay API endpoints with correct request/response formats
 */

import { getLogger } from '@/lib/utils/logger';
import { createAuthHeaders } from './auth';
import type {
  SterumAuthConfig,
  CreateChargeRequest,
  CreateChargeResponse,
  TransactionStatusResponse,
  CurrencyConversionRequest,
  CurrencyConversionResponse,
  SterumErrorResponse,
  OperationResult
} from './types';

const log = getLogger('stereum-api');

/**
 * Stereum Pay API Client
 */
export class SterumPayClient {
  constructor(private config: SterumAuthConfig) {}

  /**
   * Create a new charge/transaction
   */
  async createCharge(request: CreateChargeRequest): Promise<OperationResult<CreateChargeResponse>> {
    try {
      log.info('Creating Stereum Pay charge', {
        amount: request.amount,
        currency: request.currency,
        network: request.network,
        idempotency_key: request.idempotency_key
      });

      const authResult = await createAuthHeaders(this.config);
      if (!authResult.success || !authResult.data) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      const response = await fetch(`${this.config.baseUrl}/api/v1/transactions/create-charge`, {
        method: 'POST',
        headers: authResult.data,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData: SterumErrorResponse = await response.json();
        log.error('Create charge failed', {
          status: response.status,
          error: errorData.message,
          path: errorData.path
        });

        return {
          success: false,
          error: `Charge creation failed: ${errorData.message}`
        };
      }

      const chargeData: CreateChargeResponse = await response.json();
      
      log.info('Charge created successfully', {
        transaction_id: chargeData.id,
        amount: chargeData.amount,
        currency: chargeData.currency,
        network: chargeData.network,
        status: chargeData.transaction_status,
        expiration_time: new Date(chargeData.expiration_time).toISOString()
      });

      return {
        success: true,
        data: chargeData
      };

    } catch (error) {
      log.error('Create charge error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Charge creation failed'
      };
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<OperationResult<TransactionStatusResponse>> {
    try {
      log.debug('Getting transaction status', { transaction_id: transactionId });

      const authResult = await createAuthHeaders(this.config);
      if (!authResult.success || !authResult.data) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      const response = await fetch(
        `${this.config.baseUrl}/api/v1/transactions/${transactionId}/verify`,
        {
          method: 'GET',
          headers: authResult.data
        }
      );

      if (!response.ok) {
        const errorData: SterumErrorResponse = await response.json();
        log.error('Get transaction status failed', {
          status: response.status,
          error: errorData.message,
          transaction_id: transactionId
        });

        return {
          success: false,
          error: `Status check failed: ${errorData.message}`
        };
      }

      const statusData: TransactionStatusResponse = await response.json();
      
      log.debug('Transaction status retrieved', {
        transaction_id: statusData.id,
        status: statusData.status,
        amount: statusData.amount,
        created_date: new Date(statusData.created_date).toISOString()
      });

      return {
        success: true,
        data: statusData
      };

    } catch (error) {
      log.error('Get transaction status error', { error, transaction_id: transactionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Cancel a transaction
   */
  async cancelTransaction(transactionId: string): Promise<OperationResult<TransactionStatusResponse>> {
    try {
      log.info('Cancelling transaction', { transaction_id: transactionId });

      const authResult = await createAuthHeaders(this.config);
      if (!authResult.success || !authResult.data) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      const response = await fetch(
        `${this.config.baseUrl}/api/v1/transactions/${transactionId}/cancel`,
        {
          method: 'POST',
          headers: authResult.data
        }
      );

      if (!response.ok) {
        const errorData: SterumErrorResponse = await response.json();
        log.error('Cancel transaction failed', {
          status: response.status,
          error: errorData.message,
          transaction_id: transactionId
        });

        return {
          success: false,
          error: `Transaction cancellation failed: ${errorData.message}`
        };
      }

      const cancelData: TransactionStatusResponse = await response.json();
      
      log.info('Transaction cancelled successfully', {
        transaction_id: cancelData.id,
        status: cancelData.status
      });

      return {
        success: true,
        data: cancelData
      };

    } catch (error) {
      log.error('Cancel transaction error', { error, transaction_id: transactionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction cancellation failed'
      };
    }
  }

  /**
   * Convert currency (BOB to USDT/USDC)
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<OperationResult<CurrencyConversionResponse>> {
    try {
      log.debug('Converting currency', {
        from: request.from,
        to: request.to,
        amount: request.amount
      });

      const authResult = await createAuthHeaders(this.config);
      if (!authResult.success || !authResult.data) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      const params = new URLSearchParams({
        country: request.country,
        from: request.from,
        to: request.to,
        amount: request.amount.toString()
      });

      const response = await fetch(
        `${this.config.baseUrl}/api/v1/currency/convert?${params}`,
        {
          method: 'GET',
          headers: authResult.data
        }
      );

      if (!response.ok) {
        const errorData: SterumErrorResponse = await response.json();
        log.error('Currency conversion failed', {
          status: response.status,
          error: errorData.message
        });

        return {
          success: false,
          error: `Currency conversion failed: ${errorData.message}`
        };
      }

      const conversionData: CurrencyConversionResponse = await response.json();
      
      log.debug('Currency converted successfully', {
        from_amount: conversionData.amount,
        from_currency: conversionData.from_currency,
        to_amount: conversionData.converted_amount,
        to_currency: conversionData.to_currency,
        exchange_rate: conversionData.exchange_rate
      });

      return {
        success: true,
        data: conversionData
      };

    } catch (error) {
      log.error('Currency conversion error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Currency conversion failed'
      };
    }
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<OperationResult<boolean>> {
    try {
      log.debug('Testing Stereum Pay API connection');

      const authResult = await createAuthHeaders(this.config);
      if (!authResult.success || !authResult.data) {
        return {
          success: false,
          error: authResult.error || 'Authentication failed'
        };
      }

      // Test with a simple currency conversion call
      const testResult = await this.convertCurrency({
        country: "BO",
        from: "BOB",
        to: "USDT",
        amount: 100
      });

      if (testResult.success) {
        log.info('Stereum Pay API connection test successful');
        return {
          success: true,
          data: true
        };
      } else {
        return {
          success: false,
          error: testResult.error || 'Connection test failed'
        };
      }

    } catch (error) {
      log.error('API connection test error', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

/**
 * Create a configured Stereum Pay client instance
 */
export function createSterumPayClient(config: SterumAuthConfig): SterumPayClient {
  return new SterumPayClient(config);
}

/**
 * Utility function to generate a unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Validate customer data for BOB payments
 */
export function validateCustomerData(
  customer: CreateChargeRequest['customer'],
  currency: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Customer data is required for BOB payments
  if (currency === 'BOB') {
    if (!customer.name || customer.name.length > 60) {
      errors.push('Customer name is required and must be max 60 characters for BOB payments');
    }
    
    if (!customer.lastname || customer.lastname.length > 60) {
      errors.push('Customer lastname is required and must be max 60 characters for BOB payments');
    }
    
    if (!customer.document_number || customer.document_number.length > 20) {
      errors.push('Customer document_number is required and must be max 20 characters for BOB payments');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format amount for Stereum Pay API (always as decimal string)
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}