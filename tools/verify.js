/* Full verification pass. Run: bun tools/verify.js
   Checks the generated pack against Live's real schema and our contrast bar. */
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
for (const f of ['build/schema.js', 'src/palette.js', 'src/engine.js', 'src/presets.js'])
  eval(fs.readFileSync(path.join(root, f), 'utf8'));

const THEMES_DIR = process.argv[2] ||
  '/Applications/Ableton Live 12 Suite.app/Contents/App-Resources/Themes';
let fail = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? ': ' + detail : ''));
  if (!cond) fail++;
};

// 1. structure matches Live's own files exactly
function structure(xml) {
  const out = []; let group = null;
  for (const line of xml.split('\n')) {
    const s = line.trim();
    let m = s.match(/^<([A-Za-z0-9_]+) Value="([^"]*)" \/>$/);
    if (m) { out.push(m[1] + '@' + (group || '')); continue; }
    m = s.match(/^<([A-Za-z0-9_]+)>$/);
    if (m && m[1] !== 'Theme') group = m[1];
    else if (/^<\/[A-Za-z0-9_]+>$/.test(s)) group = null;
  }
  return out.join(',');
}
let reference = null;
try {
  reference = structure(fs.readFileSync(path.join(THEMES_DIR, 'Default Dark Cool Medium.ask'), 'utf8'));
} catch (e) { console.log('  SKIP  structural check, Ableton not found at ' + THEMES_DIR); }

console.log('Schema');
ok('276 entries in SCHEMA', SCHEMA.length === 276, SCHEMA.length + ' entries');
ok('every colour entry maps to a known role',
   SCHEMA.filter(r => r[2] === 'c').every(r => r[3] in ROLE_L || r[3].startsWith('clip.')));

console.log('\nColour engine');
const drift = ['#b3b4bd','#ffad56','#03c3d5','#000000','#ffffff','#ff0a0a','#16181f','#22242d']
  .filter(h => { const o = hexToOklch(h); return oklchToHex(o.L, o.C, o.H, '') !== h; });
