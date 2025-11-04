/**
 * Stereum Pay Demo Component
 * Demonstrates the complete fiat payment flow for Unlock Protocol
 */

import { useState } from 'react';
import { SterumCheckoutButton } from './SterumCheckoutButton';
import { SterumPaymentStatus } from './SterumPaymentStatus';
import { useSmartWalletSelection } from '@/hooks/useSmartWalletSelection';
import { ErrorMessage } from './ui/ErrorMessage';

export function SterumPayDemo() {
  const wallet = useSmartWalletSelection();
  const selectedAddress = wallet?.address;
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'USDT' | 'USDC' | 'BOB'>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<'POLYGON' | 'CSL'>('POLYGON');
  const [paymentComplete, setPaymentComplete] = useState(false);

  // Demo lock configuration
  const demoLock = {
    address: '0x1234567890123456789012345678901234567890', // Demo address
    name: 'Premium Membership',
    keyPrice: '0.01 ETH',
    description: 'Access to premium features and content'
  };

  const handleCheckoutSuccess = (data: { transactionId: string; paymentLink: string }) => {
    setActiveTransactionId(data.transactionId);
    // Payment link redirect happens automatically in the component
  };

  const handleCheckoutError = (error: string) => {
    console.error('Checkout error:', error);
  };

  const handlePaymentComplete = () => {
    setPaymentComplete(true);
  };

  const handlePaymentExpired = () => {
    setActiveTransactionId(null);
  };

  const resetDemo = () => {
    setActiveTransactionId(null);
    setPaymentComplete(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          💳 Stereum Pay Integration Demo
        </h2>
        <p className="text-gray-600">
          Accept fiat payments for Unlock Protocol memberships
        </p>
      </div>

      {/* Lock Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
            🔐
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{demoLock.name}</h3>
            <p className="text-gray-600 text-sm mt-1">{demoLock.description}</p>
            <div className="flex items-center space-x-4 mt-3 text-sm">
              <span className="bg-gray-100 px-2 py-1 rounded">
                <strong>Price:</strong> {demoLock.keyPrice}
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                {demoLock.address.slice(0, 8)}...{demoLock.address.slice(-6)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Configuration */}
      {!activeTransactionId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Payment Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USDT">USDT (Tether)</option>
                <option value="USDC">USDC (USD Coin)</option>
                <option value="BOB">BOB (Boliviano)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <select
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value as any)}
                disabled={selectedCurrency === 'BOB'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="POLYGON">Polygon</option>
                <option value="CSL">CSL (Bolivia)</option>
              </select>
            </div>
          </div>

          {selectedCurrency === 'BOB' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">ℹ️</span>
                <div className="text-sm text-blue-800">
                  <strong>BOB payments:</strong> Customer information (name, lastname, document number) 
                  is required for payments in Bolivian currency.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Connection Status */}
      {!selectedAddress && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-yellow-800">
            <span>⚠️</span>
            <span className="font-medium">Wallet not connected</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">
            Please connect your wallet to proceed with the payment.
          </p>
        </div>
      )}

      {/* Connected Wallet Info */}
      {selectedAddress && !activeTransactionId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-800">
            <span>✅</span>
            <span className="font-medium">Wallet Connected</span>
          </div>
          <p className="text-green-700 text-sm mt-1 font-mono">
            {selectedAddress}
          </p>
          <p className="text-green-600 text-xs mt-1">
            The membership NFT will be sent to this address after payment completion.
          </p>
        </div>
      )}

      {/* Checkout Button */}
      {!activeTransactionId && !paymentComplete && (
        <SterumCheckoutButton
          lockAddress={demoLock.address}
          lockName={demoLock.name}
          keyPrice={demoLock.keyPrice}
          currency={selectedCurrency}
          network={selectedCurrency === 'BOB' ? 'CSL' : selectedNetwork}
          onSuccess={handleCheckoutSuccess}
          onError={handleCheckoutError}
          className="w-full"
        />
      )}

      {/* Payment Status */}
      {activeTransactionId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Payment Status</h4>
            <button
              onClick={resetDemo}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Reset Demo
            </button>
          </div>
          
          <SterumPaymentStatus
            transactionId={activeTransactionId}
            onPaymentComplete={handlePaymentComplete}
            onPaymentExpired={handlePaymentExpired}
          />
        </div>
      )}

      {/* Success State */}
      {paymentComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-800 mb-2">
            Payment Successful!
          </h3>
          <p className="text-green-700 mb-4">
            Your membership NFT has been minted and sent to your wallet.
          </p>
          <div className="space-y-2 text-sm text-green-600">
            <p>• Check your wallet for the new NFT</p>
            <p>• You now have access to premium features</p>
            <p>• Transaction recorded on the blockchain</p>
          </div>
          <button
            onClick={resetDemo}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Try Another Payment
          </button>
        </div>
      )}

      {/* Integration Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Integration Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>JWT + RSA Authentication</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>HMAC Webhook Verification</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Multi-currency Support</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Real-time Status Updates</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Bundled Pricing Model</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-500">✓</span>
            <span>Automatic NFT Minting</span>
          </div>
        </div>
      </div>
    </div>
  );
}