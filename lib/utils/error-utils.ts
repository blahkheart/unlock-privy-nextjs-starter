/**
 * Error handling utilities for consistent error processing
 */

export interface ErrorResult {
  message: string;
  code?: string;
  details?: any;
}

/**
 * Extract a user-friendly error message from various error types
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  
  // Handle ethers errors
  if (error?.reason) return error.reason;
  if (error?.error?.message) return error.error.message;
  
  // Handle viem errors
  if (error?.shortMessage) return error.shortMessage;
  if (error?.details) return error.details;
  
  // Handle standard errors
  if (error?.message) return error.message;
  
  return "An unknown error occurred";
}

/**
 * Parse blockchain transaction errors
 */
export function parseTransactionError(error: any): ErrorResult {
  const message = extractErrorMessage(error);
  
  // Common error patterns
  if (message.includes("user rejected") || message.includes("User denied")) {
    return {
      message: "Transaction was rejected by user",
      code: "USER_REJECTED",
    };
  }
  
  if (message.includes("insufficient funds")) {
    return {
      message: "Insufficient funds for transaction",
      code: "INSUFFICIENT_FUNDS",
    };
  }
  
  if (message.includes("gas")) {
    return {
      message: "Transaction failed due to gas estimation issues",
      code: "GAS_ERROR",
      details: message,
    };
  }
  
  return {
    message,
    code: "TRANSACTION_ERROR",
  };
}

/**
 * Safe async error wrapper
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<{ data?: T; error?: ErrorResult }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    return {
      error: parseTransactionError(error),
      data: fallback,
    };
  }
}
