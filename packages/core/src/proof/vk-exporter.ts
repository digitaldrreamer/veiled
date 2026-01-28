// * Verification key exporter with JSON format support
// * Based on research: JSON-based VK conversion is recommended

import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';
import type { CompiledCircuit } from './circuit-loader.js';

/**
 * * Exports verification key in JSON format (recommended for cross-system compatibility)
 * * Returns JSON string with hex-encoded field elements
 */
export async function exportVerificationKeyAsJson(
  backend: BarretenbergBackend
): Promise<string> {
  try {
    const vk = await backend.getVerificationKey();
    
    // * Check if VK is already JSON format
    if (typeof vk === 'object' && !(vk instanceof Uint8Array)) {
      // Already JSON - return as string
      return JSON.stringify(vk, null, 2);
    }
    
    // * If binary, we need to convert to JSON
    // * For now, return error - binary conversion needs backend-specific logic
    if (vk instanceof Uint8Array) {
      throw new Error(
        'Verification key is in binary format. ' +
        'Barretenberg backend may need to be configured to output JSON format. ' +
        'Check if backend.getVerificationKey() supports JSON output option.'
      );
    }
    
    // * Fallback: try to stringify whatever we got
    return JSON.stringify(vk, null, 2);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to export verification key as JSON: ${message}`);
  }
}

/**
 * * Exports verification key in binary format (legacy)
 * * Returns Uint8Array
 */
export async function exportVerificationKeyAsBinary(
  backend: BarretenbergBackend
): Promise<Uint8Array> {
  try {
    const vk = await backend.getVerificationKey();
    
    if (vk instanceof Uint8Array) {
      return vk;
    }
    
    // * If JSON, convert to binary (not recommended, but for compatibility)
    if (typeof vk === 'object') {
      // Try to serialize JSON to bytes
      const jsonString = JSON.stringify(vk);
      return new TextEncoder().encode(jsonString);
    }
    
    throw new Error('Verification key format not recognized');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to export verification key as binary: ${message}`);
  }
}

/**
 * * Detects verification key format
 */
export function detectVkFormat(vk: unknown): 'json' | 'binary' | 'unknown' {
  if (vk instanceof Uint8Array) {
    return 'binary';
  }
  if (typeof vk === 'object' && vk !== null) {
    return 'json';
  }
  return 'unknown';
}
