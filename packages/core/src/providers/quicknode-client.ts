// * Quicknode API client for NFT ownership queries
// * Used by nft_ownership circuit to verify NFT collection membership
// * 
// * For Solana: Uses Metaplex DAS (Digital Asset Standard) API via getAssetsByOwner
// * For EVM chains: Uses qn_fetchNFTs (legacy API)

export type JsonRpcId = string | number;

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// * DAS (Digital Asset Standard) API Types for Solana
export interface DasGrouping {
  group_key: string;      // e.g. "collection"
  group_value: string;    // collection address
}

export interface DasAttribute {
  trait_type?: string;
  value: string | number;
}

export interface DasContentMetadata {
  name?: string;
  description?: string;
  symbol?: string;
  token_standard?: string;   // e.g. "NonFungible"
  attributes?: DasAttribute[];
  [k: string]: unknown;
}

export interface DasContentFile {
  uri: string;
  mime?: string;
  [k: string]: unknown;
}

export interface DasContent {
  $schema?: string;
  json_uri?: string;
  files?: DasContentFile[];
  metadata?: DasContentMetadata;
  [k: string]: unknown;
}

export interface DasCompression {
  asset_hash?: string;
  compressed: boolean;
  creator_hash?: string;
  data_hash?: string;
  eligible?: boolean;
  leaf_id?: number;
  seq?: number;
  tree?: string;
}

export interface DasOwnership {
  delegate?: string | null;
  delegated?: boolean;
  frozen?: boolean;
  owner: string;
  ownership_model?: string;
}

export interface DasAssetItem {
  interface: string;          // e.g. "V1_NFT"
  id: string;                 // DAS asset id (mint address for Solana NFTs)
  content?: DasContent;
  grouping?: DasGrouping[];   // Collection info is here
  compression?: DasCompression;
  ownership?: DasOwnership;
  burnt?: boolean;
  mutable?: boolean;
  [k: string]: unknown;
}

export interface DasGetAssetsByOwnerResult {
  total: number;
  limit: number;
  page?: number;
  cursor?: string;
  items: DasAssetItem[];
}

export interface DasGetAssetsByOwnerResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: DasGetAssetsByOwnerResult;
  error?: JsonRpcError;
}

// * Legacy Ethereum/EVM NFT types (for non-Solana chains)
export interface QuicknodeNFTAsset {
  name: string;
  collectionName: string;
  collectionTokenId: string;
  collectionAddress: string;
  description?: string;
  imageUrl?: string;
  chain: 'ETH' | 'SOL' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'BASE';
  network: 'MAINNET' | 'TESTNET' | 'DEVNET';
  traits?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  tokenUri?: string;
  rarityScore?: number;
  rarityRank?: number;
}

/**
 * Quicknode fetchNFTs response
 */
export interface QuicknodeQnFetchNFTsResponse {
  jsonrpc: '2.0';
  id: number | string;
  result: {
    owner: string;
    ensName?: string | null;
    assets: QuicknodeNFTAsset[];
    pageNumber: number;
    totalPages: number;
    totalItems: number;
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Quicknode verifyNFTsOwner response
 */
export interface QuicknodeQnVerifyNFTsOwnerResponse {
  jsonrpc: '2.0';
  id: number | string;
  result: {
    owner: string;
    assets: string[]; // Array of owned NFT identifiers: "0xcontractAddress:tokenId"
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Quicknode fetchNFTs request parameters
 */
export interface QnFetchNFTsParams {
  wallet: string;
  page?: number;
  perPage?: number;
  contracts?: string[];
  omitFields?: Array<'traits' | 'provenance' | 'description'>;
}

/**
 * Quicknode verifyNFTsOwner request parameters
 */
export interface QnVerifyNFTsOwnerParams {
  wallet: string;
  contracts: string[]; // NFT identifiers: "0xcontractAddress:tokenId"
}

/**
 * Quicknode API client for NFT queries
 */
export class QuicknodeClient {
  private endpoint: string;
  private apiKey?: string;

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  /**
   * Get assets by owner using DAS API (Solana)
   * This is the correct API for Solana NFTs via Metaplex DAS
   */
  async getAssetsByOwner(
    ownerAddress: string,
    options?: {
      limit?: number;
      page?: number;
      cursor?: string;
      before?: string;
      after?: string;
    }
  ): Promise<DasGetAssetsByOwnerResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress,
          ...options
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Quicknode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as DasGetAssetsByOwnerResponse;
    
    if (data.error) {
      throw new Error(`Quicknode API error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }

  /**
   * Fetch all NFTs for a wallet (Legacy API - Ethereum/EVM only)
   * @deprecated For Solana, use getAssetsByOwner() instead
   */
  async qn_fetchNFTs(params: QnFetchNFTsParams): Promise<QuicknodeQnFetchNFTsResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'qn_fetchNFTs',
        params: [params]
      })
    });

    if (!response.ok) {
      throw new Error(`Quicknode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as QuicknodeQnFetchNFTsResponse;
    
    if (data.error) {
      throw new Error(`Quicknode API error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }

  /**
   * Verify NFT ownership for specific contracts
   */
  async qn_verifyNFTsOwner(params: QnVerifyNFTsOwnerParams): Promise<QuicknodeQnVerifyNFTsOwnerResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'qn_verifyNFTsOwner',
        params: [params]
      })
    });

    if (!response.ok) {
      throw new Error(`Quicknode API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as QuicknodeQnVerifyNFTsOwnerResponse;
    
    if (data.error) {
      throw new Error(`Quicknode API error: ${data.error.message} (code: ${data.error.code})`);
    }

    return data;
  }
}
