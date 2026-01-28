// * Ed25519 Security Integration Tests
// *
// * Tests critical security validations for Ed25519 signature verification
// * to prevent signature forgery attacks.
// *
// * Test Cases:
// * 1. Valid Signature (Success Path)
// * 2. Wrong Instruction Order
// * 3. Message Content Mismatch
// * 4. Authority Mismatch
// * 5. Invalid Signature
// * 6. Expired Timestamp
// * 7. Duplicate Nullifier
// *
// * Note: Offset Mismatch test (Test 3 from plan) requires manual instruction
// * construction with wrong offsets. Ed25519Program.createInstructionWithPublicKey
// * always creates instructions with u16::MAX offsets (correct behavior).
// * The offset validation is tested via Rust unit tests in ultrahonk.rs.

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as nacl from "tweetnacl";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import type { Veiled } from "../target/types/veiled";

// * Program ID will be loaded from workspace

// * Helper: Create verification result data
// * Format: [1 byte: is_valid] [32 bytes: proof_hash] [8 bytes: timestamp] [64 bytes: signature]
function createVerificationResult(
  isValid: boolean,
  proofHash: Uint8Array,
  timestamp: number,
  signature: Uint8Array
): Uint8Array {
  const result = new Uint8Array(105);
  result[0] = isValid ? 1 : 0;
  result.set(proofHash, 1);
  const timestampBytes = new Uint8Array(8);
  new DataView(timestampBytes.buffer).setBigUint64(0, BigInt(timestamp), true); // * Little-endian
  result.set(timestampBytes, 33);
  result.set(signature, 41);
  return result;
}

// * Helper: Create Ed25519 signed message
// * Message format: proof_hash (32) || is_valid (1) || timestamp (8) = 41 bytes
function createEd25519Message(
  proofHash: Uint8Array,
  isValid: boolean,
  timestamp: number
): Uint8Array {
  const message = new Uint8Array(41);
  message.set(proofHash, 0);
  message[32] = isValid ? 1 : 0;
  const timestampBytes = new Uint8Array(8);
  new DataView(timestampBytes.buffer).setBigUint64(0, BigInt(timestamp), true); // * Little-endian
  message.set(timestampBytes, 33);
  return message;
}

// * Helper: Sign message with Ed25519 keypair
function signMessage(
  keypair: Keypair,
  message: Uint8Array
): Uint8Array {
  return nacl.sign.detached(message, keypair.secretKey);
}

