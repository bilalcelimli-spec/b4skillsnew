"""Select installed, explicit App Store profiles and local private-key identities."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, plistlib, re, subprocess, sys

root = Path(__file__).resolve().parents[2]
platform, destination = sys.argv[1:]
config = json.loads((root / 'release.json').read_text())
identities = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'codesigning'], text=True)
valid = set(re.findall(r'\b[A-F0-9]{40}\b', identities))
accepted = {'iOS'} if platform == 'ipad' else {'OSX', 'macOS'}
matches = []
for directory in [Path.home() / 'Library/Developer/Xcode/UserData/Provisioning Profiles', Path.home() / 'Library/MobileDevice/Provisioning Profiles']:
    for file in directory.glob('*'):
        if file.suffix not in {'.mobileprovision', '.provisionprofile'}: continue
        result = subprocess.run(['security', 'cms', '-D', '-i', str(file)], capture_output=True)
        if result.returncode: continue
        profile = plistlib.loads(result.stdout)
        entitlements = profile.get('Entitlements', {})
        appid = entitlements.get('application-identifier', entitlements.get('com.apple.application-identifier'))
        if appid != config['teamId'] + '.' + config['bundleId']: continue
        if config['teamId'] not in profile.get('TeamIdentifier', []): continue
        if not accepted.intersection(profile.get('Platform', [])): continue
        expires = profile.get('ExpirationDate')
        if not expires or expires.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc): continue
        if profile.get('ProvisionedDevices') or profile.get('ProvisionsAllDevices'): continue
        if entitlements.get('get-task-allow') or entitlements.get('com.apple.security.get-task-allow'): continue
        for certificate in profile.get('DeveloperCertificates', []):
            fingerprint = hashlib.sha1(certificate).hexdigest().upper()
            if fingerprint in valid and f'{fingerprint} "Apple Distribution:' in identities:
                matches.append((expires, profile['UUID'], fingerprint))
if not matches: raise SystemExit('No explicit App Store profile matching a local Apple Distribution private key.')
_, profile_id, certificate_id = sorted(matches)[-1]
options = {
    'method': 'app-store-connect', 'destination': 'export', 'teamID': config['teamId'],
    'signingStyle': 'manual', 'signingCertificate': certificate_id,
    'provisioningProfiles': {config['bundleId']: profile_id},
    'uploadSymbols': True, 'manageAppVersionAndBuildNumber': False,
}
if platform == 'macos':
    installer = subprocess.check_output(['security', 'find-identity', '-v', '-p', 'basic'], text=True)
    matches = [line for line in installer.splitlines() if '3rd Party Mac Developer Installer:' in line and '(' + config['teamId'] + ')' in line]
    if len(matches) != 1: raise SystemExit('Exactly one valid Mac Installer identity for the configured team is required.')
    options['installerSigningCertificate'] = re.search(r'\b[A-F0-9]{40}\b', matches[0]).group()
output = Path(destination); output.parent.mkdir(parents=True, exist_ok=True)
output.write_bytes(plistlib.dumps(options))
print(f'Local export: {platform}, explicit profile {profile_id}, Apple Distribution {certificate_id}; destination=export')
