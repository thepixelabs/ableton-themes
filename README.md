# PixeLabs — Free Ableton Live Themes

**Free themes for Ableton Live 12, and a theme editor that runs in your browser.**

45 ready-made themes across five families, plus a tool for making your own —
no install, no account, no sign-up. By [PixeLabs](https://pixelabs.net).

---

## Just want the themes?

1. **[Download the pack](../../archive/refs/heads/main.zip)** (or click *Code → Download ZIP* above)
2. Open the `pack/` folder — pick any `.ask` file
   Every theme is named `PXL …` so they cluster together in Live's Look/Feel
   dropdown instead of scattering through Ableton's own.

3. Drop it in Live's Themes folder:

   **macOS** — the folder is *inside* the Ableton app. Quit Live, then in Finder open
   **Applications**, right-click your Ableton Live app → **Show Package Contents** →
   `Contents/App-Resources/Themes`, and drop the `.ask` files in.

   > A Live update replaces the app and wipes this folder. Keep your `.ask` files
   > somewhere safe and copy them back after updating.

   **Windows** — `C:\ProgramData\Ableton\Live 12\Resources\Themes\`
   If that isn't there, look for `Resources\Themes` in your Ableton install directory.

4. Restart Live, then **Preferences → Look/Feel → Theme**

## Want to make your own?

Open **`editor.html`** — double-click it, it opens in your browser. That's the whole setup.
It works offline, on Windows and macOS, with nothing installed.

Or use it online: **[pixelabs.net/themes](https://pixelabs.net)** ← *TODO: set once GitHub Pages is live*

Inside you get sliders for hue, tint, contrast, accents and the clip palette; a live
mock-up of Live's interface so you can judge a palette without restarting; a contrast
readout; per-colour overrides for all 186 roles; and an export button.

## The five families

| Family | What it's for |
|---|---|
| **Dark Pro** (10) | Low-fatigue studio darks. Restrained colour, wide tonal separation. |
| **Neon** (10) | Psytrance and synthwave. High-chroma accents that still pass contrast. |
| **Retro** (10) | Vintage hardware — cream, olive, oxblood, amber CRT. |
| **Light** (10) | Daylight-legible themes. Almost nobody makes good ones. |
| **Cyberpunk** (5) | Deep indigo and near-black under neon spring green, scarlet and electric blue. |

## What makes these different

**Every theme is contrast-checked.** Body text, panel text, secondary text and text-on-accent
are all measured against WCAG and have to pass before a theme ships. As far as we can tell no
other Ableton theme pack does this. They come out ahead of Ableton's own themes: 8.3:1 body
text against their 7.5:1 in dark, 12.3:1 against their 11.0:1 in light.

**The clip palette is recoloured.** Live ships `Clip1`–`Clip16` identical in all 18 of its
built-in themes, so almost every third-party theme leaves them alone. These don't.

**Built in OKLCH.** Live works in OKLab internally, so re-hueing in a perceptual colour space
keeps contrast and hierarchy intact instead of producing muddy patches.

## For developers

```
editor.html          the tool — built artifact, commit it, open it directly
index.html           landing page
pack/                40 generated themes, by family
src/                 editor source (engine, palette, presets, UI, styles)
build/schema.js      generated: Live's 276-entry schema + role map (structure only)
tools/gen_schema.py  regenerates build/schema.js from a local Ableton install
tools/gen_pack.js    regenerates pack/
tools/build.py       assembles src/* into editor.html
tools/verify.js      full verification pass
docs/ask-format.md   what we learned decoding the .ask format
```

```bash
python3 tools/gen_schema.py > build/schema.js   # needs Ableton Live 12 installed
python3 tools/build.py                          # → editor.html
bun tools/gen_pack.js                           # → pack/
bun tools/verify.js                             # 12 checks
```

`editor.html` must stay a single self-contained file: it runs from `file://`, where ES modules
and `fetch()` of local files are blocked and no CDN is reachable. Everything is inlined, and
`tools/verify.js` enforces it.

## Licence

Editor source MIT. Themes CC0 — use them, change them, ship them, sell them.

Not affiliated with or endorsed by Ableton AG. Ableton and Live are trademarks of Ableton AG.
