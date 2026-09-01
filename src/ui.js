/* ── Editor state ─────────────────────────────────────────────────────────── */

var state = null, lastXml = '';

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function $(sel) { return document.querySelector(sel); }
function el(tag, cls, txt) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt;
  return n;
}
function hexOf(r) { return r ? oklchToHex(r.L, r.C, r.H, '') : '#000000'; }

/* Every mock element names the Ableton tag it stands for, so it recolours
   correctly in both modes without a per-mode lookup table. Live's light themes
   are mid-grey chrome with a light detail pane — not a white UI — and mapping
   by tag reproduces that instead of guessing at it. */
var MOCK_TAGS = {
  desktop: 'Desktop', surface: 'SurfaceArea', raised: 'SurfaceBackground',
  control: 'ClipSlotButton', detail: 'DetailViewBackground', highlight: 'SurfaceHighlight',
  frame: 'ControlContrastFrame', text: 'ControlForeground', textdim: 'TextDisabled',
  accent: 'ChosenDefault', accent2: 'RangeDefault', onaccent: 'SelectionForeground',
  record: 'ChosenRecord', play: 'ChosenPlay', meterbg: 'MeterBackground',
  handle: 'ControlFillHandle', displaybg: 'RetroDisplayBackground',
  wave: 'RetroDisplayForeground2', browserbar: 'BrowserBar', onclip: 'ClipText',
  transportbg: 'TransportOffBackground', browsertext: 'BrowserDisabledItem',
  trackhdr: 'SurfaceBackground', lcdtext: 'RetroDisplayForeground'
};

function applyPreview(roles, mode) {
  var s = $('#mock').style;
  for (var k in MOCK_TAGS) s.setProperty('--m-' + k, roleValue(roles, MOCK_TAGS[k]));

  // clip grid + meter ramp
  for (var i = 1; i <= 16; i++) s.setProperty('--m-clip' + i, hexOf(roles['clip.' + i]));
  ['Maximum','AboveZeroDecibel','ZeroDecibel','BelowZeroDecibel1','BelowZeroDecibel2','Minimum']
    .forEach(function (stop, i) { s.setProperty('--m-vu' + i, hexOf(roles['meter.Standard.' + stop])); });
}

/* ── Ableton mock markup (built once, recoloured via CSS variables) ───────── */

var TRACKS = ['Kick', 'Bass', 'Lead', 'Pad', 'Perc', 'FX'];
var CLIPS = [
  [1, 5, 9, 0, 12, 0], [2, 6, 0, 11, 13, 3], [0, 7, 10, 4, 0, 14],
  [3, 0, 8, 15, 16, 5], [4, 8, 0, 0, 2, 0]
];

function buildMock() {
  var h = '';
  h += '<div class="mock-transport">'
     + '<span class="pill">128.00</span><span class="pill on">4/4</span>'
     + '<span class="pill play">&#9654;</span><span class="pill rec">&#9679;</span>'
     + '<span class="pill">1.1.1</span><span style="flex:1"></span>'
     + '<span class="pill">Session</span><span class="pill">Arrange</span></div>';

  h += '<div class="mock-body"><div class="mock-browser">'
     + '<div class="hd">Collections</div>'
     + ['Sounds', 'Drums', 'Instruments', 'Audio Effects', 'MIDI Effects', 'Max for Live',
        'Plug-Ins', 'Clips', 'Samples'].map(function (c, i) {
          return '<div class="cat' + (i === 3 ? ' sel' : '') + '">' + c + '</div>'; }).join('')
     + '</div><div class="mock-main">';

  // session grid
  h += '<div class="mock-tracks">';
  TRACKS.forEach(function (name, t) {
    h += '<div class="mock-track"><div class="hdr">' + name + '</div>';
    for (var r = 0; r < CLIPS.length; r++) {
      var c = CLIPS[r][t];
      h += c
        ? '<div class="mock-slot" style="background:var(--m-clip' + c + ')">'
          + '<span class="tri">&#9654;</span>' + name.toLowerCase() + ' ' + (r + 1) + '</div>'
        : '<div class="mock-slot empty"></div>';
    }
    h += '</div>';
  });
  h += '<div class="mock-track mock-scenes"><div class="hdr">Scenes</div>';
  for (var r2 = 0; r2 < CLIPS.length; r2++) h += '<div class="mock-slot">' + (r2 + 1) + '</div>';
  h += '</div></div>';

  // mixer
  h += '<div class="mock-mixer">';
  var levels = [0.92, 0.7, 0.55, 0.38, 0.66, 0.28, 0.5];
  for (var s = 0; s < TRACKS.length + 1; s++) {
    var lv = levels[s % levels.length];
    h += '<div class="mock-strip"><div class="mock-meter">' + meterFill(lv) + '</div>'
       + '<div class="mock-fader" style="height:' + (35 + lv * 55) + '%"></div></div>';
  }
  h += '</div>';

  // device chain
  h += '<div class="mock-device">'
     + '<div class="mock-dev"><div class="t">Operator</div><div class="mock-knobs">'
     + '<div class="mock-knob"></div><div class="mock-knob"></div><div class="mock-knob"></div>'
     + '<div class="mock-knob"></div></div></div>'
     + '<div class="mock-dev"><div class="t">Auto Filter</div><div class="mock-knobs">'
     + '<div class="mock-knob"></div><div class="mock-knob"></div><div class="mock-knob"></div>'
     + '</div></div>'
     + '<div class="mock-lcd">SPECTRUM<div class="wave">'
     + [12,30,22,48,36,64,44,80,58,72,50,88,62,40,28,54,34,66,42,24].map(function (v) {
         return '<i style="height:' + v + '%"></i>'; }).join('')
     + '</div></div></div>';

  h += '</div></div>';
  $('#mock').innerHTML = h;
}

