# PixeLabs: Free Ableton Live Themes

**[abletonthemes.pixelabs.net](https://abletonthemes.pixelabs.net)**

**For Ableton Live 12 producers: 45 free themes, plus a browser-based editor for making your own.**

No install, no account, no sign-up, and it works fully offline. Built by [PixeLabs](https://pixelabs.net).

---

## Just want the themes?

1. Download the pack: [`pack/pixelabs-theme-pack.zip`](pack/pixelabs-theme-pack.zip) (or use *Code → Download ZIP* above for the whole repo, source included).
2. Unzip it. Every theme is named `PXL <Name>.ask`. The `PXL ` prefix keeps them clustered together in Live's flat, alphabetical Look/Feel dropdown instead of scattering through Ableton's own 18.
3. Install:

   **macOS.** The Themes folder lives *inside* the app, not in your user Library. Quit Live. In Finder, open Applications, right-click your Ableton Live app, choose **Show Package Contents**, then open `Contents/App-Resources/Themes` and drop the `.ask` files in.

   > A Live update replaces the app bundle and wipes this folder. Keep your `.ask` files somewhere else too, and reinstall them after every update.

   **Windows.** Commonly `C:\ProgramData\Ableton\Live 12\Resources\Themes\`. If that path doesn't exist, look for `Resources\Themes` inside your Ableton install folder instead. (This is unverified: the repo was built without a Windows machine to test against. If it's wrong for your setup, please open an issue.)

   Or skip the manual copy. The zip also contains `install-macos.command` and `install-windows.bat`. Each one finds your Ableton install on its own, copies every `.ask` file sitting next to it (any filename, not just `PXL` ones), and refuses to run while Live is open. Both are plain text; read them before you run them.

4. Restart Live, then go to **Preferences → Look/Feel → Theme** and pick one.

## Want to make your own?

Open `editor.html`. It's one self-contained file: double-click it and it opens in your browser, no build step, no install, and it works fully offline on both macOS and Windows.

Inside: sliders for background hue and tint, contrast and depth, two accent colours, overall saturation, and the clip palette (hue, spread, saturation, lightness); a live mock-up of Live's interface so you can judge a palette without restarting Live; a contrast readout that grades every text pair against WCAG as you work; per-colour overrides for all 186 roles the editor exposes (of the format's 276 total entries, the rest are numeric or boolean tuning values); and export buttons that save a single `.ask`, copy the raw XML, or download the whole 45-theme pack plus both installer scripts as one zip.

## The five families

| Family | Count | What it's for |
|---|---|---|
| **Dark Pro** | 10 | Low-fatigue studio darks: restrained colour, wide tonal separation. |
| **Neon** | 10 | Psytrance and synthwave: high-chroma accents that still pass contrast. |
| **Retro** | 10 | Vintage hardware: cream, olive, oxblood, amber CRT. |
| **Light** | 10 | Daylight-legible themes. Almost nobody makes good ones. |
| **Cyberpunk** | 5 | Deep indigo and near-black under neon spring green, scarlet, and electric blue. |

## What makes these different

**Every theme is contrast-graded, not just eyeballed.** Body text, panel text, secondary text, and text-on-accent are all measured against WCAG minimums and have to pass before a theme ships (`tools/verify.js` enforces this on every build). They come out ahead of Ableton's own defaults too: Dark Pro's median body-text contrast is 8.3:1, against 7.5:1 for Live's own default dark theme; the Light family runs around 12.3:1 against Live's 11.0:1. As far as we know, no other Ableton theme pack grades contrast at all.

**The clip palette is recoloured.** Ableton ships `Clip1` through `Clip16` byte-identical across all 18 of its built-in themes, and it's an easy thing for a third-party pack to leave alone since it doesn't show up in a screenshot. These don't; open Session View after installing one and you'll see it immediately.

**Built in OKLCH.** Live itself works in OKLab internally (it ships a field literally named `SessionSlotOklabLCompensationFactor`). Re-hueing in a perceptual colour space works with that grain instead of against it: shifting a theme's hue doesn't quietly wreck its contrast or its role hierarchy the way a naive RGB or HSL shift can.

More format detail, including the traps that catch a naive generator, is in [`docs/ask-format.md`](docs/ask-format.md).

## For developers

```
editor.html          the tool: a built artifact, committed to the repo, opened directly
index.html           landing page
pack/                45 generated themes by family, plus the zip (bundles both installers and INSTALL.txt)
src/                 editor source: colour engine, palette data, presets, UI, styles
build/schema.js      generated: Live's 276-entry schema and role map (structure only, no colour values)
tools/gen_schema.py  regenerates build/schema.js from a local Ableton Live 12 install
tools/gen_pack.js    regenerates pack/ and pack/pixelabs-theme-pack.zip from src/presets.js
tools/build.py       assembles src/* into editor.html
tools/verify.js      the full verification pass (24 checks; see below)
docs/ask-format.md   what we learned reverse engineering the .ask format
```

```bash
python3 tools/gen_schema.py > build/schema.js   # needs Ableton Live 12 installed locally
python3 tools/build.py                          # src/* → editor.html
bun tools/gen_pack.js                           # → pack/ + pack/pixelabs-theme-pack.zip
bun tools/verify.js                             # 24 checks; 3 need a local Ableton install and are skipped without one
```

`editor.html` has to stay a single self-contained file. It runs from `file://` after a plain download, where ES modules and `fetch()` of local files are both blocked and no CDN is reachable, so everything gets inlined at build time. `tools/verify.js` checks for external requests, `<script type="module">`, and an inlined schema, and fails the build if any of them show up.

## Licence

Do whatever you want with any of it. The whole repository is released into the public domain under [The Unlicense](LICENSE): the editor, the tooling, and all 45 themes. No attribution, no conditions. Use it, change it, ship it, sell it.

Not affiliated with or endorsed by Ableton AG. Ableton and Live are trademarks of Ableton AG.
