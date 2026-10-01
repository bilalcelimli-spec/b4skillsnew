# PDF fonts

Noto Sans Regular and Bold provide embedded Unicode glyphs for candidate names
and report text, including Turkish characters. They are distributed under the
SIL Open Font License in `OFL.txt`.

Source: the Noto Sans fonts bundled with LibreOffice in the Codex workspace
runtime. Upstream project: https://github.com/notofonts/noto-fonts.

The report renderer loads fonts locally, without network access. Vite copies
these assets to `dist/fonts` for production; source runs use `public/fonts`.
