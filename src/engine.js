// Written into every .ask as Creator, and used wherever the tool names itself.
var CREATOR = 'PixeLabs';

/* ── Colour: sRGB ⇄ OKLCH ───────────────────────────────────────────────────
   Live itself works in OKLab (it ships SessionSlotOklabLCompensationFactor),
   so re-hueing in OKLCH is what keeps contrast and hierarchy intact.        */

function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linearToSrgb(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

function hexToOklch(hex) {
  var h = hex.replace('#', '');
  var r = srgbToLinear(parseInt(h.slice(0, 2), 16) / 255),
      g = srgbToLinear(parseInt(h.slice(2, 4), 16) / 255),
      b = srgbToLinear(parseInt(h.slice(4, 6), 16) / 255);
  var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
      m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
      s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L: L, C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}

function oklchToRgbRaw(L, C, H) {
  var hr = H * Math.PI / 180, A = C * Math.cos(hr), B = C * Math.sin(hr);
  var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3),
      m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3),
      s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
  return [ 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
          -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
          -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}

function inGamut(rgb) {
  for (var i = 0; i < 3; i++) if (rgb[i] < -1e-4 || rgb[i] > 1 + 1e-4) return false;
  return true;
}

/* Clip to sRGB by binary-searching chroma down. Preserves L and H, so a colour
   pushed out of gamut desaturates rather than shifting hue or going muddy. */
function oklchToHex(L, C, H, alphaHex) {
  L = Math.min(1, Math.max(0, L));
  if (!inGamut(oklchToRgbRaw(L, C, H))) {
    var lo = 0, hi = C;
    for (var i = 0; i < 24; i++) {
      var mid = (lo + hi) / 2;
      if (inGamut(oklchToRgbRaw(L, mid, H))) lo = mid; else hi = mid;
    }
    C = lo;
  }
  var rgb = oklchToRgbRaw(L, C, H), out = '#';
  for (var j = 0; j < 3; j++) {
    var v = Math.round(Math.min(1, Math.max(0, linearToSrgb(rgb[j]))) * 255);
    out += (v < 16 ? '0' : '') + v.toString(16);
  }
  return out + (alphaHex || '');
}

/* ── WCAG contrast ─────────────────────────────────────────────────────────
   No competitor ships contrast-checked Ableton themes; this is what lets us. */

