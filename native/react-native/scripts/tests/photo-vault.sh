#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
b4_vault_binary="$(mktemp -t b4-photo-vault)"
trap 'rm -f "$b4_vault_binary"' EXIT
clang -fobjc-arc -framework Foundation -framework Security scripts/tests/photo-vault.m -o "$b4_vault_binary"
"$b4_vault_binary"
clang -fobjc-arc -framework Foundation -framework CoreVideo -framework ImageIO -framework CoreGraphics scripts/tests/frame-photo.m -o "$b4_vault_binary"
"$b4_vault_binary"
