"""Package platform-specific artwork: iPad full bleed; macOS transparent perimeter."""
from pathlib import Path
from PIL import Image
import json

root = Path(__file__).resolve().parent.parent
for platform, source, catalog in [
    ('iPad', 'src/assets/app-icon-ipad.png', 'ios/B4Skills/Images.xcassets/AppIcon.appiconset'),
    ('macOS', 'src/assets/app-icon-macos.png', 'macos/b4skills-native-macOS/Assets.xcassets/AppIcon.appiconset'),
]:
    image = Image.open(root / source)
    if image.width != image.height:
        raise SystemExit(platform + ' icon source must be square')
    if platform == 'iPad':
        if image.mode == 'RGBA' and image.getchannel('A').getextrema() != (255, 255):
            raise SystemExit('iPad icon must be fully opaque')
        image = image.convert('RGB')
    else:
        if image.mode != 'RGBA' or image.getchannel('A').getextrema() != (0, 255):
            raise SystemExit('macOS icon must preserve transparent outer corners')
    catalog = root / catalog
    for entry in json.loads((catalog / 'Contents.json').read_text())['images']:
        size = round(float(entry['size'].split('x')[0]) * float(entry.get('scale', '1x').rstrip('x')))
        image.resize((size, size), Image.Resampling.LANCZOS).save(catalog / entry['filename'], optimize=True)
    print(platform + ' catalog regenerated from ' + source)
