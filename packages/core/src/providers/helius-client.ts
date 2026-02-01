// * Helius API client for balance queries
// * Used by balance_range circuit to fetch wallet balances

/**
 * Helius getBalance response
 */
export interface HeliusGetBalanceResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    context: {
      slot: number;
      apiVersion?: string;
    };
    value: number; // Balance in lamports
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Helius getTokenAccountBalance response
 */
export interface HeliusGetTokenAccountBalanceResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: {
    context: {
      slot: number;
      apiVersion?: string;
    };
    value: {
      amount: string;
      decimals: number;
      uiAmount: number;
      uiAmountString: string;
    };
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Helius API client for balance queries
 * Supports both Secure URLs (no API key) and API key-based endpoints
 */
export class HeliusClient {
  private endpoint: string;
  private network: 'mainnet' | 'devnet' | 'testnet';
  private isSecureUrl: boolean;

  /**
   * @param endpointOrApiKey - Either a Helius Secure URL (e.g., https://abc-456-fast-devnet.helius-rpc.com)
   *                           or an API key (for constructing endpoint)
   * @param network - Network type (only used if endpointOrApiKey is an API key)
   */
  constructor(
    endpointOrApiKey: string, 
    network: 'mainnet' | 'devnet' | 'testnet' = 'devnet'
  ) {
    this.network = network;
    
    // * Check if endpointOrApiKey is a Secure URL (contains .helius-rpc.com)
    // * Secure URLs are safe to expose and don't need API keys
    if (endpointOrApiKey.includes('.helius-rpc.com')) {
      // * Secure URL - use directly, no API key needed
      this.endpoint = endpointOrApiKey;
      this.isSecureUrl = true;
    } else {
      // * API key - construct endpoint URL
      const baseUrl = network === 'mainnet' 
        ? 'https://mainnet.helius-rpc.com'
        : `https://${network}.helius-rpc.com`;
      this.endpoint = `${baseUrl}/?api-key=${endpointOrApiKey}`;
      this.isSecureUrl = false;
    }
  }

  /**
   * Get RPC endpoint URL
   */
  private getEndpoint(): string {
    return this.endpoint;
  }

  /**
   * Get native SOL balance for an account
   */
  async getBalance(account: string): Promise<HeliusGetBalanceResponse> {
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getBalance',
        params: [account]
      })
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as HeliusGetBalanceResponse;
    
    if (data.error) {
      throw new Error(`Helius API error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }

  /**
   * Get token account balance
   */
  async getTokenAccountBalance(tokenAccount: string): Promise<HeliusGetTokenAccountBalanceResponse> {
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getTokenAccountBalance',
        params: [tokenAccount]
      })
    });

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as HeliusGetTokenAccountBalanceResponse;
    
    if (data.error) {
      throw new Error(`Helius API error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }
}
