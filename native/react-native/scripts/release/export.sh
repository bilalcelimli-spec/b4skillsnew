#!/usr/bin/env bash
# Export a signed local archive. destination=export intentionally never uploads.
set -euo pipefail
cd "$(dirname "$0")/../.."
b4_platform="${1:-}"
b4_archive="${2:-}"
if [[ ( "$b4_platform" != ipad && "$b4_platform" != macos ) || -z "$b4_archive" ]]; then
  printf '%s\n' 'Usage: npm run release:export -- ipad|macos /absolute/path/to/signed.xcarchive'; exit 2
fi
python3 scripts/release/preflight.py --platform "$b4_platform" --online --archive "$b4_archive"
b4_options="build/distribution/export-options-$b4_platform.plist"
python3 scripts/release/export-options.py "$b4_platform" "$b4_options"
b4_build="${B4_BUILD_NUMBER:-$(python3 -c 'import json; print(json.load(open("release.json"))["buildNumber"])')}"
b4_output="build/distribution/$b4_platform/export-$b4_build"
if [[ -e "$b4_output" ]]; then printf '%s\n' "Export directory already exists: $b4_output"; exit 1; fi
xcodebuild -exportArchive -archivePath "$b4_archive" -exportOptionsPlist "$b4_options" -exportPath "$b4_output"
if [[ "$b4_platform" == ipad ]]; then b4_extension=ipa; else b4_extension=pkg; fi
b4_artifacts=("$b4_output"/*."$b4_extension")
if [[ ${#b4_artifacts[@]} != 1 || ! -f "${b4_artifacts[0]}" ]]; then printf '%s\n' 'Expected one exported IPA/PKG'; exit 1; fi
python3 scripts/release/verify-export.py "$b4_platform" "${b4_artifacts[0]}"
printf '%s\n' "Local export only: $b4_output"
