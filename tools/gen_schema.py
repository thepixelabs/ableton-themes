#!/usr/bin/env python3
"""Emit the canonical Live 12 theme schema + role map as inlinable JS.

Reads ONLY structure from a local Ableton install: tag order, nesting, value types,
alpha channels, which tags co-vary, and normalised lightness positions. No Ableton
colour is emitted -- hue and chroma come entirely from our own palettes in editor.html.

Roles are derived from co-variance across ALL built-in themes, not one reference.
A role map derived from a dark theme alone is wrong: light themes regroup the tags
(18 of 94 dark-derived roles split apart under Default Light *), so grouping must
hold everywhere to be safe.

Usage: python3 tools/gen_schema.py [themes-dir] > build/schema.js
"""
import re, sys, glob, os, math, json, collections

DEFAULT_DIR = "/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Themes"
DARK_REF, LIGHT_REF = "Default Dark Cool Medium.ask", "Default Light Cool Medium.ask"
NEUTRAL_C = 0.030          # below this chroma a role is chassis, not accent

# Semantic names for the groups we care about, keyed by the dark reference's value.
# Only a naming layer -- grouping itself is derived, never assumed from this table.
NAME_BY_DARK_REF = {
    "#0f1117": "ui.frameDeep",     "#16181f": "bg.deepest",   "#1c1e26": "bg.control",
    "#22242d": "bg.surface",       "#272a33": "bg.desktop",   "#2d2f3a": "bg.laneIdle",
    "#333540": "bg.raised",        "#3b3d48": "bg.detail",    "#434550": "bg.highlight",
    "#51535f": "ui.spectrum",      "#5a5c68": "ui.handle",    "#60626f": "ui.faint",
    "#676975": "ui.scrollbar",     "#737581": "text.dim",     "#848591": "text.mid",
    "#8f909c": "text.ruler",       "#b3b4bd": "text.primary", "#06060a": "text.onAccent",
    "#000000": "text.onClip",
    "#00000000": "ui.transparent",  "#00000066": "ui.shadeSoft", "#0000007f": "ui.shadeMed",
    "#06060954": "grid.line",       "#090a10": "grid.automation","#0a0a1419": "grid.tiles",
    "#07070726": "midi.blackKeyBg", "#0a0a0a19": "midi.keySep",  "#16171fef": "wave.main",
    "#21242e54": "ui.shadowDark",   "#272933bf": "ui.toolFrame", "#272b33cc": "ui.shadowLight",
    "#676975df": "wave.dimmed",     "#8484914f": "grid.loopOff", "#8386904c": "curve.output",
    "#b2b2be3f": "grid.spectrum",   "#b2b5be4f": "grid.guideOff","#b3b5bd7f": "grid.label",
    "#bebfc7": "curve.outputLine",
    "#ffad56": "accent.primary",   "#03c3d5": "accent.secondary", "#ff697f": "display.handle2",
    "#b0ddeb": "sel.background",   "#7a959e": "sel.backgroundContrast",
    "#637e86": "sel.standby",      "#5b8cff": "accent.hover",
    "#ecca6d": "accent.search",    "#ccaa66": "accent.searchStandby", "#b3d4e5": "accent.linked",
    "#ff5559": "sem.record",       "#ff000064": "sem.recordArm",
    "#00d38d": "sem.play",         "#3c6ab6": "sem.preListen",
    "#e76942": "sem.alert",        "#4391e6": "sem.freeze",
    "#009aac": "sem.modulation",   "#79bdc7a9": "sem.modulationOff", "#8cffff": "sem.modulationHover",
    "#ff4d47": "sem.automation",   "#ff9085": "sem.automationHover", "#646464": "sem.automationOff",
    "#e95449": "sem.velocity",     "#f5a7a3": "sem.velocityZone",
    "#acf6b4": "sem.keyZone",      "#28bd56": "sem.keyZoneRamp",
    "#bed6f4": "sem.selectorZone", "#2d66d2": "sem.selectorZoneRamp", "#b595fc": "sem.scale",
    "#4034ef": "learn.midi",       "#ff6400": "learn.key",    "#00da48": "learn.macro",
    "#00ff00": "brand.ableton",
    "#e0d825": "op.1", "#29d6cd": "op.2", "#6571f6": "op.3", "#f3751b": "op.4",
    "#007383": "field.edit1", "#a03c4c": "field.edit2", "#7b5732": "field.edit3",
    "#8b7936": "clip.1",  "#999565": "clip.2",  "#b8ce93": "clip.3",  "#afb95b": "clip.4",
    "#52ba46": "clip.5",  "#81d24c": "clip.6",  "#6baace": "clip.7",  "#4881aa": "clip.8",
    "#954eb2": "clip.9",  "#ff5f80": "clip.10", "#dc4848": "clip.11", "#d66b18": "clip.12",
    "#e0aa2a": "clip.13", "#ffec75": "clip.14", "#e7e6e6": "clip.15", "#a0a0a0": "clip.16",
}

