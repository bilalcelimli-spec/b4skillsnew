"""Attach official Hermes Release symbols only after exact binary UUID matching."""
from pathlib import Path
import hashlib, json, re, shutil, subprocess, sys, tarfile, tempfile

root = Path(__file__).resolve().parents[2]
platform, archive_arg = sys.argv[1:]
if platform not in ('ipad', 'macos'):
    raise SystemExit('Expected ipad or macos')
archive = Path(archive_arg).resolve()
frameworks = list((archive / 'Products').rglob('hermesvm.framework'))
if len(frameworks) != 1:
    raise SystemExit('Expected exactly one archived Hermes framework')
binary = frameworks[0] / 'hermesvm'
def uuids(path):
    output = subprocess.check_output(['dwarfdump', '--uuid', str(path)], text=True)
    result = set(re.findall(r'UUID: ([A-F0-9-]+) \(([^)]+)\)', output))
    if not result:
        raise SystemExit('No UUIDs in ' + str(path))
    return result
expected = uuids(binary)
version = json.loads((root / 'node_modules/hermes-compiler/package.json').read_text())['version']
if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', version):
    raise SystemExit('Unsupported Hermes artifact version')
cache = root / 'build/distribution/vendor-symbols'
cache.mkdir(parents=True, exist_ok=True)
tarball = cache / ('hermes-' + version + '-release.tar.gz')
url = f'https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/{version}/hermes-ios-{version}-hermes-framework-dSYM-release.tar.gz'
if not tarball.exists():
    pending = tarball.with_suffix('.download')
    subprocess.run(['curl', '--fail', '--location', '--retry', '2', '--connect-timeout', '20', '--max-time', '300', url, '-o', str(pending)], check=True)
    pending.rename(tarball)
folder = 'iphoneos' if platform == 'ipad' else 'macosx'
with tempfile.TemporaryDirectory(prefix='b4skills-hermes-symbols-') as temporary:
    temporary = Path(temporary)
    # Reject traversal and links before extracting the two known vendor directories.
    with tarfile.open(tarball) as package:
        for member in package.getmembers():
            path = Path(member.name)
            if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk():
                raise SystemExit('Unsafe vendor symbol archive entry')
    subprocess.run(['tar', '-xzf', str(tarball), '-C', str(temporary), './' + folder], check=True)
    source = temporary / folder / 'hermesvm.framework.dSYM'
    actual = uuids(source)
    if actual != expected:
        raise SystemExit('Vendor dSYM UUID/architecture mismatch; refusing unrelated symbols')
    destination = archive / 'dSYMs/hermesvm.framework.dSYM'
    if destination.exists():
        if uuids(destination) != expected:
            raise SystemExit('Existing archive dSYM mismatch')
    else:
        shutil.copytree(source, destination)
digest = hashlib.sha256()
with tarball.open('rb') as file:
    for chunk in iter(lambda: file.read(1024 * 1024), b''):
        digest.update(chunk)
report = {'source': url, 'artifactSHA256': digest.hexdigest(), 'uuids': sorted(expected), 'platform': platform, 'archive': str(archive)}
(archive / 'vendor-symbols.json').write_text(json.dumps(report, indent=2))
print('PASS Official Hermes Release dSYM matches every archived UUID:', sorted(expected))
