#!/usr/bin/env bash
# Compile normal Release JS/Hermes bundles locally without signing, uploading or a running backend.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${1:-}" in
  ipad) b4_package=react-native; b4_platform=ios; b4_hermes=ios/Pods/hermes-engine/destroot/bin/hermesc ;;
  macos) b4_package=react-native-macos; b4_platform=macos; b4_hermes=macos/Pods/hermes-engine/destroot/bin/hermesc ;;
  *) printf '%s\n' 'Usage: npm run release:bundle -- ipad|macos'; exit 2 ;;
esac
python3 scripts/release/preflight.py --source-only --platform "$1"
mkdir -p build/distribution/bundles
b4_bundle="build/distribution/bundles/main.$b4_platform.jsbundle"
node "node_modules/$b4_package/scripts/bundle.js" bundle --entry-file index.js \
  --platform "$b4_platform" --dev false --minify false --max-workers 1 \
  --bundle-output "$b4_bundle" --assets-dest "build/distribution/bundles/assets-$b4_platform" \
  --config-cmd "node node_modules/$b4_package/cli.js config"
"$b4_hermes" -O -emit-binary -out "build/distribution/bundles/main.$b4_platform.hbc" "$b4_bundle"
python3 - "$b4_bundle" <<'PY'
from pathlib import Path
import json,sys
bundle=Path(sys.argv[1]).read_bytes()
assert b'NATIVE PHOTO QUEUE QA' not in bundle, 'QA entry must not ship'
origin=json.loads(Path('release.json').read_text())['apiOrigin'].encode()
assert origin in bundle, 'Expected production service missing'
assert b'__DEV__=false' in bundle[:500] or b'__DEV__ = false' in bundle[:500], 'Bundle must be compiled for Release'
print('Release JS and optimized Hermes bytecode compiled; production origin present, QA fixture absent')
PY