// Six-stop VU ramp, loudest at the top, matching Live's meter stops.
function meterFill(level) {
  var stops = [[1, 0], [0.92, 1], [0.84, 2], [0.62, 3], [0.34, 4], [0, 5]], out = '';
  for (var i = 0; i < stops.length; i++) {
    var top = stops[i][0], bottom = i + 1 < stops.length ? stops[i + 1][0] : 0;
    if (level <= bottom) continue;
    var hgt = (Math.min(level, top) - bottom) * 100;
    out += '<span style="bottom:' + (bottom * 100) + '%;height:' + hgt
        +  '%;background:var(--m-vu' + stops[i][1] + ')"></span>';
  }
  return out;
}

/* ── Render ───────────────────────────────────────────────────────────────── */

function render() {
  var roles = resolveRoles(state);
  applyPreview(roles, state.mode);

  // contrast report
  var box = $('#audit'); box.innerHTML = '';
  auditContrast(roles).forEach(function (r) {
    var row = el('div', 'audit-row');
    row.appendChild(el('span', 'lbl', r.label));
    row.appendChild(el('span', 'val', r.ratio.toFixed(2) + ':1'));
    var b = el('span', 'badge ' + (!r.graded ? 'info' : r.pass ? 'pass' : 'fail'),
               !r.graded ? 'info' : r.pass ? 'AA' : 'below ' + r.min);
    row.appendChild(b);
    box.appendChild(row);
  });

  // clip swatches
  var sw = $('#clipswatches'); sw.innerHTML = '';
  for (var i = 1; i <= 16; i++) {
    var c = el('i'); c.style.background = hexOf(roles['clip.' + i]);
    c.title = 'Clip ' + i; sw.appendChild(c);
  }

  renderRoleList(roles);
  lastXml = buildAsk(state, { creator: 'PixeLabs Theme Studio', watermark: watermark() });
  $('#xml').value = lastXml;
  syncControls();
}

function watermark() {
  var v = $('#wm').value.trim();
  return v ? v.slice(0, lsbCapacity()) : '';
}

function renderRoleList(roles) {
  var q = $('#rolesearch').value.trim().toLowerCase(), box = $('#roles');
  box.innerHTML = '';
  var names = Object.keys(ROLE_L).sort();
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (q && name.toLowerCase().indexOf(q) < 0) continue;
    var cur = state.overrides[name] || hexOf(roles[name]);
    var row = el('div', 'role-row');
    var sw = el('i'); sw.style.background = cur; row.appendChild(sw);
    row.appendChild(el('code', null, name));
    var inp = document.createElement('input');
    inp.type = 'color'; inp.value = cur; inp.dataset.role = name;
    inp.setAttribute('aria-label', 'Colour for ' + name);
    inp.addEventListener('input', function (e) {
      state.overrides[e.target.dataset.role] = e.target.value; render();
    });
    row.appendChild(inp);
    box.appendChild(row);
    if (box.children.length > 220) break;   // keep the DOM cheap while typing
  }
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

