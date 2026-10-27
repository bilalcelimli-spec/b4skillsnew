#!/usr/bin/env bash
# Local archive only. Nothing is uploaded or submitted to App Store Connect.
set -euo pipefail
cd "$(dirname "$0")/../.."
b4_platform="${1:-}"
[[ $# -gt 0 ]] && shift
b4_unsigned=0
b4_arm_validation=0
for b4_option in "$@"; do
  case "$b4_option" in
    --unsigned) b4_unsigned=1 ;;
    --arm64-validation) b4_arm_validation=1 ;;
    *) printf '%s\n' "Unknown option: $b4_option"; exit 2 ;;
  esac
done
case "$b4_platform" in
  ipad) b4_workspace=ios/B4Skills.xcworkspace; b4_scheme=B4Skills; b4_destination='generic/platform=iOS' ;;
  macos) b4_workspace=macos/b4skills-native.xcworkspace; b4_scheme=b4skills-native-macOS; b4_destination='generic/platform=macOS' ;;
  *) printf '%s\n' 'Usage: npm run release:archive -- ipad|macos [--unsigned] [--arm64-validation]'; exit 2 ;;
esac
if [[ "$b4_arm_validation" == 1 && ( "$b4_unsigned" != 1 || "$b4_platform" != macos ) ]]; then
  printf '%s\n' '--arm64-validation requires macos --unsigned; it is not a distribution candidate.'; exit 2
fi
b4_version="$(python3 -c 'import json; print(json.load(open("release.json"))["version"])')"
b4_team="$(python3 -c 'import json; print(json.load(open("release.json"))["teamId"])')"
export B4_BUILD_NUMBER="${B4_BUILD_NUMBER:-$(python3 -c 'import json; print(json.load(open("release.json"))["buildNumber"])')}"
b4_checks=(--platform "$b4_platform")
b4_signing=(CODE_SIGN_STYLE=Automatic)
b4_suffix=''
if [[ "$b4_unsigned" == 1 ]]; then
  b4_checks+=(--source-only)
  b4_signing+=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO)
  b4_suffix=-unsigned
else
  b4_checks+=(--online)
  if [[ "${B4_ALLOW_PROVISIONING_UPDATES:-0}" == 1 ]]; then
    b4_checks+=(--source-only)
    b4_signing+=(-allowProvisioningUpdates)
  fi
fi
if [[ "$b4_arm_validation" == 1 ]]; then b4_signing+=(ARCHS=arm64 ONLY_ACTIVE_ARCH=YES); b4_suffix+=-arm64; fi
python3 scripts/release/preflight.py "${b4_checks[@]}"
b4_archive="build/distribution/$b4_platform/$b4_version-$B4_BUILD_NUMBER$b4_suffix.xcarchive"
if [[ -e "$b4_archive" ]]; then printf '%s\n' "Archive already exists; preserve it or choose a new build number: $b4_archive"; exit 1; fi
mkdir -p "$(dirname "$b4_archive")"
export NODE_BINARY="$(command -v node)"
b4_jobs="${B4_BUILD_JOBS:-1}"
if [[ "$b4_jobs" != 1 && "$b4_jobs" != 2 ]]; then printf '%s\n' 'B4_BUILD_JOBS must be 1 or 2'; exit 2; fi
xcodebuild -jobs "$b4_jobs" -workspace "$b4_workspace" -scheme "$b4_scheme" \
  -configuration Release -destination "$b4_destination" \
  -derivedDataPath "build/distribution/DerivedData-$b4_platform" -archivePath "$b4_archive" \
  DEVELOPMENT_TEAM="$b4_team" \
  MARKETING_VERSION="$b4_version" CURRENT_PROJECT_VERSION="$B4_BUILD_NUMBER" \
  ENTRY_FILE=index.js FORCE_BUNDLING=1 'EXTRA_PACKAGER_ARGS=--max-workers 1' \
  "${b4_signing[@]}" archive
python3 scripts/release/vendor-symbols.py "$b4_platform" "$b4_archive"
b4_verify=(--source-only --platform "$b4_platform" --archive "$b4_archive")
if [[ "$b4_unsigned" == 1 ]]; then b4_verify+=(--unsigned); fi
python3 scripts/release/preflight.py "${b4_verify[@]}"
printf '%s\n' "Local archive: $b4_archive"
