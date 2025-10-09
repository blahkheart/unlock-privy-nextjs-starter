/**
 * Simple toast notification utility
 * Uses browser's built-in functionality for simplicity
 */

export const toast = {
  success: (message: string) => {
    console.log(`✅ ${message}`);
    if (typeof window !== "undefined") {
      // You can integrate with a toast library later
      // For now, using browser alert as fallback
      // alert(message);
    }
  },
  error: (message: string) => {
    console.error(`❌ ${message}`);
    if (typeof window !== "undefined") {
      // You can integrate with a toast library later
      // alert(message);
    }
  },
};
