#!/usr/bin/env bash
# Build a disposable copy of an already built/signed app. Never changes index.js,
# the normal app bundle, authentication credentials, or customer organization data.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${1:-}" in
  macos)
    b4_source_app=build/macos/Build/Products/Debug/B4Skills.app
    b4_target_app=build/photo-queue-harness/macos/B4Skills.app
    b4_package=react-native-macos
    b4_bundle_platform=macos
    b4_resources="$b4_target_app/Contents/Resources"
    ;;
  ipad)
    b4_source_app=build/ios/Build/Products/Debug-iphonesimulator/B4Skills.app
    b4_target_app=build/photo-queue-harness/ipad/B4Skills.app
    b4_package=react-native
    b4_bundle_platform=ios
    b4_resources="$b4_target_app"
    ;;
  *) printf '%s\n' 'Usage: bash scripts/e2e/build-photo-queue-harness.sh macos|ipad'; exit 2 ;;
esac
codesign --verify --deep --strict "$b4_source_app"
mkdir -p build/photo-queue-harness
node "node_modules/$b4_package/scripts/bundle.js" bundle \
  --entry-file scripts/e2e/photo-queue-harness.tsx --platform "$b4_bundle_platform" \
  --dev true --max-workers 1 --bundle-output "build/photo-queue-harness/main.$b4_bundle_platform.jsbundle" \
  --assets-dest "build/photo-queue-harness/assets-$b4_bundle_platform" \
  --config-cmd "node node_modules/$b4_package/cli.js config"
/usr/bin/ditto "$b4_source_app" "$b4_target_app"
cp "build/photo-queue-harness/main.$b4_bundle_platform.jsbundle" "$b4_resources/main.jsbundle"
/usr/bin/ditto "build/photo-queue-harness/assets-$b4_bundle_platform" "$b4_resources"
if [[ "$1" == macos ]]; then
  codesign --force --sign - --entitlements macos/b4skills-native-macOS/b4skills-native.entitlements "$b4_target_app"
else
  # The copy retains the correctly signed Xcode build's linker-generated simulator
  # identity sections. Match Xcode's outer signing command; do not add device-style
  # application-identifier signature entitlements or start from an unsigned build.
  codesign --force --sign - --timestamp=none --generate-entitlement-der "$b4_target_app"
fi
codesign --verify --deep --strict "$b4_target_app"
printf '%s\n' "$b4_target_app"