function relLuminance(hex) {
  var h = hex.replace('#', '').slice(0, 6);
  var c = [0, 2, 4].map(function (i) { return srgbToLinear(parseInt(h.slice(i, i + 2), 16) / 255); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrastRatio(a, b) {
  var la = relLuminance(a), lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ── Contrast audit ────────────────────────────────────────────────────────
   Which role is "the background" is mode-dependent. In Live's own light themes
   SurfaceArea is a mid-grey frame (#696e7a), not the page behind text. The
   dominant light background is DetailViewBackground. Measuring light themes
   against bg.surface therefore reports nonsense, so each mode gets its own
   pairs. */

/* Role names are derived, and a derived name can shift meaning: after grouping
   across all 18 built-ins, the role that kept the name "bg.raised" is actually
   ScrollbarLCDTrack, while the real panel background split into its own role.
   So address UI elements by the Ableton tag they are, and look the role up. */
var ROLE_OF_TAG = (function () {
  var m = {};
  for (var i = 0; i < SCHEMA.length; i++) if (SCHEMA[i][2] === 'c') m[SCHEMA[i][0]] = SCHEMA[i][3];
  return m;
})();

function roleValue(roles, tag) {
  var r = roles[ROLE_OF_TAG[tag]];
  if (!r) throw new Error('no role for tag ' + tag);
  return oklchToHex(r.L, r.C, r.H, '');
}

// Each pair: [foreground tag, background tag, label, minRatio]. minRatio 0 = reported
// but not graded, for pairs where luminance contrast isn't the design intent.
//
// "Accent on surface" is informational on purpose. In a light theme the accent
// is a fill sitting behind dark text, not text itself -- Live's own light
// themes score 1.0-1.1 there. Grading it would fail every usable light theme
// and push us to an accent nobody wants. What actually has to be legible is
// text drawn ON the accent, which is graded at the full 4.5.
var CONTRAST_PAIRS = {
  dark: [
    ['ControlForeground', 'SurfaceArea',           'Body text',         4.5],
    ['ControlForeground', 'SurfaceBackground',     'Text on panels',    4.5],
    ['BrowserSampleWaveform', 'SurfaceArea',       'Secondary text',    3.0],
    ['TextDisabled',      'SurfaceArea',           'Dimmed text',       3.0],
    ['SelectionForeground', 'ChosenDefault',       'Text on accent',    4.5],
    ['ChosenDefault',     'SurfaceArea',           'Accent on surface', 0]
  ],
  light: [
    ['ControlForeground', 'DetailViewBackground',  'Body text',         4.5],
    ['ControlForeground', 'SurfaceHighlight',      'Text on panels',    4.5],
    ['BrowserSampleWaveform', 'DetailViewBackground', 'Secondary text', 3.0],
    ['TextDisabled',      'DetailViewBackground',  'Dimmed text',       3.0],
    ['SelectionForeground', 'ChosenDefault',       'Text on accent',    4.5],
    ['ChosenDefault',     'DetailViewBackground',  'Accent on surface', 0]
  ]
};

function auditContrast(roleValues) {
  var mode = roleValues.__mode === 'light' ? 'light' : 'dark';
  return CONTRAST_PAIRS[mode].map(function (p) {
    var ratio = contrastRatio(roleValue(roleValues, p[0]), roleValue(roleValues, p[1]));
    return { label: p[2], ratio: ratio, min: p[3],
             graded: p[3] > 0, pass: p[3] === 0 || ratio >= p[3] };
  });
}

/* ── Palette spec → role values ────────────────────────────────────────────
   ROLE_L supplies each role's lightness for the chosen mode (derived from how
   Live's own themes position them). Hue and chroma come from the spec.       */

function resolveRoles(spec) {
  var out = {}, mode = spec.mode === 'light' ? 'l' : 'd', dark = mode === 'd';

  for (var role in ROLE_L) {
    var info = ROLE_L[role], L = info[mode];

    // Contrast: push lightness away from the surface, further in each direction.
    var pivot = dark ? 0.42 : 0.62;
    L = pivot + (L - pivot) * (1 + spec.contrast * 0.45);
    L = Math.min(0.985, Math.max(0.02, L));

    if (info.t === 'neutral') {
      // Depth sinks the chassis without touching text: scaled by how far below
      // the pivot a role already sits, so backgrounds move and foregrounds don't.
      // This is what makes a genuinely deep theme possible -- raising contrast
      // alone lightens the text end just as much as it darkens the background.
      if (spec.depth && L < pivot) L = Math.max(0.02, L + spec.depth * (pivot - L) / pivot);

      // Ease chroma off at the extremes so near-white doesn't pick up a cast.
      // The dark side tapers far more gently: a deep purple chassis is a real
      // design choice, and the symmetric curve used to wash it out to grey.
      var d = Math.abs(L - 0.5) * 2;
      var taper = 1 - Math.pow(d, L < 0.5 ? 3.6 : 2.2);
      out[role] = { L: L, C: spec.bgChroma * Math.max(0, taper), H: spec.bgHue };
    } else {
      var base = PALETTE[role] || { h: spec.accent.h, c: 0.10 };
      var slot = ACCENT_SLOTS[role];
      var h = slot ? spec[slot].h : base.h + (spec.rehue ? spec.hueShift : 0);
      var c = (slot ? spec[slot].c : base.c) * spec.chroma;
      out[role] = { L: L, C: c, H: (h % 360 + 360) % 360 };
    }
  }

  applyClipPalette(spec, out);
  out.__mode = spec.mode;
  return out;
}

/* Clip1 to Clip16. Live keeps these identical across all 18 of its built-in themes,
   so recolouring them is instantly visible and rare in third-party packs. */
function applyClipPalette(spec, out) {
  var cp = spec.clips;
  // A near-monochrome theme can't separate 16 clips by hue -- there isn't enough
  // chroma to carry the difference -- so lightness has to do the work instead.
  // Amplitude scales inversely with chroma, and alternating sign guarantees every
  // adjacent pair differs rather than flattening out at the peaks of a wave.
  var amp = 0.03 + Math.max(0, 0.14 - cp.chroma) * 0.85;
  for (var i = 1; i <= 16; i++) {
    var role = 'clip.' + i;
    if (!(role in ROLE_L)) continue;
    var t = (i - 1) / 16;
    var h = cp.origin + t * cp.spread;
    var alt = (i % 2 ? 1 : -1) * amp * 0.7;
    var drift = Math.sin(t * Math.PI * 2) * amp * 0.35;
    out[role] = {
      L: Math.min(0.92, Math.max(0.35, cp.lightness + alt + drift)),
      C: cp.chroma * (0.85 + 0.3 * Math.cos(t * Math.PI * 2)),
      H: (h % 360 + 360) % 360
    };
  }
}

/* ── .ask writer ───────────────────────────────────────────────────────────
   Element order, nesting and alpha come straight from SCHEMA, which mirrors
   Live's canonical file exactly. Order is preserved because every built-in
   theme uses the same one and we have no reason to assume the parser is lax. */

function buildAsk(spec, opts) {
  opts = opts || {};
  var roles = resolveRoles(spec), nums = numericSet(spec);
  var esc = function (s) { return String(s).replace(/[<>&"]/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); };

  var out = '<?xml version="1.0" encoding="UTF-8"?>\n';
  out += '<Ableton MajorVersion="5" MinorVersion="12.0_12120" SchemaChangeCount="4"'
       + ' Creator="' + esc(opts.creator || CREATOR) + '" Revision="">\n';
  out += '\t<Theme>\n';
  if (opts.watermark) out += '\t\t<!-- ' + esc(opts.watermark) + ' -->\n';

  var group = null;
  for (var i = 0; i < SCHEMA.length; i++) {
    var tag = SCHEMA[i][0], g = SCHEMA[i][1], kind = SCHEMA[i][2],
        role = SCHEMA[i][3], alpha = SCHEMA[i][4];
    if (g !== group) {
      if (group) out += '\t\t</' + group + '>\n';
      if (g) out += '\t\t<' + g + '>\n';
      group = g;
    }
    var indent = g ? '\t\t\t' : '\t\t', value;
    if (kind === 'c') {
      var ov = spec.overrides && spec.overrides[role];
      if (ov) {
        value = ov.slice(0, 7) + alpha;
      } else {
        var r = roles[role];
        value = oklchToHex(r.L, r.C, r.H, alpha);
      }
    } else {
      value = nums[tag + (g ? '@' + g : '')];
    }
    out += indent + '<' + tag + ' Value="' + value + '" />\n';
  }
  if (group) out += '\t\t</' + group + '>\n';
  out += '\t</Theme>\n</Ableton>\n';
  return opts.watermark ? stampLsb(out, opts.watermark) : out;
}

/* ── .ask reader ───────────────────────────────────────────────────────────
   Import an existing theme: read every colour back onto its role. Values that
   disagree within a role are reported so an imported theme isn't silently
   flattened. */

function parseAsk(text) {
  // Tag names are only unique outside the VU meter groups: Maximum, ZeroDecibel
  // and friends appear once per meter, so a flat tag->value map lets the last
  // group silently overwrite the other six. Key by group as well.
  var byKey = {}, group = null, lines = text.split('\n');
  for (var li = 0; li < lines.length; li++) {
    var line = lines[li].trim(), m;
    if ((m = line.match(/^<([A-Za-z0-9_]+) Value="([^"]*)"\s*\/>$/))) {
      byKey[(group || '') + '/' + m[1]] = m[2];
    } else if ((m = line.match(/^<([A-Za-z0-9_]+)>$/))) {
      if (m[1] !== 'Theme') group = m[1];
    } else if (/^<\/[A-Za-z0-9_]+>$/.test(line)) {
      group = null;
    }
  }
  var overrides = {}, seen = {}, conflicts = [], matched = 0;
  for (var i = 0; i < SCHEMA.length; i++) {
    var tag = SCHEMA[i][0], kind = SCHEMA[i][2], role = SCHEMA[i][3];
    var key = (SCHEMA[i][1] || '') + '/' + tag;
    if (kind !== 'c' || !(key in byKey)) continue;
    matched++;
    var v = byKey[key].slice(0, 7).toLowerCase();
    if (seen[role] === undefined) { seen[role] = v; overrides[role] = v; }
    else if (seen[role] !== v && conflicts.indexOf(role) < 0) conflicts.push(role);
  }
  return { overrides: overrides, conflicts: conflicts, matched: matched,
           total: SCHEMA.filter(function (r) { return r[2] === 'c'; }).length };
}

/* ── Forensic watermark ────────────────────────────────────────────────────
   Traces a leaked file back to a download. It does NOT prevent copying and is
   not DRM, because a .ask must stay readable for Live to load it. Two carriers: an
   XML comment (trivially removed) and ±1 LSB nudges on visually inert colours
   (survives a careless copy-paste). */

var LSB_CARRIERS = ['ScrollbarInnerHandleHover', 'ScrollbarLCDHandleHover',
  'ScrollbarInnerTrackHover', 'ScrollbarLCDTrackHover', 'TreeColumnHeadControl',
  'BrowserBarOverlayHintTextColor', 'RetroDisplayScaleText', 'DrumRackScroller2',
  'ControlOffDisabledForeground', 'TransportOffDisabledForeground',
  'MutedAuditionClip', 'NoteProbability', 'RetroDisplayForegroundDisabled',
  'TreeRowCategoryForeground', 'BrowserDisabledItem', 'ViewCheckControlDisabledOn',
  'ViewCheckControlDisabledOff', 'RangeDisabledOff', 'ProgressText', 'DeactivatedPotiNeedle',
  'ArrangementRulerMarkings', 'DetailViewRulerMarkings', 'WarperTimeBarMarkerBackground',
  'ExpressionLaneHeaderHighlight', 'RetroDisplayBackgroundLine', 'TakeLaneTrackNotHighlighted',
  'DrumRackScroller1', 'PianoKeySeparator', 'ControlSelectionFrame', 'MainViewFocusIndicator',
  'SpectrumDefaultColor', 'InputCurveColor'];

// 3 bits per carrier (one LSB per channel), 8 bits per character.
function lsbCapacity() { return Math.floor(LSB_CARRIERS.length * 3 / 8); }

function stampLsb(xml, payload) {
  var bits = [];
  for (var i = 0; i < payload.length; i++) {
    var code = payload.charCodeAt(i) & 0xff;
    for (var b = 7; b >= 0; b--) bits.push((code >> b) & 1);
  }
  var idx = 0;
  for (var c = 0; c < LSB_CARRIERS.length && idx < bits.length; c++) {
    xml = xml.replace(new RegExp('(<' + LSB_CARRIERS[c] + ' Value="#)([0-9a-f]{6})', 'i'),
      function (_, head, hex) {
        var chan = hex.match(/../g).map(function (h) { return parseInt(h, 16); });
        for (var k = 0; k < 3 && idx < bits.length; k++, idx++) {
          chan[k] = (chan[k] & 0xfe) | bits[idx];
        }
        return head + chan.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
      });
  }
  return xml;
}

function readLsb(xml, byteLen) {
  var bits = [];
  for (var c = 0; c < LSB_CARRIERS.length; c++) {
    var m = xml.match(new RegExp('<' + LSB_CARRIERS[c] + ' Value="#([0-9a-f]{6})', 'i'));
    if (!m) continue;
    var chan = m[1].match(/../g).map(function (h) { return parseInt(h, 16); });
    for (var k = 0; k < 3; k++) bits.push(chan[k] & 1);
  }
  var s = '';
  for (var i = 0; i + 8 <= bits.length && s.length < byteLen; i += 8) {
    var v = 0;
    for (var b = 0; b < 8; b++) v = (v << 1) | bits[i + b];
    s += String.fromCharCode(v);
  }
  return s;
}

/* Shipped inside the pack zip and quoted by the editor's help panel. */
var INSTALL_TEXT = [
  'PixeLabs Themes for Ableton Live 12',
  '',
  'macOS',
  '  1. Quit Live.',
  '  2. In Finder go to Applications, right-click your Ableton Live app',
  '     and choose "Show Package Contents".',
  '  3. Open Contents/App-Resources/Themes',
  '  4. Drop the .ask files in there.',
  '  5. Relaunch Live, then Preferences > Look/Feel > Theme.',
  '',
  '  Note: this folder is inside the app, so a Live update wipes it.',
  '  Keep your .ask files somewhere safe and copy them back after updating.',
  '',
  'Windows',
  '  Commonly C:\\ProgramData\\Ableton\\Live 12\\Resources\\Themes\\',
  '  If that folder is not there, look for Resources\\Themes inside your',
  '  Ableton Live install directory.',
  '',
  'Not affiliated with or endorsed by Ableton AG.',
  'Ableton and Live are trademarks of Ableton AG.'
].join('\n');

/* ── Installer scripts ─────────────────────────────────────────────────────
   A browser can't find Ableton for you: it cannot enumerate the filesystem,
   so it can never locate /Applications/Ableton Live*.app on its own. A shell
   script can. These operate on whatever .ask files sit next to them, so the
   same script works for one exported theme or the whole pack. */

function installerMac() {
  return [
    '#!/bin/bash',
    '# PixeLabs - install Ableton Live themes (macOS)',
    '# Copies every .ask file next to this script into Ableton\'s Themes folder.',
    'set -u',
    'cd "$(dirname "$0")" || exit 1',
    'shopt -s nullglob',
    '',
    'asks=(*.ask */*.ask)',
    'if [ ${#asks[@]} -eq 0 ]; then',
    '  echo "No .ask files found next to this installer."',
    '  echo "Put this script in the same folder as your themes and run it again."',
    '  read -n 1 -s -r -p "Press any key to close."; echo; exit 1',
    'fi',
    '',
    'apps=(/Applications/Ableton\\ Live*.app)',
    'if [ ${#apps[@]} -eq 0 ]; then',
    '  echo "No Ableton Live install found in /Applications."',
    '  read -n 1 -s -r -p "Press any key to close."; echo; exit 1',
    'fi',
    '',
    'if [ ${#apps[@]} -gt 1 ]; then',
    '  echo "Found more than one Ableton Live:"',
    '  for i in "${!apps[@]}"; do echo "  [$i] $(basename "${apps[$i]}")"; done',
    '  read -r -p "Which one? [0] " pick; pick="${pick:-0}"',
    'else',
    '  pick=0',
    'fi',
    'app="${apps[$pick]}"',
    'dest="$app/Contents/App-Resources/Themes"',
    '',
    'if [ ! -d "$dest" ]; then',
    '  echo "Themes folder not found inside $(basename "$app")."',
    '  read -n 1 -s -r -p "Press any key to close."; echo; exit 1',
    'fi',
    '',
    'if pgrep -x Live >/dev/null 2>&1; then',
    '  echo "Ableton Live is running. Quit it first, then run this again."',
    '  read -n 1 -s -r -p "Press any key to close."; echo; exit 1',
    'fi',
    '',
    'echo "Installing ${#asks[@]} theme(s) into:"',
    'echo "  $dest"',
    'echo',
    'n=0',
    'for f in "${asks[@]}"; do',
    '  if cp "$f" "$dest/"; then echo "  ok  $(basename "$f")"; n=$((n+1));',
    '  else echo "  FAILED  $(basename "$f")"; fi',
    'done',
    '',
    'echo',
    'echo "Installed $n theme(s)."',
    'echo "Open Live, then Preferences > Look/Feel > Theme."',
    'echo',
    'echo "Note: a Live update replaces the app and wipes these themes."',
    'echo "Keep your .ask files and run this installer again afterwards."',
    'read -n 1 -s -r -p "Press any key to close."; echo'
  ].join('\n') + '\n';
}

function installerWindows() {
  return [
    '@echo off',
    'REM PixeLabs - install Ableton Live themes (Windows)',
    'REM Copies every .ask file next to this script into Ableton\'s Themes folder.',
    'setlocal enabledelayedexpansion',
    'cd /d "%~dp0"',
    '',
    'tasklist /NH 2>nul | findstr /I "Ableton" >nul',
    'if not errorlevel 1 (',
    '  echo Ableton Live looks like it is running. Close it first, then run this again.',
    '  pause',
    '  exit /b 1',
    ')',
    '',
    'REM First match wins -- probe the usual locations in order of likelihood.',
    'set "FOUND="',
    'for %%D in ('
      + '"C:\\ProgramData\\Ableton\\Live 12\\Resources\\Themes" '
      + '"C:\\ProgramData\\Ableton\\Live 12 Suite\\Resources\\Themes" '
      + '"C:\\ProgramData\\Ableton\\Live 12 Standard\\Resources\\Themes" '
      + '"%ProgramFiles%\\Ableton\\Live 12 Suite\\Resources\\Themes" '
      + '"%ProgramFiles%\\Ableton\\Live 12 Standard\\Resources\\Themes"'
      + ') do (',
    '  if not defined FOUND if exist %%D set "FOUND=%%~D"',
    ')',
    '',
    'if not defined FOUND (',
    '  echo Could not find Ableton^\'s Themes folder automatically.',
    '  echo Look for Resources\\Themes inside your Ableton Live install folder',
    '  echo and copy the .ask files there by hand.',
    '  pause',
    '  exit /b 1',
    ')',
    '',
    'echo Installing themes into:',
    'echo   %FOUND%',
    'echo.',
    'set /a N=0',
    'set /a FAILED=0',
    'for %%F in (*.ask) do call :copyone "%%F"',
    'for /d %%S in (*) do for %%F in ("%%S\\*.ask") do call :copyone "%%F"',
    '',
    'echo.',
    'if %FAILED% GTR 0 (',
    '  echo %FAILED% file^(s^) could not be copied.',
    '  echo This folder usually needs administrator rights: right-click this script',
    '  echo and choose "Run as administrator", then try again.',
    ') else (',
    '  echo Installed %N% theme^(s^).',
    '  echo Open Live, then Preferences ^> Look/Feel ^> Theme.',
    ')',
    'echo.',
    'echo Note: a Live update can replace these files. Keep your .ask files',
    'echo and run this installer again afterwards.',
    'pause',
    'exit /b 0',
    '',
    ':copyone',
    'copy /Y %1 "%FOUND%\\" >nul 2>&1',
    'if errorlevel 1 (',
    '  echo   FAILED  %~nx1',
    '  set /a FAILED+=1',
    ') else (',
    '  echo   ok      %~nx1',
    '  set /a N+=1',
    ')',
    'goto :eof'
  ].join('\r\n') + '\r\n';
}

/* ── ZIP (store, no compression) ───────────────────────────────────────────
   Hand-rolled because the page must work from file:// with no CDN reachable. */

var CRC_TABLE = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  var c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeZip(files) {
  var enc = new TextEncoder(), chunks = [], central = [], offset = 0;
  var u16 = function (v) { return [v & 255, (v >> 8) & 255]; };
  var u32 = function (v) { return [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]; };

  files.forEach(function (f) {
    var name = enc.encode(f.name), data = enc.encode(f.content), crc = crc32(data);
    // External attrs carry the Unix mode in the high 16 bits, and version-made-by
    // must say "Unix" for unzip to honour it -- otherwise the .command installer
    // arrives without its executable bit and won't open on a double-click.
    var mode = f.mode || 0644;
    var madeBy = 0x0314;                       // 3 = Unix, 20 = zip spec 2.0
    var extAttr = ((0100000 | mode) << 16) >>> 0;
    var head = [].concat([0x50, 0x4b, 0x03, 0x04], u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
    chunks.push(new Uint8Array(head), name, data);
    central.push([].concat([0x50, 0x4b, 0x01, 0x02], u16(madeBy), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(data.length), u32(data.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(extAttr), u32(offset)), name);
    offset += head.length + name.length + data.length;
  });

  var cdir = [];
  central.forEach(function (p) { cdir.push(p instanceof Uint8Array ? p : new Uint8Array(p)); });
  var cdirLen = cdir.reduce(function (n, c) { return n + c.length; }, 0);
  var end = new Uint8Array([].concat([0x50, 0x4b, 0x05, 0x06], u16(0), u16(0),
    u16(files.length), u16(files.length), u32(cdirLen), u32(offset), u16(0)));
  return new Blob(chunks.concat(cdir, [end]), { type: 'application/zip' });
}
