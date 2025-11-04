/**
 * Relayer service for purchasing Unlock Protocol keys
 * Uses viem to execute on-chain transactions with a private key wallet
 * 
 * NOTE: This is a server-side implementation that uses a private key
 * (different from the frontend hooks which use Privy wallets)
 */

import { createWalletClient, createPublicClient, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia, mainnet, polygon } from 'viem/chains';
import { getChainConfig, type ChainConfig } from '@/lib/blockchain/config';
import { COMPLETE_LOCK_ABI, ERC20_ABI } from '@/lib/blockchain/shared/abi-definitions';
import { extractTokenIdsFromReceipt } from '@/lib/blockchain/shared/transaction-utils';
import { getLogger } from '@/lib/utils/logger';
import { zeroAddress } from 'viem';

const log = getLogger('relayer-service');

export interface RelayerPurchaseParams {
  lockAddress: Address;
  recipient: Address;
  chainId: number;
  lockPriceWei: bigint;
  keyManager?: Address;
  referrer?: Address;
  data?: Hex;
}

export interface RelayerPurchaseResult {
  success: boolean;
  transactionHash?: string;
  tokenIds?: bigint[];
  error?: string;
}

/**
 * Purchase Unlock Protocol key using relayer wallet
 * 
 * This function:
 * 1. Creates a viem wallet client from private key
 * 2. Gets the lock's token address (ETH vs ERC20)
 * 3. Handles ERC20 approvals if needed
 * 4. Executes the purchase transaction
 * 5. Waits for confirmation and extracts token IDs
 */
export async function purchaseKeyWithRelayer(
  params: RelayerPurchaseParams
): Promise<RelayerPurchaseResult> {
  try {
    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerPrivateKey) {
      throw new Error('RELAYER_PRIVATE_KEY environment variable is required');
    }

    // Validate private key format
    if (!relayerPrivateKey.startsWith('0x') || relayerPrivateKey.length !== 66) {
      throw new Error('Invalid RELAYER_PRIVATE_KEY format. Must be 66 characters (0x + 64 hex chars)');
    }

    log.info('Initializing relayer purchase', {
      lockAddress: params.lockAddress,
      recipient: params.recipient,
      chainId: params.chainId,
      lockPrice: params.lockPriceWei.toString()
    });

    // Get chain configuration
    const chainConfig = getChainConfig(params.chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain ID: ${params.chainId}`);
    }

    // Map chain ID to viem chain object
    const CHAIN_MAP: Record<number, any> = {
      1: mainnet,
      8453: base,
      84532: baseSepolia,
      137: polygon,
    };

    const viemChain = CHAIN_MAP[params.chainId] || {
      id: chainConfig.chainId,
      name: chainConfig.name,
      network: chainConfig.name.toLowerCase().replace(/\s+/g, '-'),
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: {
        default: { http: [chainConfig.rpcUrl] },
        public: { http: [chainConfig.rpcUrl] },
      },
      blockExplorers: {
        default: {
          name: 'Explorer',
          url: chainConfig.blockExplorer,
        },
      },
    };

    // Create account from private key
    const account = privateKeyToAccount(relayerPrivateKey as Hex);
    
    log.debug('Relayer account created', {
      address: account.address,
      chainId: params.chainId
    });

    // Create viem clients
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(chainConfig.rpcUrl)
    });

    const walletClient = createWalletClient({
      account,
      chain: viemChain,
      transport: http(chainConfig.rpcUrl)
    });

    // Check relayer wallet balance
    const balance = await publicClient.getBalance({ address: account.address });
    log.debug('Relayer wallet balance', {
      address: account.address,
      balance: balance.toString(),
      balanceETH: (Number(balance) / 1e18).toFixed(6)
    });

    // Get lock token address and key price to determine if it's ETH or ERC20
    const [tokenAddressResult, lockKeyPriceResult] = await Promise.all([
      publicClient.readContract({
        address: params.lockAddress,
        abi: COMPLETE_LOCK_ABI,
        functionName: 'tokenAddress',
        args: []
      }),
      publicClient.readContract({
        address: params.lockAddress,
        abi: COMPLETE_LOCK_ABI,
        functionName: 'keyPrice',
        args: []
      })
    ]);
    
    const tokenAddress = tokenAddressResult as unknown as Address;
    const lockKeyPrice = lockKeyPriceResult as unknown as bigint;

    // Use the lock's actual key price if different from provided
    const keyPrice = lockKeyPrice > 0n ? lockKeyPrice : params.lockPriceWei;
    const isETH = tokenAddress === zeroAddress;

    log.info('Lock token information', {
      tokenAddress,
      isETH,
      keyPrice: keyPrice.toString(),
      providedPrice: params.lockPriceWei.toString()
    });

    // Handle ERC20 token approval if needed
    if (!isETH) {
      log.info('Lock uses ERC20 token, checking allowance', { tokenAddress });
      
      // Check current allowance
      const allowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [account.address, params.lockAddress]
      })) as unknown as bigint;

      log.debug('Current ERC20 allowance', {
        tokenAddress,
        allowance: allowance.toString(),
        required: keyPrice.toString()
      });
      
      if (allowance < keyPrice) {
        log.info('Approving ERC20 token', {
          tokenAddress,
          amount: keyPrice.toString()
        });

        const approveTx = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [params.lockAddress, keyPrice],
          account: account,
          chain: viemChain
        });

        log.info('Waiting for approval transaction confirmation', { transactionHash: approveTx });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        log.info('ERC20 token approved', { transactionHash: approveTx });
      } else {
        log.debug('ERC20 token already approved', { tokenAddress });
      }
    }

    // Prepare purchase parameters
    const recipient = params.recipient;
    const keyManager = params.keyManager || recipient;
    const referrer = params.referrer || zeroAddress;
    const data = params.data || '0x' as Hex;

    // Execute purchase transaction
    log.info('Executing purchase transaction', {
      lockAddress: params.lockAddress,
      recipient,
      keyManager,
      referrer,
      value: isETH ? keyPrice.toString() : '0'
    });

    const purchaseTx = await walletClient.writeContract({
      address: params.lockAddress,
      abi: COMPLETE_LOCK_ABI,
      functionName: 'purchase',
      args: [
        [keyPrice], // values
        [recipient],           // recipients
        [referrer],            // referrers
        [keyManager],          // keyManagers
        [data]                 // data
      ],
      value: isETH ? keyPrice : 0n,
      account: account,
      chain: viemChain
    });

    log.info('Purchase transaction sent', { transactionHash: purchaseTx });

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: purchaseTx
    });

    log.info('Purchase transaction confirmed', {
      transactionHash: purchaseTx,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString()
    });

    // Extract token IDs from receipt logs
    const tokenIds = extractTokenIdsFromReceipt(receipt);

    log.info('Purchase successful', {
      transactionHash: purchaseTx,
      recipient,
      lockAddress: params.lockAddress,
      tokenIds: tokenIds.map(id => id.toString())
    });

    return {
      success: true,
      transactionHash: purchaseTx,
      tokenIds
    };

  } catch (error) {
    log.error('Relayer purchase failed', { 
      error,
      params: {
        lockAddress: params.lockAddress,
        recipient: params.recipient,
        chainId: params.chainId
      }
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed'
    };
  }
}

