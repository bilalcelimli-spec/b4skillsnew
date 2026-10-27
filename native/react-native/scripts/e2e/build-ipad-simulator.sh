#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

# Let Xcode generate the simulator's application identity and Keychain entitlements.
# Building unsigned and applying a bare ad-hoc signature breaks secure event storage.
# This command only builds; it never boots, resets, or installs onto a device.
: "${B4_SIMULATOR_ID:?Set B4_SIMULATOR_ID to the dedicated iPad simulator UUID}"
xcodebuild -jobs 1 \
  -workspace ios/B4Skills.xcworkspace -scheme B4Skills \
  -configuration Debug -sdk iphonesimulator \
  -destination "id=$B4_SIMULATOR_ID" -derivedDataPath build/ios \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- build
