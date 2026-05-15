// @ts-ignore — no type declarations for base64 import
import { automergeWasmBase64 } from '@automerge/automerge/automerge.wasm.base64';
import * as AutomergeSlim from '@automerge/automerge/slim';

let initialized = false;

/** Initialize Automerge WASM. Safe to call multiple times. */
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

export { AutomergeSlim as Automerge };