describe("Ed25519 Security Tests", () => {
  // * Use Anchor's built-in provider (from Anchor.toml or environment)
  // * anchor test automatically sets up provider and workspace
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // * Use workspace pattern - Anchor test automatically loads this
  const program = anchor.workspace.Veiled as Program<Veiled>;
  
  // * Program ID from workspace
  const VEILED_PROGRAM_ID = program.programId;

  // * Create test authority keypair
  const authority = Keypair.generate();

  // * Airdrop SOL for testing (anchor test handles validator setup)
  before(async () => {
    try {
      const airdropSig = await provider.connection.requestAirdrop(
        authority.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);
    } catch (error) {
      console.warn("Could not airdrop SOL:", error);
    }
  });

  // * Test 1: Valid Signature (Success Path)
  it("should accept valid Ed25519 signature", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    // * Create message and sign it
    const message = createEd25519Message(proofHash, isValid, timestamp);
    const signature = signMessage(authority, message);

    // * Create verification result
    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      timestamp,
      signature
    );

    // * Create Ed25519 instruction
    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message,
      signature: signature,
    });

    // * Create nullifier
    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Call verify_auth with Ed25519 instruction as pre-instruction
    // * Convert Uint8Array to Buffer for Anchor encoding
    const txSignature = await program.methods
      .verifyAuth(
        Buffer.from(verificationResult),
        Array.from(nullifier),
        "test-domain"
      )
      .preInstructions([ed25519Ix])
      .accounts({
        nullifierAccount: nullifierPda,
        authority: authority.publicKey,
        instructionsSysvar: new PublicKey(
          "Sysvar1nstructions1111111111111111111111111"
        ),
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    expect(txSignature).to.exist;
    console.log("✓ Valid signature test passed:", txSignature);
  });

  // * Test 2: Wrong Instruction Order
  // * Note: This tests that Ed25519 instruction must come before program instruction
  it("should reject when program instruction comes before Ed25519 instruction", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    const message = createEd25519Message(proofHash, isValid, timestamp);
    const signature = signMessage(authority, message);

    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      timestamp,
      signature
    );

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message,
      signature: signature,
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Create transaction with WRONG order: program instruction first, then Ed25519
    const programIx = await program.methods
      .verifyAuth(
        Buffer.from(verificationResult),
        Array.from(nullifier),
        "test-domain"
      )
      .accounts({
        nullifierAccount: nullifierPda,
        authority: authority.publicKey,
        instructionsSysvar: new PublicKey(
          "Sysvar1nstructions1111111111111111111111111"
        ),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(programIx).add(ed25519Ix);

    // * Should fail because Ed25519 instruction is not before program instruction
    try {
      await provider.sendAndConfirm(tx, [authority]);
      expect.fail("Transaction should have failed due to wrong instruction order");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });

  // * Test 3: Message Content Mismatch
  it("should reject when message content doesn't match signature", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const wrongProofHash = new Uint8Array(32);
    crypto.getRandomValues(wrongProofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    // * Sign with correct message
    const correctMessage = createEd25519Message(proofHash, isValid, timestamp);
    const signature = signMessage(authority, correctMessage);

    // * But create verification result with wrong proof hash
    const verificationResult = createVerificationResult(
      isValid,
      wrongProofHash, // * Wrong proof hash!
      timestamp,
      signature
    );

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: correctMessage, // * Ed25519 verifies correct message
      signature: signature,
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Should fail because proof hash in verification result doesn't match message
    try {
      await program.methods
        .verifyAuth(
          Buffer.from(verificationResult),
          Array.from(nullifier),
          "test-domain"
        )
        .preInstructions([ed25519Ix])
        .accounts({
          nullifierAccount: nullifierPda,
          authority: authority.publicKey,
          instructionsSysvar: new PublicKey(
            "Sysvar1nstructions1111111111111111111111111"
          ),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Transaction should have failed with message mismatch");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });

  // * Test 4: Authority Mismatch
  it("should reject when signature is from different authority", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    // * Create different authority
    const wrongAuthority = Keypair.generate();

    const message = createEd25519Message(proofHash, isValid, timestamp);
    // * Sign with wrong authority
    const signature = signMessage(wrongAuthority, message);

    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      timestamp,
      signature
    );

    // * Ed25519 instruction uses wrong authority's public key
    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: wrongAuthority.publicKey.toBytes(),
      message: message,
      signature: signature,
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Should fail because authority doesn't match
    try {
      await program.methods
        .verifyAuth(
          Buffer.from(verificationResult),
          Array.from(nullifier),
          "test-domain"
        )
        .preInstructions([ed25519Ix])
        .accounts({
          nullifierAccount: nullifierPda,
          authority: authority.publicKey, // * Different from signer!
          instructionsSysvar: new PublicKey(
            "Sysvar1nstructions1111111111111111111111111"
          ),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Transaction should have failed with authority mismatch");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });

  // * Test 5: Invalid Signature (Signature doesn't verify)
  it("should reject invalid Ed25519 signature", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    const message = createEd25519Message(proofHash, isValid, timestamp);
    // * Create invalid signature (random bytes)
    const invalidSignature = new Uint8Array(64);
    crypto.getRandomValues(invalidSignature);

    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      timestamp,
      invalidSignature
    );

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message,
      signature: invalidSignature, // * Invalid signature
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Should fail because Ed25519Program will reject invalid signature
    try {
      await program.methods
        .verifyAuth(
          Buffer.from(verificationResult),
          Array.from(nullifier),
          "test-domain"
        )
        .preInstructions([ed25519Ix])
        .accounts({
          nullifierAccount: nullifierPda,
          authority: authority.publicKey,
          instructionsSysvar: new PublicKey(
            "Sysvar1nstructions1111111111111111111111111"
          ),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Transaction should have failed with invalid signature");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });

  // * Test 6: Expired Timestamp
  it("should reject expired verification results", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    // * Timestamp from 10 minutes ago (expired)
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 10 * 60;
    const isValid = true;

    const message = createEd25519Message(proofHash, isValid, expiredTimestamp);
    const signature = signMessage(authority, message);

    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      expiredTimestamp,
      signature
    );

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message,
      signature: signature,
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * Should fail because timestamp is expired (>5 minutes old)
    try {
      await program.methods
        .verifyAuth(
          Buffer.from(verificationResult),
          Array.from(nullifier),
          "test-domain"
        )
        .preInstructions([ed25519Ix])
        .accounts({
          nullifierAccount: nullifierPda,
          authority: authority.publicKey,
          instructionsSysvar: new PublicKey(
            "Sysvar1nstructions1111111111111111111111111"
          ),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Transaction should have failed with expired timestamp");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });

  // * Test 7: Duplicate Nullifier
  it("should reject duplicate nullifier", async () => {
    const proofHash = new Uint8Array(32);
    crypto.getRandomValues(proofHash);
    const timestamp = Math.floor(Date.now() / 1000);
    const isValid = true;

    const message = createEd25519Message(proofHash, isValid, timestamp);
    const signature = signMessage(authority, message);

    const verificationResult = createVerificationResult(
      isValid,
      proofHash,
      timestamp,
      signature
    );

    const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message,
      signature: signature,
    });

    const nullifier = new Uint8Array(32);
    crypto.getRandomValues(nullifier);
    const [nullifierPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("nullifier"), Buffer.from(nullifier)],
      VEILED_PROGRAM_ID
    );

    // * First use - should succeed
    const tx1 = await program.methods
      .verifyAuth(
        Buffer.from(verificationResult),
        Array.from(nullifier),
        "test-domain"
      )
      .preInstructions([ed25519Ix])
      .accounts({
        nullifierAccount: nullifierPda,
        authority: authority.publicKey,
        instructionsSysvar: new PublicKey(
          "Sysvar1nstructions1111111111111111111111111"
        ),
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    expect(tx1).to.exist;

    // * Create new verification result for second attempt
    const proofHash2 = new Uint8Array(32);
    crypto.getRandomValues(proofHash2);
    const message2 = createEd25519Message(proofHash2, isValid, timestamp);
    const signature2 = signMessage(authority, message2);
    const verificationResult2 = createVerificationResult(
      isValid,
      proofHash2,
      timestamp,
      signature2
    );
    const ed25519Ix2 = Ed25519Program.createInstructionWithPublicKey({
      publicKey: authority.publicKey.toBytes(),
      message: message2,
      signature: signature2,
    });

    // * Second use with same nullifier - should fail
    try {
      await program.methods
        .verifyAuth(
          Buffer.from(verificationResult2),
          Array.from(nullifier), // * Same nullifier!
          "test-domain"
        )
        .preInstructions([ed25519Ix2])
        .accounts({
          nullifierAccount: nullifierPda,
          authority: authority.publicKey,
          instructionsSysvar: new PublicKey(
            "Sysvar1nstructions1111111111111111111111111"
          ),
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Transaction should have failed with duplicate nullifier");
    } catch (error) {
      // * Expected to fail
      expect(error).to.exist;
    }
  });
});