ok('hex → OKLCH → hex round-trips exactly', drift.length === 0, drift.join(' '));
ok('alpha is preserved', oklchToHex(0.5, 0.05, 270, '54').length === 9);
ok('out-of-gamut chroma clamps to valid sRGB', /^#[0-9a-f]{6}$/.test(oklchToHex(0.5, 0.9, 140, '')));

console.log('\nThemes');
let structOk = 0, contrastOk = 0, wmOk = 0;
for (const t of THEMES) {
  const xml = buildAsk(t, { creator: CREATOR });
  if (!reference || structure(xml) === reference) structOk++;
  if (auditContrast(resolveRoles(t)).every(r => r.pass)) contrastOk++;
  const wm = 'PXL-' + String(THEMES.indexOf(t)).padStart(4, '0');
  if (readLsb(buildAsk(t, { watermark: wm }), wm.length) === wm) wmOk++;
}
ok('themes defined across all families', THEMES.length >= 45, THEMES.length + ' themes, '
   + new Set(THEMES.map(t => t.family)).size + ' families');
if (reference) ok('all themes structurally identical to Live\'s schema', structOk === THEMES.length,
                  structOk + '/' + THEMES.length);
ok('all themes pass graded WCAG checks', contrastOk === THEMES.length, contrastOk + '/' + THEMES.length);
ok('watermark survives a write/read round-trip', wmOk === THEMES.length, wmOk + '/' + THEMES.length);

console.log('\nImport / export');
// Round-tripping our own file must be byte-identical: this is the strongest
// check that reader and writer agree on order, nesting, alpha and VU groups.
{
  const orig = buildAsk(THEMES[10], { creator: CREATOR });
  const s2 = JSON.parse(JSON.stringify(THEMES[10]));
  s2.overrides = parseAsk(orig).overrides;
  ok('import → export is byte-identical', buildAsk(s2, { creator: CREATOR }) === orig);
}
// And we must be able to reproduce every colour of any theme Ableton ships.
// Scope to Live's own 18. The bundle folder is also where custom themes get
// installed, so reading whatever is on disk would quietly grade us against our
// own output instead of Ableton's.
const BUILT_INS = ['Angst Robot', 'Classic Medium Dark', 'Classic Medium Light',
  'Immaterial', 'Riparian', 'Twenty-Four Carat'].concat(
  ['Dark', 'Light'].flatMap(a => ['Cool', 'Neutral', 'Warm'].flatMap(
    b => ['Medium', 'High'].map(c => `Default ${a} ${b} ${c}`))));
if (reference) {
  let exact = 0, files = BUILT_INS.map(n => n + '.ask')
    .filter(f => fs.existsSync(path.join(THEMES_DIR, f)));
  for (const f of files) {
    const src = fs.readFileSync(path.join(THEMES_DIR, f), 'utf8');
    const p = parseAsk(src);
    const s2 = JSON.parse(JSON.stringify(THEMES[0]));
    s2.overrides = p.overrides;
    const out = buildAsk(s2, {});
    const want = [...src.matchAll(/Value="(#[0-9a-f]{6})/gi)].map(m => m[1].toLowerCase());
    const got  = [...out.matchAll(/Value="(#[0-9a-f]{6})/gi)].map(m => m[1].toLowerCase());
    if (want.length === got.length && want.every((v, i) => v === got[i])) exact++;
  }
  ok('reproduces every colour of all 18 built-in themes',
     exact === files.length && files.length === 18, exact + '/' + files.length);
  ok('reads all 236 colours from a built-in theme with no role conflicts',
     (() => { const p = parseAsk(fs.readFileSync(path.join(THEMES_DIR, 'Default Light Cool Medium.ask'), 'utf8'));
              return p.matched === 236 && p.conflicts.length === 0; })());
}

// Clip colours are functional -- you identify tracks by them. A narrow hue
// spread makes adjacent clips indistinguishable, which is a usability bug even
// when the theme looks good. Measured in OKLab, not by eyeballing the spread.
{
  let worst = { d: Infinity, id: null };
  for (const t of THEMES) {
    const r = resolveRoles(t);
    for (let i = 1; i < 16; i++) {
      const a = r['clip.' + i], b = r['clip.' + (i + 1)];
      if (!a || !b) continue;
      const ah = a.H * Math.PI / 180, bh = b.H * Math.PI / 180;
      const d = Math.hypot(a.L - b.L, a.C * Math.cos(ah) - b.C * Math.cos(bh),
                           a.C * Math.sin(ah) - b.C * Math.sin(bh));
      if (d < worst.d) worst = { d: d, id: t.id + ' clip' + i + '/' + (i + 1) };
    }
  }
  ok('adjacent clip colours are tellable apart', worst.d >= 0.02,
     'closest pair ' + worst.d.toFixed(4) + ' (' + worst.id + ')');
}

console.log('\nInstaller scripts');
{
  const mac = installerMac(), win = installerWindows();
  ok('macOS installer looks for the app bundle Themes folder',
     mac.includes('Contents/App-Resources/Themes') && mac.includes('/Applications/Ableton'));
  ok('macOS installer refuses to run while Live is open', mac.includes('pgrep -x Live'));
  ok('Windows installer probes more than one candidate path',
     (win.match(/Resources\\Themes/g) || []).length >= 3);
  ok('no stale Application Support path in either installer',
     !/Application Support/.test(mac + win));
  ok('Windows installer takes the first matching path, not the last',
     win.includes('if not defined FOUND if exist'));
  ok('Windows installer explains the elevation case', win.includes('Run as administrator'));
  ok('Windows installer refuses to run while Live is open', /tasklist[\s\S]{0,120}Ableton/.test(win));
  ok('Windows installer uses CRLF line endings', win.includes('\r\n'));
}

console.log('\nEditor artifact');
const html = fs.readFileSync(path.join(root, 'editor.html'), 'utf8');
{
  const body = html.replace(/<!--[\s\S]*?-->/g, '');
  const loaders = [
    /<script[^>]+src\s*=\s*["']https?:/i,          // remote script
    /<link[^>]+rel=["']stylesheet["'][^>]*https?:/i, // remote stylesheet
    /<img[^>]+src\s*=\s*["']https?:/i,             // remote image
    /@import\s+(url\()?["']?https?:/i,             // css import
    /url\(\s*["']?https?:/i,                       // css url()
    /\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket/
  ];
  const hit = loaders.find(re => re.test(body));
  ok('nothing is fetched from the network', !hit, hit ? String(hit) : 'metadata URLs only');
}
ok('no ES modules (blocked on file://)', !/type=["']module["']/.test(html));
ok('schema inlined', html.includes('var SCHEMA'));

console.log(fail ? `\n${fail} check(s) FAILED` : '\nall checks passed');
process.exit(fail ? 1 : 0);
