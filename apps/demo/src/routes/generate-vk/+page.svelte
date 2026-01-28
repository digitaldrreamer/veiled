<script lang="ts">
  import { exportVerificationKey, exportVerificationKeyAsJson } from '@veiled/core';

  let status = $state<string>('');
  let output = $state<string>('');
  let isGenerating = $state(false);
  let downloadUrl = $state<string | null>(null);
  let downloadUrlJson = $state<string | null>(null);
  let fileName = $state<string>('');
  let fileNameJson = $state<string>('');
  let vkFormat = $state<'binary' | 'json' | 'unknown'>('unknown');

  async function generateKey() {
    isGenerating = true;
    status = 'Initializing backend and extracting verification key...';
    output = '';
    downloadUrl = null;
    downloadUrlJson = null;

    try {
      // * Try to get VK as JSON first (recommended format)
      let vkJson: string | null = null;
      try {
        vkJson = await exportVerificationKeyAsJson();
        const parsed = JSON.parse(vkJson);
        if (parsed.format === 'binary') {
          vkFormat = 'binary';
          output += `⚠️ VK is in binary format. JSON conversion recommended.\n\n`;
        } else {
          vkFormat = 'json';
          output += `✅ VK is in JSON format (recommended for conversion)\n\n`;
        }
      } catch (e) {
        console.warn('JSON export failed, trying binary:', e);
      }

      // * Also get binary format for backward compatibility
      const verificationKey = await exportVerificationKey();

      // * Detect format
      if (verificationKey.length > 0 && verificationKey[0] === 0x7B) {
        // Starts with '{' - likely JSON
        try {
          const jsonStr = new TextDecoder().decode(verificationKey);
          JSON.parse(jsonStr);
          vkFormat = 'json';
          output += `Format: JSON (${verificationKey.length} bytes)\n`;
        } catch {
          vkFormat = 'binary';
          output += `Format: Binary (${verificationKey.length} bytes)\n`;
        }
      } else {
        vkFormat = 'binary';
        output += `Format: Binary (${verificationKey.length} bytes)\n`;
      }

      // * Convert to hex string for display (first 256 bytes)
      const previewLength = Math.min(verificationKey.length, 256);
      const hexString = Array.from(verificationKey.slice(0, previewLength))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // * Display results
      output += `\nFirst ${previewLength} bytes (hex):\n${hexString}${verificationKey.length > 256 ? '\n... (truncated)' : ''}\n`;

      if (vkFormat === 'json' && vkJson) {
        output += `\nJSON Structure:\n${vkJson.substring(0, 500)}${vkJson.length > 500 ? '\n... (truncated)' : ''}\n`;
      }

      // * Create download blob for binary
      const keyArray = new Uint8Array(verificationKey);
      const blob = new Blob([keyArray], { type: 'application/octet-stream' });
      downloadUrl = URL.createObjectURL(blob);
      fileName = 'verification_key.bin';

      // * Create download blob for JSON (if available)
      if (vkJson) {
        const jsonBlob = new Blob([vkJson], { type: 'application/json' });
        downloadUrlJson = URL.createObjectURL(jsonBlob);
        fileNameJson = 'verification_key.json';
      }

      status = 'success';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      status = 'error';
      output = `Error: ${message}\n\n${error instanceof Error ? error.stack : ''}`;
    } finally {
      isGenerating = false;
    }
  }
</script>

<div class="mx-auto max-w-2xl px-6 py-10">
  <section class="space-y-2">
    <h1 class="text-3xl font-semibold tracking-tight">🔑 Generate Verification Key</h1>
    <p class="text-sm text-neutral-600">
      This tool extracts the verification key from your compiled Noir circuit for on-chain Groth16 verification.
    </p>
  </section>

  <section class="mt-8 rounded-xl border border-neutral-200 bg-white p-5">
    <div class="grid gap-4">
      <button
        class="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed"
        onclick={generateKey}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Verification Key'}
      </button>

      {#if status === 'success'}
        <div class="rounded-lg bg-green-50 p-3">
          <div class="text-xs font-medium text-green-700">✅ Verification key generated!</div>
          <div class="mt-2 space-y-2">
            {#if downloadUrl}
              <a
                href={downloadUrl}
                download={fileName}
                class="block rounded-lg bg-green-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-green-700"
              >
                Download verification_key.bin
              </a>
            {/if}
            {#if downloadUrlJson}
              <a
                href={downloadUrlJson}
                download={fileNameJson}
                class="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
              >
                Download verification_key.json (Recommended)
              </a>
            {/if}
          </div>
          <p class="mt-2 text-xs text-green-600">
            {#if vkFormat === 'json'}
              <strong>Format: JSON</strong> - Ready for Rust conversion (recommended)
            {:else if vkFormat === 'binary'}
              <strong>Format: Binary</strong> - May need conversion for Arkworks compatibility
            {/if}
          </p>
          <p class="mt-1 text-xs text-green-600">
            Save binary to: <code class="rounded bg-green-100 px-1">packages/anchor/programs/veiled/src/verification_key.bin</code>
            {#if downloadUrlJson}
              <br />
              Save JSON to: <code class="rounded bg-green-100 px-1">packages/anchor/programs/veiled/src/verification_key.json</code>
            {/if}
          </p>
        </div>
      {/if}

      {#if status === 'error'}
        <div class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {output}
        </div>
      {/if}

      {#if output}
        <div class="rounded-lg bg-neutral-50 p-3">
          <div class="text-xs font-medium text-neutral-700">Output</div>
          <pre class="mt-2 overflow-x-auto text-xs text-neutral-900">{output}</pre>
        </div>
      {/if}
    </div>
  </section>
</div>