var SLIDERS = [
  ['bgHue',      'Background hue',   0, 360, 1,     function (s) { return s.bgHue; },      function (s, v) { s.bgHue = v; },      function (v) { return v.toFixed(0) + '\u00b0'; }],
  ['bgChroma',   'Background tint',  0, 0.14, 0.002, function (s) { return s.bgChroma; },   function (s, v) { s.bgChroma = v; },   function (v) { return v.toFixed(3); }],
  ['contrast',   'Contrast',        -0.2, 0.6, 0.01, function (s) { return s.contrast; },   function (s, v) { s.contrast = v; },   function (v) { return v.toFixed(2); }],
  ['depth',      'Depth',           -0.5, 0.3, 0.01, function (s) { return s.depth; },      function (s, v) { s.depth = v; },      function (v) { return v.toFixed(2); }],
  ['accentH',    'Accent hue',       0, 360, 1,     function (s) { return s.accent.h; },   function (s, v) { s.accent.h = v; },   function (v) { return v.toFixed(0) + '\u00b0'; }],
  ['accentC',    'Accent chroma',    0, 0.32, 0.005, function (s) { return s.accent.c; },   function (s, v) { s.accent.c = v; },   function (v) { return v.toFixed(3); }],
  ['accent2H',   'Second accent hue',0, 360, 1,     function (s) { return s.accent2.h; },  function (s, v) { s.accent2.h = v; },  function (v) { return v.toFixed(0) + '\u00b0'; }],
  ['accent2C',   'Second accent chroma', 0, 0.32, 0.005, function (s) { return s.accent2.c; }, function (s, v) { s.accent2.c = v; }, function (v) { return v.toFixed(3); }],
  ['chroma',     'Overall saturation', 0, 1.6, 0.05, function (s) { return s.chroma; },     function (s, v) { s.chroma = v; },     function (v) { return v.toFixed(2) + '\u00d7'; }],
  ['clipOrigin', 'Clip palette start', 0, 360, 1,   function (s) { return s.clips.origin; }, function (s, v) { s.clips.origin = v; }, function (v) { return v.toFixed(0) + '\u00b0'; }],
  ['clipSpread', 'Clip palette spread', 0, 360, 5,  function (s) { return s.clips.spread; }, function (s, v) { s.clips.spread = v; }, function (v) { return v.toFixed(0) + '\u00b0'; }],
  ['clipChroma', 'Clip saturation',  0, 0.28, 0.005, function (s) { return s.clips.chroma; }, function (s, v) { s.clips.chroma = v; }, function (v) { return v.toFixed(3); }],
  ['clipLight',  'Clip lightness',   0.35, 0.9, 0.01, function (s) { return s.clips.lightness; }, function (s, v) { s.clips.lightness = v; }, function (v) { return v.toFixed(2); }]
];

function buildControls() {
  var box = $('#controls');
  SLIDERS.forEach(function (d) {
    var lab = el('label', 'field');
    var head = el('span');
    head.appendChild(el('span', null, d[1]));
    var val = el('b', null, ''); val.id = 'v-' + d[0]; head.appendChild(val);
    lab.appendChild(head);
    var inp = document.createElement('input');
    inp.type = 'range'; inp.min = d[2]; inp.max = d[3]; inp.step = d[4]; inp.id = 'c-' + d[0];
    inp.addEventListener('input', function () { d[6](state, parseFloat(inp.value)); render(); });
    lab.appendChild(inp);
    box.appendChild(lab);
  });
}

function syncControls() {
  SLIDERS.forEach(function (d) {
    var inp = $('#c-' + d[0]);
    if (inp && document.activeElement !== inp) inp.value = d[5](state);
    $('#v-' + d[0]).textContent = d[7](d[5](state));
  });
  $('#name').value = state.name;
  document.querySelectorAll('.chip[data-mode]').forEach(function (c) {
    c.setAttribute('aria-pressed', c.dataset.mode === state.mode);
  });
}

function loadTheme(id) {
  var t = THEMES.filter(function (x) { return x.id === id; })[0];
  if (t) { state = clone(t); state.name = THEME_PREFIX + t.name; render(); }
}

/* ── Export ───────────────────────────────────────────────────────────────
   Safari's blob downloads from file:// are unreliable, so every path has a
   visible copy-to-clipboard fallback rather than failing silently.          */

function download(blob, filename) {
  try {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('Saved ' + filename);
  } catch (e) {
    toast('Download blocked — use "Copy XML" below');
  }
}

