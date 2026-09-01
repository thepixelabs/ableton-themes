# The Ableton Live 12 `.ask` theme format

Notes from decoding Live 12.4.5's built-in themes. Everything here was read from
`/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Themes/` (18 files) and
verified against all of them, not taken from documentation — Ableton publishes none.

## Shape

A `.ask` is plain UTF-8 XML, ~12 KB, tab-indented:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.0_12120" SchemaChangeCount="4" Creator="…" Revision="">
	<Theme>
		<ControlForeground Value="#b3b4bd" />
		…
		<StandardVuMeter>
			<OnlyMinimumToMaximum Value="false" />
			<Maximum Value="#ff0a0a" />
			…
		</StandardVuMeter>
	</Theme>
</Ableton>
```

| | |
|---|---|
| Entries | **276** — 236 colours, 33 numbers, 7 booleans |
| Nested groups | 7 VU meters, 7 entries each (49 total) |
| Colour format | `#RRGGBB` (211) or `#RRGGBBAA` (25) |
| Header | Identical in all 18 built-ins |

**All 18 built-in themes share a byte-identical tag set and element order.** That is what
makes a generator safe: emit the same 276 tags in the same order and the file is
structurally indistinguishable from one Ableton shipped.

## Things that will catch you out

**Roles derived from a dark theme are wrong for light themes.** Tags that share a value in
`Default Dark Cool Medium` do *not* all share one in `Default Light Cool Medium` — 18 of 94
dark-derived groups split apart. Grouping has to be derived across every built-in to be
valid. `tools/gen_schema.py` does this and asserts it.

**Light themes are not inverted dark themes.** In Live's light themes the chrome is
mid-grey and only the detail pane is light:

| Tag | Dark (luminance) | Light (luminance) |
|---|---|---|
| `SurfaceArea` | `#22242d` 0.02 | `#696e7a` 0.16 |
| `SurfaceBackground` | `#333540` 0.04 | `#a1a5ae` 0.38 |
| `DetailViewBackground` | `#3b3d48` 0.05 | `#c4c6cd` 0.57 |
| `ControlForeground` | `#b3b4bd` 0.46 | `#0f121a` 0.01 |

So `SurfaceArea` is *not* "the background" in a light theme — `DetailViewBackground` is.
Measuring light-theme contrast against `SurfaceArea` reports nonsense.

**`Clip1`–`Clip16` are identical across all 18 built-in themes.** Ableton never recolours
the clip palette. Changing it is the single most visible thing a custom theme can do, and
most third-party themes leave it alone.

**The numeric entries matter and are mode-dependent.** 22 of the 33 numbers differ between
light and dark — `ClipBlendFactor`, `StripedBackgroundShadeFactor`, `ClipBorderAlpha`,
and the lightness/saturation scalars Live applies to generated lane and take colours.
Reusing dark values in a light theme makes automation lanes and clip headers look wrong.

**`SessionSlotOklabLCompensationFactor`** — Live works in OKLab internally. Re-hueing a
theme in OKLCH is therefore working with the grain, and it keeps contrast and hierarchy
intact rather than requiring per-colour fixups.

**Booleans.** `OnlyMinimumToMaximum` appears once per VU meter group and is *not* uniform:
`true` for `OverloadVuMeter` and `OrangeVuMeter`, `false` for the other five. It draws a
single flat colour instead of a ramp. Treating the 7 as one value loses that.

## Where themes are installed

- **macOS** — inside the app bundle: `Ableton Live 12 Suite.app/Contents/App-Resources/Themes/`.
  **There is no user-level themes folder on macOS.** `~/Library/Application Support/Ableton/
  Live <version>/Resources/Themes/` is widely repeated online and is wrong — Live never
  creates it and never reads it. Verified on 12.4.5: the binary carries only a bare `Themes`
  string resolved against `App-Resources`, and the Look/Feel dropdown lists exactly the
  contents of that bundle folder. Because it is inside the app, **a Live update wipes it**.
- **Windows** — commonly `C:\ProgramData\Ableton\Live 12\Resources\Themes\`.
  Not verified here (no Windows machine); treat with the same suspicion as the macOS claim
  above until someone confirms it.

Then relaunch Live and choose it in **Preferences → Look/Feel → Theme**.

Live's theme dropdown is flat and alphabetical, and mixes custom themes in with its own
18. With a couple of dozen installed they become genuinely hard to find, which is why every
theme in `pack/` is named `PXL …` — the prefix is what keeps them together in that list.

## No theme can be protected

A `.ask` has to stay readable for Live to parse it. There is no encryption, licence check,
or obfuscation the format allows, and Live 10 dropped bitmap skins so there is not even an
image layer to hide value in. Anyone can open a theme in a text editor and copy all 276
values. A watermark can *trace* a leaked file back to a download; nothing prevents copying.
Any theme sold as "protected" is not.
