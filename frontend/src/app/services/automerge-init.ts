/**
 * Automerge WASM Initialization
 *
 * This module handles the manual initialization of Automerge's WASM backend.
 * We use the "slim" import of Automerge which doesn't bundle the WASM inline,
 * allowing it to work with Vite's dev server (which doesn't support the ESM
 * integration proposal for WASM).
 *
 * The WASM binary is loaded via a base64-encoded variant that ships with
 * @automerge/automerge, avoiding any .wasm file loading issues.
 */

// @ts-ignore — The base64 import has no type declarations
import { automergeWasmBase64 } from '@automerge/automerge/automerge.wasm.base64';
import * as AutomergeSlim from '@automerge/automerge/slim';

let initialized = false;

/**
 * Initialize the Automerge WASM module.
 * Safe to call multiple times — only initializes once.
 */
export async function initAutomergeWasm(): Promise<void> {
  if (initialized) return;

  try {
    await AutomergeSlim.initializeBase64Wasm(automergeWasmBase64);
    initialized = true;
    console.log('[Automerge] WASM initialized successfully');
  } catch (err) {
    console.error('[Automerge] WASM initialization failed:', err);
    throw err;
  }
}

/** Re-export the Automerge slim module for use throughout the app */
export { AutomergeSlim as Automerge };
