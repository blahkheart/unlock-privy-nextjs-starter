import type { NextApiRequest, NextApiResponse } from 'next';
import { createSterumPayClient } from '@/lib/stereum-pay/api';
import { getLogger } from '@/lib/utils/logger';

const log = getLogger('stereum-test');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    log.info('Testing Stereum Pay API connectivity');

    // Check environment variables
    const requiredEnvVars = [
      'STEREUM_API_KEY',
      'STEREUM_USERNAME', 
      'STEREUM_PASSWORD',
      'STEREUM_PUBLIC_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return res.status(500).json({
        error: 'Missing required environment variables',
        missing: missingVars,
        required: requiredEnvVars
      });
    }

    // Create Stereum Pay client
    const sterumClient = createSterumPayClient({
      apiKey: process.env.STEREUM_API_KEY!,
      username: process.env.STEREUM_USERNAME!,
      password: process.env.STEREUM_PASSWORD!,
      publicKey: process.env.STEREUM_PUBLIC_KEY!,
      baseUrl: process.env.STEREUM_BASE_URL || 'https://api.stereum.tech'
    });

    // Test API connectivity
    const connectionResult = await sterumClient.testConnection();
    
    if (!connectionResult.success) {
      log.error('Stereum Pay API connection test failed', { 
        error: connectionResult.error 
      });
      
      return res.status(500).json({
        success: false,
        error: connectionResult.error,
        message: 'Failed to connect to Stereum Pay API'
      });
    }

    log.info('Stereum Pay API connection test successful');

    res.json({
      success: true,
      message: 'Stereum Pay API connection successful',
      config: {
        baseUrl: process.env.STEREUM_BASE_URL || 'https://api.stereum.tech',
        username: process.env.STEREUM_USERNAME,
        hasApiKey: !!process.env.STEREUM_API_KEY,
        hasPublicKey: !!process.env.STEREUM_PUBLIC_KEY
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log.error('Stereum Pay API test failed', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Stereum Pay API test failed'
    });
  }
}