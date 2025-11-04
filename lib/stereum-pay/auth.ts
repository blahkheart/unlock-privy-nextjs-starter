/**
 * Stereum Pay Authentication utilities
 * Handles JWT token management and RSA password encryption
 */

import crypto from 'crypto';
import { getLogger } from '@/lib/utils/logger';
import type {
  SterumAuthConfig,
  JWTTokenRequest,
  JWTTokenResponse,
  AuthToken,
  SterumErrorResponse,
  OperationResult
} from './types';

const log = getLogger('stereum-auth');

// Global token cache to avoid unnecessary API calls
let cachedToken: AuthToken | null = null;

/**
 * Encrypt password using RSA public key
 * Required by Stereum Pay for secure password transmission
 */
export function encryptPassword(password: string, publicKeyPem: string): string {
  try {
    // Convert PEM to buffer and encrypt
    const publicKey = crypto.createPublicKey({
      key: publicKeyPem,
      format: 'pem',
      type: 'spki'
    });

    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(password, 'utf8')
    );

    return encrypted.toString('base64');
  } catch (error) {
    log.error('Failed to encrypt password', { error });
    throw new Error('Password encryption failed');
  }
}

/**
 * Obtain JWT token from Stereum Pay API
 */
export async function obtainJWTToken(config: SterumAuthConfig): Promise<OperationResult<JWTTokenResponse>> {
  try {
    log.debug('Obtaining JWT token from Stereum Pay');

    // Encrypt password with RSA public key
    const encryptedPassword = encryptPassword(config.password, config.publicKey);

    const request: JWTTokenRequest = {
      username: config.username,
      password: encryptedPassword
    };

    const response = await fetch(`${config.baseUrl}/api/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData: SterumErrorResponse = await response.json();
      log.error('JWT token request failed', {
        status: response.status,
        error: errorData.message
      });
      
      return {
        success: false,
        error: `Authentication failed: ${errorData.message}`
      };
    }

    const tokenData: JWTTokenResponse = await response.json();
    
    log.info('JWT token obtained successfully', {
      expires_in: tokenData.expires_in,
      user_id: tokenData.user.id
    });

    return {
      success: true,
      data: tokenData
    };

  } catch (error) {
    log.error('JWT token request error', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token request failed'
    };
  }
}

/**
 * Create an AuthToken wrapper with expiration tracking
 */
export function createAuthToken(tokenResponse: JWTTokenResponse): AuthToken {
  const expiresAt = new Date(tokenResponse.expires_at);
  
  return {
    token: tokenResponse.access_token,
    expiresAt,
    refreshToken: tokenResponse.refresh_token,
    isExpired: () => {
      // Add 5 minute buffer before expiration
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
      return Date.now() + bufferTime >= expiresAt.getTime();
    }
  };
}

/**
 * Get a valid JWT token, refreshing if necessary
 * This function manages token caching and automatic renewal
 */
export async function getValidToken(config: SterumAuthConfig): Promise<OperationResult<string>> {
  try {
    // Check if we have a valid cached token
    if (cachedToken && !cachedToken.isExpired()) {
      log.debug('Using cached JWT token');
      return {
        success: true,
        data: cachedToken.token
      };
    }

    // Need to obtain a new token
    log.debug('Cached token expired or missing, obtaining new token');
    
    const result = await obtainJWTToken(config);
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to obtain token'
      };
    }

    // Cache the new token
    cachedToken = createAuthToken(result.data);
    
    log.info('New JWT token cached', {
      expires_at: cachedToken.expiresAt.toISOString()
    });

    return {
      success: true,
      data: cachedToken.token
    };

  } catch (error) {
    log.error('Error getting valid token', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token management error'
    };
  }
}

/**
 * Create authenticated headers for Stereum Pay API requests
 */
export async function createAuthHeaders(config: SterumAuthConfig): Promise<OperationResult<Record<string, string>>> {
  const tokenResult = await getValidToken(config);
  
  if (!tokenResult.success || !tokenResult.data) {
    return {
      success: false,
      error: tokenResult.error || 'Failed to get authentication token'
    };
  }

  return {
    success: true,
    data: {
      'Authorization': `Bearer ${tokenResult.data}`,
      'Content-Type': 'application/json'
    }
  };
}

/**
 * Clear cached token (useful for testing or logout)
 */
export function clearCachedToken(): void {
  cachedToken = null;
  log.debug('Cached token cleared');
}

/**
 * Check if current cached token is valid
 */
export function hasValidCachedToken(): boolean {
  return cachedToken !== null && !cachedToken.isExpired();
}

/**
 * Get token expiration info for debugging
 */
export function getTokenInfo(): { hasToken: boolean; expiresAt?: string; isExpired?: boolean } {
  if (!cachedToken) {
    return { hasToken: false };
  }

  return {
    hasToken: true,
    expiresAt: cachedToken.expiresAt.toISOString(),
    isExpired: cachedToken.isExpired()
  };
}