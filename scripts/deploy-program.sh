#!/bin/bash
# * Safe program deployment script
# * Enforces correct build → validate → deploy order
# * Prevents "DeclaredProgramIdMismatch" errors
# * Usage: ./scripts/deploy-program.sh [devnet|localnet]

set -e  # Exit on any error

CLUSTER=${1:-devnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🚀 Veiled Program Deployment Script"
echo "===================================="
echo "Cluster: $CLUSTER"
echo ""

# Step 1: Validate Program ID consistency
echo "🔍 Step 1: Validating Program ID consistency..."
if ! npm run validate-program-id; then
  echo ""
  echo "❌ Program ID validation failed!"
  echo "   Fix mismatches before deploying."
  exit 1
fi
echo ""

# Step 1.5: Sync keypair (CRITICAL - ensures lib.rs matches keypair)
echo "🔑 Step 1.5: Syncing keypair to lib.rs..."
cd packages/anchor
if ! anchor keys sync; then
  echo ""
  echo "❌ Keypair sync failed!"
  exit 1
fi
echo ""

# Step 2: Build program
echo "🔨 Step 2: Building program..."

# Set Solana config based on cluster
if [ "$CLUSTER" = "devnet" ]; then
  solana config set --url 'https://devnet.helius-rpc.com/?api-key=7e89c8e8-ccd1-43c3-bd7f-73c5a1d9fe54' > /dev/null 2>&1 || true
elif [ "$CLUSTER" = "localnet" ]; then
  solana config set --url http://localhost:8899 > /dev/null 2>&1 || true
fi

if ! anchor build; then
  echo ""
  echo "❌ Build failed!"
  exit 1
fi
echo ""

# Step 3: Verify IDL matches declare_id!
echo "🔍 Step 3: Verifying IDL matches declare_id!..."
if [ ! -f "target/idl/veiled.json" ]; then
  echo "❌ IDL file not found! Build may have failed."
  exit 1
fi

# Extract Program ID from lib.rs
DECLARED_ID=$(grep -oP 'declare_id!\("\K[^"]+' programs/veiled/src/lib.rs | head -1)
if [ -z "$DECLARED_ID" ]; then
  echo "❌ Could not extract declare_id! from lib.rs"
  exit 1
fi

# Extract Program ID from IDL
IDL_ID=$(node -e "console.log(require('./target/idl/veiled.json').address)")
if [ -z "$IDL_ID" ]; then
  echo "❌ Could not extract address from IDL"
  exit 1
fi

if [ "$DECLARED_ID" != "$IDL_ID" ]; then
  echo "❌ IDL address does not match declare_id!"
  echo "   declare_id!: $DECLARED_ID"
  echo "   IDL address: $IDL_ID"
  exit 1
fi

echo "   ✅ IDL matches declare_id!: $DECLARED_ID"
echo ""

# Step 4: Check balance
echo "💰 Step 4: Checking deployer wallet balance..."
BALANCE=$(solana balance 2>&1 | grep -oP '\d+\.\d+' | head -1 || echo "0")
REQUIRED="1.73"
if (( $(echo "$BALANCE < $REQUIRED" | bc -l) )); then
  echo "⚠️  Warning: Insufficient balance ($BALANCE SOL)"
  echo "   Required: ~$REQUIRED SOL for deployment"
  echo "   Deployer wallet: $(solana address 2>&1)"
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
  fi
else
  echo "   ✅ Balance: $BALANCE SOL"
fi
echo ""

# Step 5: Ensure .so file is in deploy directory
echo "📦 Step 5: Preparing program binary..."
if [ ! -f "target/deploy/veiled.so" ]; then
  echo "   Copying from target/verifiable/veiled.so..."
  if [ -f "target/verifiable/veiled.so" ]; then
    mkdir -p target/deploy
    cp target/verifiable/veiled.so target/deploy/veiled.so
    echo "   ✅ Copied to target/deploy/veiled.so"
  else
    echo "   ❌ Program binary not found at target/verifiable/veiled.so"
    echo "   Build may have failed or output location changed."
    exit 1
  fi
else
  echo "   ✅ Program binary found at target/deploy/veiled.so"
fi
echo ""

# Step 6: Deploy program
echo "🚀 Step 6: Deploying program..."

if solana program deploy target/deploy/veiled.so --program-id target/deploy/veiled-keypair.json; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "Program ID: $(solana address -k target/deploy/veiled-keypair.json)"
  echo ""
  echo "Next steps:"
  echo "  1. Update apps/demo/static/idl/veiled.json with new IDL (if changed)"
  echo "  2. Rebuild SDK: npm run build --workspace=@veiled/core"
  echo "  3. Test the deployment"
else
  echo ""
  echo "❌ Deployment failed!"
  exit 1
fi
