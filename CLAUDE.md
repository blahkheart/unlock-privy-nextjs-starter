# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks

### Testing
- No test framework configured - check with user before adding tests

## Code Architecture

### Tech Stack
- **Framework**: Next.js 14 with TypeScript
- **Authentication**: Privy (embedded + external wallets)
- **Blockchain**: Unlock Protocol on multiple chains
- **Libraries**: Ethers.js v6 + Viem for dual blockchain support
- **Styling**: Tailwind CSS with custom theme extensions

### Project Structure

**Core Configuration**:
- `lib/blockchain/config/` - Centralized multi-chain configuration with automatic Unlock factory resolution
- `lib/blockchain/shared/` - ABIs, transaction utilities, and shared blockchain logic
- `lib/utils/` - Logging, error handling, address formatting, and utility functions

**Wallet Integration**:
- Smart wallet selection prioritizing external wallets over embedded ones
- Privy provider wraps entire app in `_app.tsx`
- Dual library support (Ethers + Viem) with seamless wallet integration

**Unlock Protocol Hooks** (`hooks/unlock/`):
- **Read hooks**: Check keys, manager status, pricing (`useHasValidKey`, `useIsLockManager`, etc.)
- **Write hooks**: Purchase keys, deploy locks, manage memberships (`useKeyPurchase`, `useDeployLock`, etc.)
- **Composite hook**: `useUnlockReadOperations` for multiple read operations

### Key Patterns

**Environment Variables**:
- `NEXT_PUBLIC_PRIVY_APP_ID` (required) - Privy authentication
- `NEXT_PUBLIC_CHAIN_ID` (optional, defaults to 84532 Base Sepolia)
- `NEXT_PUBLIC_LOG_LEVEL` (optional, defaults to debug)
- Custom RPC URLs: `NEXT_PUBLIC_[CHAIN]_RPC_URL` (e.g., `NEXT_PUBLIC_BASE_RPC_URL`)

**Multi-Chain Support**:
- 8 pre-configured networks with automatic Unlock factory address resolution
- Uses `getClientConfig()` to get current chain, `requireUnlockFactoryAddress()` for factory addresses
- Environment-based chain selection with fallback to Base Sepolia

**Hook Usage Pattern**:
```typescript
const { functionName, isLoading, error, isSuccess } = useHookName();
const result = await functionName(params);
if (result.success) { /* handle success */ }
```

**Logging**:
- Structured logging with `getLogger("component-name")`
- Automatic sanitization of sensitive data (private keys, secrets)
- Environment-based log levels (debug in dev, silent in prod)

**Error Handling**:
- Hooks return standardized `{ success: boolean, transactionHash?: string, error?: string }` results
- User-friendly error messages with automatic blockchain error parsing
- Comprehensive error utilities in `lib/utils/error-utils.ts`

### Important Implementation Notes

- Always use `@/` imports for project files (configured in tsconfig.json)
- Wallet detection uses `useSmartWalletSelection` for optimal UX
- Transaction receipts automatically parsed for token IDs and addresses
- All Unlock operations include automatic permission checks
- Privy wallets create embedded wallets for all users by default
- Factory addresses are automatically resolved per chain - never hardcode them