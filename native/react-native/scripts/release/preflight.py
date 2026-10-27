"""Read-only TestFlight preflight: source, signing inventory, public API and optional archive."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import urlsplit
import argparse, fnmatch, hashlib, json, os, plistlib, re, subprocess, sys

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-only', action='store_true', help='Skip local App Store profile inventory')
parser.add_argument('--xcode-settings', action='store_true', help='Resolve actual Release build settings without compiling or provisioning')
parser.add_argument('--online', action='store_true', help='Check public live API without signing in')
parser.add_argument('--platform', choices=['ipad', 'macos', 'all'], default='all')
parser.add_argument('--archive', type=Path)
parser.add_argument('--unsigned', action='store_true', help='Validation artifact only; cannot indicate upload readiness')
args = parser.parse_args()
config = json.loads((ROOT / 'release.json').read_text())
errors = []
results = []
def check(ok, message):
    print(('PASS ' if ok else 'FAIL ') + message)
    results.append({'passed': bool(ok), 'message': message})
    if not ok: errors.append(message)

def plist(path):
    return plistlib.loads(path.read_bytes())

origin = urlsplit(config['apiOrigin'])
check(origin.scheme == 'https' and bool(origin.hostname) and not origin.path and not origin.query and not origin.fragment and not origin.username and not origin.password, 'Release HTTPS origin: ' + config['apiOrigin'])
check(bool(re.fullmatch(r'\d+\.\d+\.\d+', config['version'])), 'Marketing version has three numeric components')
build = os.getenv('B4_BUILD_NUMBER', config['buildNumber'])
check(bool(re.fullmatch(r'[1-9]\d{0,3}(?:\.\d{1,2}){0,2}', build)), 'Apple build number: ' + build)
expected_data = {'Name', 'EmailAddress', 'UserID', 'AudioData', 'PhotosorVideos', 'OtherUserContent', 'ProductInteraction', 'OtherUsageData', 'OtherDataTypes'}
for platform, info_file, privacy_file, project_file in [
    ('ipad', 'ios/B4Skills/Info.plist', 'ios/B4Skills/PrivacyInfo.xcprivacy', 'ios/B4Skills.xcodeproj/project.pbxproj'),
    ('macos', 'macos/b4skills-native-macOS/Info.plist', 'macos/PrivacyInfo.xcprivacy', 'macos/b4skills-native.xcodeproj/project.pbxproj'),
]:
    if args.platform not in ['all', platform]: continue
    info, privacy = plist(ROOT / info_file), plist(ROOT / privacy_file)
    project = (ROOT / project_file).read_text()
    check(info.get('NSAppTransportSecurity', {}).get('NSAllowsArbitraryLoads') is False, platform + ': arbitrary HTTP disabled')
    check(all(info.get(k) for k in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']), platform + ': camera/microphone purpose strings')
    check(privacy.get('NSPrivacyTracking') is False, platform + ': no tracking declaration')
    data = privacy.get('NSPrivacyCollectedDataTypes', [])
    check({d['NSPrivacyCollectedDataType'].removeprefix('NSPrivacyCollectedDataType') for d in data} == expected_data, platform + ': collected-data categories match current payload inventory')
    check(all(d.get('NSPrivacyCollectedDataTypeLinked') is True and d.get('NSPrivacyCollectedDataTypeTracking') is False and d.get('NSPrivacyCollectedDataTypePurposes') == ['NSPrivacyCollectedDataTypePurposeAppFunctionality'] for d in data), platform + ': account-linked app-functionality data; no advertising/tracking')
    check(f'PRODUCT_BUNDLE_IDENTIFIER = {config["bundleId"]};' in project and f'DEVELOPMENT_TEAM = {config["teamId"]};' in project, platform + ': configured bundle ID and signing team')
    check(f'MARKETING_VERSION = {config["version"]};' in project and f'CURRENT_PROJECT_VERSION = {config["buildNumber"]};' in project, platform + ': source versions match release.json')
    if platform == 'ipad': check('TARGETED_DEVICE_FAMILY = 2;' in project and 'TARGETED_DEVICE_FAMILY = "1,2"' not in project, 'iPad-only family; no iPhone target')

# Platform-specific assets: Apple masks iPad; macOS retains its transparent silhouette.
from PIL import Image, ImageChops
for platform, source_file, catalog_path in [
    ('ipad', 'src/assets/app-icon-ipad.png', 'ios/B4Skills/Images.xcassets/AppIcon.appiconset'),
    ('macos', 'src/assets/app-icon-macos.png', 'macos/b4skills-native-macOS/Assets.xcassets/AppIcon.appiconset'),
]:
    if args.platform not in ['all', platform]: continue
    source = Image.open(ROOT / source_file).convert('RGB' if platform == 'ipad' else 'RGBA')
    check(source.width == source.height, platform + ': app icon source is square')
    if platform == 'ipad':
        pixels = [source.getpixel((x, y)) for x, y in [(0, 0), (source.width // 2, 0), (source.width - 1, 0), (0, source.height // 2), (source.width - 1, source.height // 2), (0, source.height - 1), (source.width // 2, source.height - 1), (source.width - 1, source.height - 1)]]
        check(all(min(pixel) < 230 for pixel in pixels), 'iPad icon has colored full-bleed edges, no white matte')
    else:
        check(source.getchannel('A').getextrema() == (0, 255) and all(source.getpixel(point)[3] == 0 for point in [(0, 0), (source.width - 1, 0), (0, source.height - 1), (source.width - 1, source.height - 1)]), 'macOS icon preserves transparent outer corners')
    catalog = ROOT / catalog_path
    for entry in json.loads((catalog / 'Contents.json').read_text())['images']:
        size = round(float(entry['size'].split('x')[0]) * float(entry.get('scale', '1x').rstrip('x')))
        image = Image.open(catalog / entry['filename'])
        expected = source.resize((size, size), Image.Resampling.LANCZOS)
        delta = ImageChops.difference(image.convert('RGBA'), expected.convert('RGBA'))
        check(image.mode == source.mode and image.size == (size, size) and not any(channel.getbbox() for channel in delta.split()), f'Artwork {entry["filename"]}: {size}px, matches {platform} source and alpha')
check("require('./b4skills-logo.png')" in (ROOT / 'src/assets/logo.ts').read_text(), 'In-app logo retains the original wordmark')

if args.xcode_settings:
    resolved = {}
    keys = ['CONFIGURATION', 'PRODUCT_BUNDLE_IDENTIFIER', 'PRODUCT_NAME', 'MARKETING_VERSION', 'CURRENT_PROJECT_VERSION', 'DEVELOPMENT_TEAM', 'CODE_SIGN_STYLE', 'TARGETED_DEVICE_FAMILY', 'ARCHS', 'DEBUG_INFORMATION_FORMAT', 'SKIP_INSTALL', 'ONLY_ACTIVE_ARCH', 'ENABLE_HARDENED_RUNTIME', 'SWIFT_ACTIVE_COMPILATION_CONDITIONS']
    for platform, workspace, scheme in [('ipad', 'ios/B4Skills.xcworkspace', 'B4Skills'), ('macos', 'macos/b4skills-native.xcworkspace', 'b4skills-native-macOS')]:
        if args.platform not in ['all', platform]: continue
        result = subprocess.run(['xcodebuild', '-workspace', workspace, '-scheme', scheme, '-configuration', 'Release', '-showBuildSettings', '-json'], cwd=ROOT, capture_output=True, text=True)
        check(result.returncode == 0, platform + ': Xcode resolves Release scheme')
        if result.returncode: continue
        targets = json.loads(result.stdout)
        target = next((t for t in targets if t['target'] == scheme), None)
        check(target is not None, platform + ': correct application target')
        if target is None: continue
        settings = target['buildSettings']; resolved[platform] = {k: settings.get(k) for k in keys}
        for key, expected in [('CONFIGURATION', 'Release'), ('PRODUCT_BUNDLE_IDENTIFIER', config['bundleId']), ('MARKETING_VERSION', config['version']), ('CURRENT_PROJECT_VERSION', config['buildNumber']), ('DEVELOPMENT_TEAM', config['teamId']), ('CODE_SIGN_STYLE', 'Automatic'), ('DEBUG_INFORMATION_FORMAT', 'dwarf-with-dsym'), ('SKIP_INSTALL', 'NO'), ('ONLY_ACTIVE_ARCH', 'NO')]:
            check(settings.get(key) == expected, platform + ': resolved ' + key + '=' + str(settings.get(key)))
        check('DEBUG' not in settings.get('SWIFT_ACTIVE_COMPILATION_CONDITIONS', '').split(), platform + ': Release has no Swift DEBUG condition')
        if platform == 'ipad': check(settings.get('TARGETED_DEVICE_FAMILY') == '2', 'Resolved iPad-only device family')
        else: check(settings.get('ENABLE_HARDENED_RUNTIME') == 'YES', 'Resolved macOS hardened runtime')
    output = ROOT / 'build/distribution/ReleaseSettings.json'; output.parent.mkdir(parents=True, exist_ok=True); output.write_text(json.dumps(resolved, indent=2))

if not args.source_only:
    identities = subprocess.run(['security', 'find-identity', '-v', '-p', 'codesigning'], capture_output=True, text=True)
    check(any('Apple Distribution:' in line and '(' + config['teamId'] + ')' in line for line in identities.stdout.splitlines()), 'Apple Distribution identity for configured team')
    profiles = []
    for directory in [Path.home() / 'Library/Developer/Xcode/UserData/Provisioning Profiles', Path.home() / 'Library/MobileDevice/Provisioning Profiles']:
        for file in directory.glob('*'):
            if file.suffix not in ['.mobileprovision', '.provisionprofile']: continue
            result = subprocess.run(['security', 'cms', '-D', '-i', str(file)], capture_output=True)
            if result.returncode: continue
            try: profiles.append(plistlib.loads(result.stdout))
            except Exception: continue
    for platform, accepted in [('ipad', {'iOS'}), ('macos', {'OSX', 'macOS'})]:
        if args.platform not in ['all', platform]: continue
        matches = []
        for p in profiles:
            entitlement = p.get('Entitlements', {}); appid = entitlement.get('application-identifier', entitlement.get('com.apple.application-identifier', ''))
            if config['teamId'] not in p.get('TeamIdentifier', []) or not fnmatch.fnmatchcase(config['teamId'] + '.' + config['bundleId'], appid): continue
            expires = p.get('ExpirationDate')
            if not expires or expires.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc): continue
            if not set(p.get('Platform', [])).intersection(accepted): continue
            if entitlement.get('get-task-allow') or entitlement.get('com.apple.security.get-task-allow') or p.get('ProvisionedDevices') or p.get('ProvisionsAllDevices'): continue
            matches.append(p)
        check(bool(matches), platform + ': unexpired App Store provisioning profile for ' + config['bundleId'])

if args.online:
    for path, expected in [('/api/health', 200), ('/api/assessment/policy', 401), ('/api/sessions/testflight-preflight/camera-policy', 401)]:
        # Use macOS curl's system certificate store, not a Python installation's
        # potentially unconfigured CA bundle. TLS verification remains enabled.
        response = subprocess.run(['curl', '--silent', '--show-error', '--proto', '=https', '--connect-timeout', '10', '--max-time', '20', '--user-agent', 'B4Skills-ReleasePreflight/1.0', '--header', 'Accept: application/json', '--write-out', '\n%{http_code}', config['apiOrigin'] + path], capture_output=True)
        if response.returncode:
            check(False, path + ': network/TLS failure: ' + response.stderr.decode(errors='replace').strip()); continue
        body, _, status_text = response.stdout.rpartition(b'\n')
        status = int(status_text)
        try: payload = json.loads(body)
        except Exception: payload = None
        check(status == expected and isinstance(payload, dict), f'Live {path}: HTTP {status}, expected JSON HTTP {expected}')
        if path == '/api/health' and status == 200:
            check(payload.get('status') == 'ok' and payload.get('database') == 'up', 'Live backend and database healthy')

if args.archive:
    apps = list((args.archive / 'Products/Applications').glob('*.app'))
    check(len(apps) == 1, 'Archive contains exactly one top-level application')
    if len(apps) == 1:
        app = apps[0]; mac = (app / 'Contents/Info.plist').exists()
        info = plist(app / ('Contents/Info.plist' if mac else 'Info.plist'))
        check(info.get('CFBundleIdentifier') == config['bundleId'], 'Archived bundle identifier')
        check(info.get('CFBundleShortVersionString') == config['version'] and info.get('CFBundleVersion') == build, 'Archived version/build')
        check(info.get('DTPlatformName') in ['macosx', 'iphoneos'], 'Archive is device/macOS, not iPad simulator')
        if not mac: check(info.get('UIDeviceFamily') == [2], 'Archived app supports iPad only')
        resource = app / ('Contents/Resources' if mac else '')
        bundle = resource / 'main.jsbundle'
        check(bundle.exists(), 'Archive embeds its JS bundle; Metro not needed')
        if bundle.exists(): check(b'NATIVE PHOTO QUEUE QA' not in bundle.read_bytes(), 'Archive excludes QA fixture entry point')
        check((resource / 'PrivacyInfo.xcprivacy').exists(), 'Archive embeds its privacy manifest')
        check(not any(p.name in {'.env', 'backend.env', 'candidates.json'} for p in app.rglob('*')), 'Archive excludes runtime credential files')
        check(any((args.archive / 'dSYMs').glob('*.dSYM')), 'Archive contains symbol files')
        hermes = app / ('Contents/Frameworks/hermesvm.framework/hermesvm' if mac else 'Frameworks/hermesvm.framework/hermesvm')
        if hermes.exists():
            hermes_symbols = args.archive / 'dSYMs/hermesvm.framework.dSYM'
            def symbol_uuids(path):
                result = subprocess.run(['dwarfdump', '--uuid', str(path)], capture_output=True, text=True)
                return set(re.findall(r'UUID: ([A-F0-9-]+) \(([^)]+)\)', result.stdout)) if result.returncode == 0 else set()
            runtime_uuids = symbol_uuids(hermes)
            check(bool(runtime_uuids) and symbol_uuids(hermes_symbols) == runtime_uuids, 'Hermes dSYM UUIDs match every archived architecture')
        if not args.unsigned:
            signed = subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], capture_output=True)
            check(signed.returncode == 0, 'Archive code signature verifies')
            identity = subprocess.run(['codesign', '-dvv', str(app)], capture_output=True, text=True).stderr
            check('TeamIdentifier=' + config['teamId'] in identity and 'Signature=adhoc' not in identity, 'Archive uses configured Apple team, not ad-hoc signing')
        else: print('NOTE Unsigned validation archive only; NOT export/upload ready')

report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'platform': args.platform, 'sourceOnly': args.source_only, 'online': args.online, 'archiveProvided': bool(args.archive), 'unsignedValidation': args.unsigned, 'checksPassed': not errors, 'blockers': errors, 'checks': results, 'note': 'Technical checks only; App Store Connect metadata and signed archive/export require separate validation.'}
report_file = ROOT / 'build/distribution' / ('preflight-source.json' if args.source_only else 'preflight-readiness.json')
report_file.parent.mkdir(parents=True, exist_ok=True)
report_file.write_text(json.dumps(report, indent=2))
print(f'\n{len(errors)} blocking check(s). No upload, account creation or backend mutation performed.')
sys.exit(1 if errors else 0)
