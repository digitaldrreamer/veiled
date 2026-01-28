# IDL Compatibility Fix Guide

## Current Issue

Anchor's `Program` class fails to initialize because the BorshCoder can't properly handle the account structure in the generated IDL. The error occurs when building account clients:

```
TypeError: undefined is not an object (evaluating 'this._coder.accounts.size')
```

## Root Cause

The generated IDL has accounts with only discriminators:
```json
{
  "name": "NullifierAccount",
  "discriminator": [...]
}
```

But Anchor's BorshCoder expects full type definitions in the accounts array.

## Working Solution: Manual Instruction Construction

Since we only need to test instructions (not account decoding), we can bypass the Program class and construct instructions manually:

### Step 1: Create Instruction Helper

```typescript
// * Helper to create verify_auth instruction manually
function createVerifyAuthInstruction(
  programId: PublicKey,
  accounts: {
    nullifierAccount: PublicKey;
    authority: PublicKey;
    instructionsSysvar: PublicKey;
    systemProgram: PublicKey;
  },
  args: {
    verificationResult: Uint8Array;
    nullifier: Uint8Array;
    domain: string;
  }
): TransactionInstruction {
  // * Instruction discriminator: [184, 209, 18, 17, 66, 245, 80, 76]
  const discriminator = Buffer.from([184, 209, 18, 17, 66, 245, 80, 76]);
  
  // * Encode args using borsh
  const verificationResultLen = Buffer.allocUnsafe(4);
  verificationResultLen.writeUInt32LE(args.verificationResult.length, 0);
  
  const nullifierBuffer = Buffer.from(args.nullifier);
  const domainBuffer = Buffer.from(args.domain, 'utf-8');
  const domainLen = Buffer.allocUnsafe(4);
  domainLen.writeUInt32LE(domainBuffer.length, 0);
  
  const data = Buffer.concat([
    discriminator,
    verificationResultLen,
    Buffer.from(args.verificationResult),
    nullifierBuffer,
    domainLen,
    domainBuffer,
  ]);
  
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: accounts.nullifierAccount, isSigner: false, isWritable: true },
      { pubkey: accounts.authority, isSigner: true, isWritable: true },
      { pubkey: accounts.instructionsSysvar, isSigner: false, isWritable: false },
      { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    ],
    data,
  });
}
```

### Step 2: Update Tests to Use Manual Instructions

Replace `program.methods.verifyAuth(...).rpc()` with:

```typescript
const instruction = createVerifyAuthInstruction(
  VEILED_PROGRAM_ID,
  {
    nullifierAccount: nullifierPda,
    authority: authority.publicKey,
    instructionsSysvar: new PublicKey("Sysvar1nstructions1111111111111111111111111"),
    systemProgram: SystemProgram.programId,
  },
  {
    verificationResult,
    nullifier,
    domain: "test-domain",
  }
);

const tx = new Transaction().add(ed25519Ix).add(instruction);
const signature = await provider.sendAndConfirm(tx, [authority]);
```

## Alternative: Fix IDL Generation

Update the Anchor program to generate IDL with full account type definitions. This requires modifying how Anchor generates the IDL, which may not be straightforward.

## Recommended Approach

For now, use manual instruction construction since:
1. ✅ Tests only need instruction encoding, not account decoding
2. ✅ Avoids IDL compatibility issues
3. ✅ More explicit and easier to debug
4. ✅ Works immediately without fixing IDL generation

The tests are already structured correctly - we just need to replace the Program class usage with manual instruction construction.