function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

function exportOne() {
  var name = (state.name || 'Untitled').replace(/[\\/:*?"<>|]/g, '');
  download(new Blob([lastXml], { type: 'application/xml' }), name + '.ask');
}

function exportPack() {
  download(makeZip(packFiles()), 'PixeLabs-Ableton-Themes.zip');
}

function packFiles() {
  var files = THEMES.map(function (t) {
    return { name: t.family + '/' + THEME_PREFIX + t.name + '.ask',
             content: buildAsk(t, { creator: 'PixeLabs Theme Studio' }) };
  });
  files.push({ name: 'INSTALL.txt', content: INSTALL_TEXT });
  // 0755 so the .command keeps its executable bit and opens on a double-click.
  files.push({ name: 'install-macos.command', content: installerMac(), mode: 0755 });
  files.push({ name: 'install-windows.bat', content: installerWindows() });
  return files;
}

function isWindows() {
  var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  return /win/i.test(p);
}

function exportInstaller(os) {
  if (os === 'win') {
    download(new Blob([installerWindows()], { type: 'text/plain' }), 'install-windows.bat');
  } else {
    download(new Blob([installerMac()], { type: 'text/plain' }), 'install-macos.command');
  }
}

function importAsk(file) {
  var fr = new FileReader();
  fr.onload = function () {
    var res = parseAsk(String(fr.result));
    if (!res.matched) { toast('No theme entries found in that file'); return; }
    state.overrides = res.overrides;
    state.name = file.name.replace(/\.ask$/i, '');
    render();
    toast('Imported ' + res.matched + '/' + res.total + ' colours'
      + (res.conflicts.length ? ' \u2014 ' + res.conflicts.length + ' role(s) had mixed values' : ''));
  };
  fr.readAsText(file);
}


/* ── Boot ─────────────────────────────────────────────────────────────────── */

function boot() {
  var sel = $('#preset');
  FAMILIES.forEach(function (f) {
    var g = document.createElement('optgroup'); g.label = f.name;
    THEMES.filter(function (t) { return t.family === f.id; }).forEach(function (t) {
      var o = document.createElement('option'); o.value = t.id; o.textContent = t.name; g.appendChild(o);
    });
    sel.appendChild(g);
  });
  sel.addEventListener('change', function () { loadTheme(sel.value); });

  buildControls();
  buildMock();

  $('#name').addEventListener('input', function () { state.name = $('#name').value; });
  $('#wm').addEventListener('input', render);
  $('#wm').placeholder = 'e.g. PXL-0001 (max ' + lsbCapacity() + ')';
  $('#rolesearch').addEventListener('input', function () { render(); });
  $('#reset').addEventListener('click', function () { state.overrides = {}; render(); toast('Overrides cleared'); });
  document.querySelectorAll('.chip[data-mode]').forEach(function (c) {
    c.addEventListener('click', function () { state.mode = c.dataset.mode; render(); });
  });
  $('#export').addEventListener('click', exportOne);
  $('#exportpack').textContent = 'Download all ' + THEMES.length + ' (.zip)';
  $('#installer-mac').addEventListener('click', function () { exportInstaller('mac'); });
  $('#installer-win').addEventListener('click', function () { exportInstaller('win'); });
  // Nudge toward the platform we think you're on, without hiding the other one --
  // detection is a guess, and people do fetch a script for a different machine.
  $('#installer-' + (isWindows() ? 'win' : 'mac')).classList.add('primary');
  $('#exportpack').addEventListener('click', exportPack);
  $('#copy').addEventListener('click', function () {
    $('#xml').select();
    try {
      navigator.clipboard.writeText(lastXml).then(
        function () { toast('XML copied \u2014 save it as <name>.ask'); },
        function () { document.execCommand('copy'); toast('XML copied'); });
    } catch (e) { document.execCommand('copy'); toast('XML copied'); }
  });
  $('#file').addEventListener('change', function (e) {
    if (e.target.files[0]) importAsk(e.target.files[0]);
    e.target.value = '';
  });

  // ?theme=<id> deep-links a preset, so the landing page can link straight to one.
  var want = (location.search.match(/[?&]theme=([\w-]+)/) || [])[1];
  var start = THEMES.some(function (t) { return t.id === want; }) ? want : 'graphite';
  sel.value = start;
  loadTheme(start);
}

document.addEventListener('DOMContentLoaded', boot);
