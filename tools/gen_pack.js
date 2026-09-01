/* Generate the free theme pack into pack/<family>/<Name>.ask
   Run: bun tools/gen_pack.js   (or: node tools/gen_pack.js) */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['build/schema.js', 'src/palette.js', 'src/engine.js', 'src/presets.js'])
  eval(fs.readFileSync(path.join(root, f), 'utf8'));

// Clear generated themes first -- a rename would otherwise leave the old
// filename sitting in pack/ forever, and it would ship in the zip.
for (const fam of new Set(THEMES.map(t => t.family))) {
  const dir = path.join(root, 'pack', fam);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.ask')) fs.unlinkSync(path.join(dir, f));
  }
}

let n = 0, fails = [];
for (const t of THEMES) {
  const audit = auditContrast(resolveRoles(t));
  const bad = audit.filter(r => !r.pass);
  if (bad.length) fails.push(t.id + ': ' + bad.map(r => `${r.label} ${r.ratio.toFixed(2)}<${r.min}`).join(', '));
  const dir = path.join(root, 'pack', t.family);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, THEME_PREFIX + t.name + '.ask'),
    buildAsk(t, { creator: 'PixeLabs Theme Studio' }));
  n++;
}
// Same artifact the editor's "Download all" button produces, from the same
// makeZip path -- one definition, so the two can't drift apart.
const zipFiles = THEMES.map(t => ({
  name: t.family + '/' + THEME_PREFIX + t.name + '.ask',
  content: buildAsk(t, { creator: 'PixeLabs Theme Studio' })
}));
zipFiles.push({ name: 'INSTALL.txt', content: INSTALL_TEXT });
zipFiles.push({ name: 'install-macos.command', content: installerMac(), mode: 0o755 });
zipFiles.push({ name: 'install-windows.bat', content: installerWindows() });
// Kept inside an async IIFE on purpose: a top-level await would make this file
// ESM, and ESM is strict mode, where `var` inside eval() no longer leaks to the
// enclosing scope -- which is how the sources above are loaded.
const zipPath = path.join(root, 'pack', 'pixelabs-theme-pack.zip');
(async () => {
  const bytes = new Uint8Array(await makeZip(zipFiles).arrayBuffer());
  fs.writeFileSync(zipPath, bytes);
  console.log(`wrote ${n} themes to pack/ and pixelabs-theme-pack.zip (${(bytes.length/1024).toFixed(0)} KB)`);
})();
if (fails.length) { console.error('CONTRAST FAILURES:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('all themes pass the graded contrast checks');
