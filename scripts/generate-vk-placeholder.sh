#!/bin/bash
# * Placeholder VK generator for MVP
# * This creates a placeholder file that allows compilation
# * Real VK extraction is blocked by backend API limitations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VK_PATH="$WORKSPACE_ROOT/packages/anchor/programs/veiled/src/verification_key.bin"

echo "🔑 Creating placeholder verification key..."
echo "   Location: $VK_PATH"
echo ""
echo "⚠️  WARNING: This is a PLACEHOLDER file."
echo "   - Allows Anchor program to compile"
echo "   - Verification will FAIL (expected for MVP)"
echo "   - Replace with real VK once extraction method is found"
echo ""

cat > "$VK_PATH" << 'VKEOF'
PLACEHOLDER_VERIFICATION_KEY_FOR_MVP_TESTING_ONLY
This file is a placeholder. Real VK extraction requires:
1. Backend API support (currently not available in @noir-lang/backend_barretenberg@0.36.0)
2. Or manual extraction from proof generation
3. Or nargo CLI support (not available in current version)

For MVP: This allows compilation but verification will fail.
Replace with actual VK once extraction method is found.

See: docs/VK_EXTRACTION_WORKAROUND.md
VKEOF

echo "✅ Placeholder VK created at: $VK_PATH"
echo ""
echo "📝 Next steps:"
echo "   1. Anchor program will compile successfully"
echo "   2. Proof verification will fail (expected)"
echo "   3. Once real VK is extracted, replace this file"
