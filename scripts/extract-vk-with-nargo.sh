#!/bin/bash
# * Extract verification key using nargo CLI
# * This is the ONLY reliable way to get the VK with current backend version

set -e

echo "🔑 Extracting verification key using nargo CLI..."
echo ""

cd "$(dirname "$0")/../packages/circuit"

echo "📂 Current directory: $(pwd)"
echo ""

# * Step 1: Make sure circuit is compiled
echo "🔧 Step 1: Compiling circuit..."
nargo compile
echo "✅ Circuit compiled"
echo ""

# * Step 2: Execute to generate proof (this may expose VK)
echo "🔧 Step 2: Executing circuit (generates proof artifacts)..."
nargo execute
echo "✅ Circuit executed"
echo ""

# * Step 3: Check target/ directory for VK files
echo "🔍 Step 3: Checking for VK files in target/..."
ls -lah target/ 2>/dev/null || echo "target/ directory not found"

# * Look for VK-related files
echo ""
echo "📋 Searching for VK files..."
find target/ -type f \( -name "*vk*" -o -name "*verification*" -o -name "*.vk" \) 2>/dev/null || echo "No VK files found in target/"

echo ""
echo "⚠️  NOTE: If no VK files are found, the VK may need to be extracted manually."
echo "   The JavaScript API does not support VK extraction in @noir-lang/backend_barretenberg@0.36.0"
echo ""
echo "   Alternative: Check if newer nargo versions have VK export commands:"
echo "   nargo --help | grep -i vk"
echo ""