def parse(path):
    group, out = None, []
    for ln in open(path).read().split("\n"):
        s = ln.strip()
        m = re.match(r'<([A-Za-z0-9_]+) Value="([^"]*)" />$', s)
        if m:
            tag, val = m.groups()
            kind = "color" if val.startswith("#") else ("bool" if val in ("true","false") else "number")
            out.append({"tag": tag, "group": group, "kind": kind, "val": val}); continue
        m = re.match(r'<([A-Za-z0-9_]+)>$', s)
        if m and m.group(1) != "Theme": group = m.group(1)
        elif re.match(r'</[A-Za-z0-9_]+>$', s): group = None
    return out

def srgb2lin(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def oklch(hexv):
    h = hexv[1:7]
    r, g, b = [srgb2lin(int(h[i:i+2],16)/255) for i in (0,2,4)]
    l = (0.4122214708*r + 0.5363325363*g + 0.0514459929*b) ** (1/3)
    m = (0.2119034982*r + 0.6806995451*g + 0.1073969566*b) ** (1/3)
    s = (0.0883024619*r + 0.2817188376*g + 0.6299787005*b) ** (1/3)
    L = 0.2104542553*l + 0.7936177850*m - 0.0040720468*s
    A = 1.9779984951*l - 2.4285922050*m + 0.4505937099*s
    B = 0.0259040371*l + 0.7827717662*m - 0.8086757660*s
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360

def camel(tag): return tag[0].lower() + tag[1:]

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DIR
    files = sorted(glob.glob(os.path.join(d, "*.ask")))
    if not files: raise SystemExit("no .ask files in " + d)
    for need in (DARK_REF, LIGHT_REF):
        if not os.path.exists(os.path.join(d, need)):
            raise SystemExit("missing reference theme: " + need)

    entries = parse(os.path.join(d, DARK_REF))
    base = [(e["tag"], e["group"]) for e in entries]
    parsed = {}
    for f in files:
        p = parse(f)
        if [(e["tag"], e["group"]) for e in p] != base:
            raise SystemExit("tag set/order differs in " + f)
        parsed[os.path.basename(f)] = p

    # Co-variance across EVERY built-in: two tags share a role only if they hold the
    # same value in all 18. This is what makes the map valid for light themes too.
    n = len(entries)
    sig = collections.defaultdict(list)
    for i in range(n):
        if entries[i]["kind"] != "color" or entries[i]["group"]: continue
        sig[tuple(parsed[f][i]["val"] for f in sorted(parsed))].append(i)

    dark, light = parsed[DARK_REF], parsed[LIGHT_REF]
    used, role_of = collections.Counter(), {}
    for key, idxs in sorted(sig.items(), key=lambda kv: kv[1][0]):
        lead = entries[idxs[0]]["tag"]
        name = NAME_BY_DARK_REF.get(dark[idxs[0]]["val"]) or camel(lead)
        if used[name]:                       # a split group -- disambiguate by lead tag
            name = "%s.%s" % (name, camel(lead))
        used[name] += 1
        for i in idxs: role_of[i] = name

    rows, roleinfo = [], {}
    for i, e in enumerate(entries):
        if e["group"]:
            role = "meter.%s.%s" % (e["group"].replace("VuMeter",""), e["tag"])
        elif e["kind"] != "color":
            role = "num." + e["tag"]
        else:
            role = role_of[i]
        alpha = e["val"][7:9] if e["kind"] == "color" and len(e["val"]) == 9 else ""
        rows.append('["%s","%s","%s","%s","%s"]' % (e["tag"], e["group"] or "", e["kind"][0], role, alpha))
        if e["kind"] == "color" and role not in roleinfo:
            dL, dC, _ = oklch(dark[i]["val"]); lL, lC, _ = oklch(light[i]["val"])
            roleinfo[role] = {
                "d": round(dL, 4), "l": round(lL, 4),
                "t": "neutral" if max(dC, lC) < NEUTRAL_C else "colour",
            }

    print("// Generated by tools/gen_schema.py -- do not edit by hand.")
    print("// Structure only: no Ableton colour values. Hue/chroma come from our palettes.")
    print("// [tag, vuGroup, kind(c|n|b), role, alphaHex]  %d entries, canonical order." % len(rows))
    print("var SCHEMA = [\n  " + ",\n  ".join(rows) + "\n];")
    print()
    print("// role -> { d: dark-mode L, l: light-mode L, t: neutral|colour }")
    print("// L is OKLab lightness 0..1, the positional structure each mode expects.")
    print("var ROLE_L = " + json.dumps(roleinfo, indent=0, sort_keys=True).replace("\n","") + ";")
    sys.stderr.write("ok: %d entries, %d roles (%d neutral, %d colour)\n" % (
        len(rows), len(roleinfo),
        sum(1 for v in roleinfo.values() if v["t"]=="neutral"),
        sum(1 for v in roleinfo.values() if v["t"]=="colour")))

if __name__ == "__main__":
    main()
