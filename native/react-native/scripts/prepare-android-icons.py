"""Package Android artwork: adaptive launcher icon and Android 12 splash icon.

Launcher: the full-bleed iPad icon is the foreground layer. Launchers mask it to a circle,
squircle or rounded square, so it is scaled until the wordmark fits inside the 66 dp safe
circle while the artwork still covers the largest visible mask (72 dp of the 108 dp canvas).

Splash: the horizontal in-app logo, centred so it fits the 160 dp circle the system shows
out of the 240 dp splash icon canvas, on the #1E0820 opening background (set in colors.xml).
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
res = root / 'android/app/src/main/res'
densities = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

icon = Image.open(root / 'src/assets/app-icon-ipad.png').convert('RGBA')
if icon.width != icon.height:
    raise SystemExit('Android icon source must be square')
ICON_SCALE = 0.76  # wordmark inside the safe circle; artwork wider than every mask

for name, factor in densities.items():
    folder = res / f'mipmap-{name}'
    folder.mkdir(parents=True, exist_ok=True)
    for legacy in ('ic_launcher.png', 'ic_launcher_round.png'):
        (folder / legacy).unlink(missing_ok=True)  # minSdk 29: adaptive icons only
    canvas_px = round(108 * factor)
    art_px = round(canvas_px * ICON_SCALE)
    layer = Image.new('RGBA', (canvas_px, canvas_px), (0, 0, 0, 0))
    offset = (canvas_px - art_px) // 2
    layer.paste(icon.resize((art_px, art_px), Image.Resampling.LANCZOS), (offset, offset))
    layer.save(folder / 'ic_launcher_foreground.png', optimize=True)

logo = Image.open(root / 'src/assets/b4skills-logo.png').convert('RGBA')
SPLASH_PX = 240 * 4  # xxxhdpi; the system scales down for other densities
LOGO_WIDTH = 0.62    # a 3:1 logo this wide stays inside the 160 dp visible circle
width = round(SPLASH_PX * LOGO_WIDTH)
height = round(width * logo.height / logo.width)
splash = Image.new('RGBA', (SPLASH_PX, SPLASH_PX), (0, 0, 0, 0))
splash.paste(logo.resize((width, height), Image.Resampling.LANCZOS), ((SPLASH_PX - width) // 2, (SPLASH_PX - height) // 2))
(res / 'drawable-xxxhdpi').mkdir(parents=True, exist_ok=True)
splash.save(res / 'drawable-xxxhdpi/splash_logo.png', optimize=True)

# Google Play listing icon (512 x 512, opaque). Uploaded by hand in Play Console.
icon.convert('RGB').resize((512, 512), Image.Resampling.LANCZOS).save(root / 'android/play-store-icon.png', optimize=True)
print('Android launcher, splash and Play Store icons regenerated')
