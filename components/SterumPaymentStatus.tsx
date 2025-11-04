/**
 * Stereum Payment Status Component
 * Tracks and displays payment status with real-time updates
 */

import { useState, useEffect } from 'react';
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('sterum-payment-status');

interface PaymentStatusData {
  stereum: {
    id: string;
    status: string;
    statusDescription: string;
    amount: number;
    currency: string;
    createdAt: string;
    expiresAt: string;
    paidAt?: string;
  };
  overallStatus: string;
  isPaymentComplete: boolean;
  isExpired: boolean;
  canRetry: boolean;
}

interface SterumPaymentStatusProps {
  transactionId: string;
  onPaymentComplete?: (data: PaymentStatusData) => void;
  onPaymentExpired?: () => void;
  pollInterval?: number; // in milliseconds
  className?: string;
}

export function SterumPaymentStatus({
  transactionId,
  onPaymentComplete,
  onPaymentExpired,
  pollInterval = 5000, // 5 seconds
  className = ''
}: SterumPaymentStatusProps) {
  const [status, setStatus] = useState<PaymentStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Fetch payment status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/stereum/status?transactionId=${transactionId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }

      const statusData: PaymentStatusData = await response.json();
      setStatus(statusData);
      setError(null);

      // Trigger callbacks
      if (statusData.isPaymentComplete) {
        onPaymentComplete?.(statusData);
      } else if (statusData.isExpired) {
        onPaymentExpired?.();
      }

      log.debug('Payment status updated', {
        transaction_id: transactionId,
        status: statusData.stereum.status,
        overall_status: statusData.overallStatus,
        is_complete: statusData.isPaymentComplete
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch status';
      setError(errorMessage);
      log.error('Failed to fetch payment status', { error: errorMessage, transaction_id: transactionId });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time remaining
  const calculateTimeRemaining = () => {
    if (!status?.stereum.expiresAt) return '';

    const expiryTime = new Date(status.stereum.expiresAt).getTime();
    const now = Date.now();
    const remaining = expiryTime - now;

    if (remaining <= 0) return 'Expired';

    const minutes = Math.floor(remaining / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Setup polling and timer
  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Setup polling interval
    const pollTimer = setInterval(() => {
      if (status && !status.isPaymentComplete && !status.isExpired) {
        fetchStatus();
      }
    }, pollInterval);

    // Setup countdown timer
    const countdownTimer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(countdownTimer);
    };
  }, [transactionId, pollInterval]);

  // Update countdown when status changes
  useEffect(() => {
    if (status) {
      setTimeRemaining(calculateTimeRemaining());
    }
  }, [status]);

  const getStatusDisplay = () => {
    if (!status) return null;

    const { stereum, overallStatus, isPaymentComplete, isExpired } = status;

    if (isPaymentComplete) {
      return {
        icon: '✅',
        title: 'Payment Completed',
        description: 'Your payment has been processed successfully',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    if (isExpired) {
      return {
        icon: '⏰',
        title: 'Payment Expired',
        description: 'This payment link has expired',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (stereum.status === 'PENDIENTE') {
      return {
        icon: '⏳',
        title: 'Awaiting Payment',
        description: 'Please complete your payment to continue',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    }

    return {
      icon: '❓',
      title: 'Unknown Status',
      description: stereum.statusDescription,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    };
  };

  if (isLoading) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600">Checking payment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 border border-red-200 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600">
          <span>❌</span>
          <span className="font-medium">Error checking status:</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStatus}
          className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) return null;

  const statusDisplay = getStatusDisplay();
  if (!statusDisplay) return null;

  const { icon, title, description, color, bgColor, borderColor } = statusDisplay;

  return (
    <div className={`p-4 border rounded-lg ${bgColor} ${borderColor} ${className}`}>
      <div className="space-y-3">
        {/* Status Header */}
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className={`font-semibold ${color}`}>{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Amount:</span>
            <p className="text-gray-900">
              {status.stereum.amount} {status.stereum.currency}
            </p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-900">{status.stereum.statusDescription}</p>
          </div>
        </div>

        {/* Timer for pending payments */}
        {status.stereum.status === 'PENDIENTE' && !status.isExpired && (
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700">Time remaining:</div>
            <div className="text-lg font-mono font-bold text-orange-600">
              {timeRemaining}
            </div>
          </div>
        )}

        {/* Payment completion details */}
        {status.isPaymentComplete && status.stereum.paidAt && (
          <div className="text-sm text-gray-600">
            <strong>Paid at:</strong> {new Date(status.stereum.paidAt).toLocaleString()}
          </div>
        )}

        {/* Transaction ID */}
        <div className="text-xs text-gray-500">
          <strong>Transaction ID:</strong>
          <div className="font-mono break-all">{status.stereum.id}</div>
        </div>
      </div>
    </div>
  );
}