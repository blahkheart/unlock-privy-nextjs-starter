/**
 * Stereum Pay checkout button component
 * Handles fiat payment initiation for Unlock Protocol keys
 */

import { useState } from 'react';
import { useSmartWalletSelection } from '@/hooks/useSmartWalletSelection';
import { getLogger } from '@/lib/utils/logger';
import { ErrorMessage } from './ui/ErrorMessage';

const log = getLogger('sterum-checkout-button');

interface SterumCheckoutButtonProps {
  lockAddress: string;
  lockName: string;
  keyPrice: string;           // Display price (e.g., "0.01 ETH")
  currency?: 'USDT' | 'USDC' | 'BOB';
  network?: 'POLYGON' | 'CSL';
  onSuccess?: (data: { transactionId: string; paymentLink: string }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface CustomerInfo {
  name: string;
  lastname: string;
  document_number: string;
  email?: string;
  phone?: string;
}

export function SterumCheckoutButton({
  lockAddress,
  lockName,
  keyPrice,
  currency = 'USDT',
  network = 'POLYGON',
  onSuccess,
  onError,
  disabled = false,
  className = ''
}: SterumCheckoutButtonProps) {
  const wallet = useSmartWalletSelection();
  const selectedAddress = wallet?.address;
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    lastname: '',
    document_number: '',
    email: '',
    phone: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleInitiateCheckout = () => {
    if (!selectedAddress) {
      setError('Please connect your wallet first');
      return;
    }

    // For BOB payments, we need customer information
    if (currency === 'BOB') {
      setShowCustomerForm(true);
    } else {
      // For crypto payments, customer info is optional
      proceedWithCheckout({
        name: 'Crypto User',
        lastname: 'Anonymous',
        document_number: '00000000'
      });
    }
  };

  const proceedWithCheckout = async (customerData: CustomerInfo) => {
    setIsLoading(true);
    setError(null);

    try {
      log.info('Initiating Stereum checkout', {
        lockAddress,
        recipient: selectedAddress,
        currency,
        network,
        customer_name: customerData.name
      });

      const response = await fetch('/api/stereum/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockAddress,
          recipient: selectedAddress,
          currency,
          network,
          customerInfo: customerData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout');
      }

      const checkoutData = await response.json();

      log.info('Stereum checkout created', {
        transaction_id: checkoutData.transactionId,
        amount: checkoutData.amount,
        currency: checkoutData.currency
      });

      // Redirect to Stereum payment page
      window.location.href = checkoutData.paymentLink;

      // Call success callback
      onSuccess?.({
        transactionId: checkoutData.transactionId,
        paymentLink: checkoutData.paymentLink
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Checkout failed';
      log.error('Stereum checkout failed', { error: errorMessage });
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setShowCustomerForm(false);
    }
  };

  const handleCustomerFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields for BOB
    if (currency === 'BOB') {
      if (!customerInfo.name || !customerInfo.lastname || !customerInfo.document_number) {
        setError('Name, lastname, and document number are required for BOB payments');
        return;
      }
    }

    proceedWithCheckout(customerInfo);
  };

  if (showCustomerForm) {
    return (
      <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold">Customer Information</h3>
        <p className="text-sm text-gray-600">
          Required for {currency} payments in Bolivia
        </p>
        
        <form onSubmit={handleCustomerFormSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={customerInfo.lastname}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastname: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Number *
            </label>
            <input
              type="text"
              required
              maxLength={20}
              value={customerInfo.document_number}
              onChange={(e) => setCustomerInfo(prev => ({ ...prev, document_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID/Document number"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+591 12345678"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomerForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Creating...' : 'Continue to Payment'}
            </button>
          </div>
        </form>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleInitiateCheckout}
        disabled={disabled || isLoading || !selectedAddress}
        className={`
          w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors
          ${disabled || isLoading || !selectedAddress
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
          }
          ${className}
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating Payment...
          </span>
        ) : !selectedAddress ? (
          'Connect Wallet First'
        ) : (
          <>
            💳 Pay with Card ({currency})
            <div className="text-sm opacity-90">
              {lockName} • {keyPrice}
            </div>
          </>
        )}
      </button>

      {error && (
        <ErrorMessage>
          {error}
        </ErrorMessage>
      )}

      <div className="text-xs text-gray-500 text-center">
        Powered by Stereum Pay • Secure fiat payments for crypto
      </div>
    </div>
  );
}