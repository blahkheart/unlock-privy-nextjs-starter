/**
 * Utility function to format wallet addresses consistently
 */
export function formatWalletAddress(address: string | null | undefined): string {
  if (!address) return "No wallet";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if an address is the zero address
 */
export function isZeroAddress(address: string): boolean {
  return address === "0x0000000000000000000000000000000000000000";
}
