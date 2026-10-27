"""Verify an exported IPA/PKG, including actual distribution signature and profile."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, os, plistlib, re, ssl, subprocess, sys, tempfile

root = Path(__file__).resolve().parents[2]
platform, filename = sys.argv[1:]
artifact = Path(filename).resolve()
config = json.loads((root / 'release.json').read_text())
checks = []
def check(ok, label):
    checks.append({'passed': bool(ok), 'message': label})
    print(('PASS ' if ok else 'FAIL ') + label)
    if not ok: raise RuntimeError(label)
def run(args):
    return subprocess.run(args, capture_output=True, env={**os.environ, 'LC_ALL': 'en_US.UTF-8'})

try:
    check(artifact.is_file() and artifact.suffix == ('.ipa' if platform == 'ipad' else '.pkg'), 'Expected local distribution artifact')
    with tempfile.TemporaryDirectory(prefix='b4skills-export-') as temp:
        temp = Path(temp)
        if platform == 'ipad':
            check(run(['ditto', '-x', '-k', str(artifact), str(temp)]).returncode == 0, 'IPA extracts successfully')
            apps = list((temp / 'Payload').glob('*.app'))
        else:
            signature = run(['pkgutil', '--check-signature', str(artifact)])
            text = signature.stdout.decode(errors='replace')
            check(signature.returncode == 0 and '3rd Party Mac Developer Installer:' in text
                  and '(' + config['teamId'] + ')' in text
                  and any(status in text for status in ['Status: signed by a certificate trusted by', 'Status: signed by a developer certificate issued by Apple']), 'PKG has valid Apple-issued Mac Installer signature for configured team')
            local_cert = run(['security', 'find-certificate', '-a', '-c', '3rd Party Mac Developer Installer:', '-p'])
            local_pems = re.findall(r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----', local_cert.stdout.decode(), re.S)
            leaf_section = text.split('SHA256 Fingerprint:', 1)[1].split('--------', 1)[0]
            leaf_hash = ''.join(re.findall(r'\b[0-9A-F]{2}\b', leaf_section)).lower()
            check(any(hashlib.sha256(ssl.PEM_cert_to_DER_cert(pem)).hexdigest() == leaf_hash for pem in local_pems), 'PKG installer certificate matches local signing identity')
            check(run(['pkgutil', '--expand-full', str(artifact), str(temp / 'package')]).returncode == 0, 'PKG payload expands without installation')
            apps = list((temp / 'package').rglob('B4Skills.app'))
        check(len(apps) == 1, 'One exported application')
        app = apps[0]; mac = platform == 'macos'
        contents = app / 'Contents' if mac else app
        info = plistlib.loads((contents / 'Info.plist').read_bytes())
        check(info.get('CFBundleIdentifier') == config['bundleId'], 'Exported bundle identifier')
        check(info.get('CFBundleShortVersionString') == config['version'] and info.get('CFBundleVersion') == os.getenv('B4_BUILD_NUMBER', config['buildNumber']), 'Exported version and build')
        check(run(['codesign', '--verify', '--deep', '--strict', str(app)]).returncode == 0, 'Exported signature verifies deeply')
        identity = run(['codesign', '-dvv', str(app)]).stderr.decode(errors='replace')
        check('Authority=Apple Distribution:' in identity and 'TeamIdentifier=' + config['teamId'] in identity, 'Actual app signature is Apple Distribution for configured team')
        signed = run(['codesign', '-d', '--entitlements', ':-', str(app)])
        check(signed.returncode == 0, 'Signed entitlements readable')
        entitlements = plistlib.loads(signed.stdout)
        check(not entitlements.get('get-task-allow') and not entitlements.get('com.apple.security.get-task-allow'), 'Exported app has no debugger entitlement')
        signed_appid = entitlements.get('application-identifier', entitlements.get('com.apple.application-identifier'))
        check(signed_appid == config['teamId'] + '.' + config['bundleId'], 'Signed application identifier explicitly matches configured app')
        check(all(info.get(key) for key in ['NSCameraUsageDescription', 'NSMicrophoneUsageDescription']), 'Exported camera and microphone purpose strings present')
        profile_file = contents / ('embedded.provisionprofile' if mac else 'embedded.mobileprovision')
        decoded = run(['security', 'cms', '-D', '-i', str(profile_file)])
        check(decoded.returncode == 0, 'Embedded distribution profile CMS decodes')
        profile = plistlib.loads(decoded.stdout); permissions = profile.get('Entitlements', {})
        appid = permissions.get('application-identifier', permissions.get('com.apple.application-identifier'))
        check(appid == config['teamId'] + '.' + config['bundleId'] and config['teamId'] in profile.get('TeamIdentifier', []), 'Embedded profile explicitly matches app and team')
        check(profile['ExpirationDate'].replace(tzinfo=timezone.utc) > datetime.now(timezone.utc), 'Embedded profile unexpired')
        check(not profile.get('ProvisionedDevices') and not profile.get('ProvisionsAllDevices') and not permissions.get('get-task-allow') and not permissions.get('com.apple.security.get-task-allow'), 'Embedded profile is for store distribution')
        cert_prefix = temp / 'signer'
        check(run(['codesign', '-d', '--extract-certificates=' + str(cert_prefix), str(app)]).returncode == 0, 'Actual public signing certificate extracted')
        fingerprint = hashlib.sha1(Path(str(cert_prefix) + '0').read_bytes()).digest()
        check(fingerprint in [hashlib.sha1(cert).digest() for cert in profile.get('DeveloperCertificates', [])], 'App signer matches embedded profile certificate')
        resource = contents / 'Resources' if mac else contents
        check((resource / 'main.jsbundle').is_file() and (resource / 'PrivacyInfo.xcprivacy').is_file(), 'JS and privacy manifest included')
        if mac:
            check(entitlements.get('com.apple.security.app-sandbox') is True, 'Mac App Store sandbox enabled')
            check(info.get('LSApplicationCategoryType') == 'public.app-category.education', 'macOS education category included')
            arch = run(['lipo', '-archs', str(contents / 'MacOS' / info['CFBundleExecutable'])]).stdout.decode().split()
            check(set(arch) == {'arm64', 'x86_64'}, 'macOS export is universal arm64 and x86_64')
        else:
            check(info.get('UIDeviceFamily') == [2] and info.get('DTPlatformName') == 'iphoneos', 'IPA supports iPad devices only')
            check(permissions.get('beta-reports-active') is True, 'Profile supports TestFlight beta reporting')
except Exception as error:
    if not checks or checks[-1]['passed']: checks.append({'passed': False, 'message': type(error).__name__})
    print('Export verification failed:', str(error))
finally:
    digest = hashlib.sha256()
    if artifact.is_file():
        with artifact.open('rb') as file:
            for chunk in iter(lambda: file.read(1024 * 1024), b''): digest.update(chunk)
    report = {'checkedAt': datetime.now(timezone.utc).isoformat(), 'artifact': str(artifact), 'sha256': digest.hexdigest() if artifact.is_file() else None, 'platform': platform, 'version': config['version'], 'buildNumber': os.getenv('B4_BUILD_NUMBER', config['buildNumber']), 'checksPassed': bool(checks) and all(c['passed'] for c in checks), 'checks': checks, 'uploaded': False}
    (artifact.parent / 'distribution-verification.json').write_text(json.dumps(report, indent=2))
sys.exit(0 if report['checksPassed'] else 1)
