/* ── Base palette ──────────────────────────────────────────────────────────
   Hue (OKLCH degrees) and chroma for every non-neutral role. Lightness is NOT
   here: it comes from ROLE_L, which carries the positional structure each mode
   needs. These h/c values are ours, chosen for the meaning of each role.

   Neutral roles (chassis, text, scrollbars, grids) aren't listed. They take
   the theme's own background hue at low chroma.                             */

var PALETTE = {
  /* Accents, overridden per theme via ACCENT_SLOTS, these are the fallbacks. */
  'accent.primary':        { h:  65, c: 0.140 },
  'accent.secondary':      { h: 207, c: 0.128 },
  'accent.hover':          { h: 264, c: 0.150 },
  'accent.linked':         { h: 235, c: 0.055 },
  'accent.search':         { h:  88, c: 0.105 },
  'accent.searchStandby':  { h:  88, c: 0.085 },
  'display.handle2':       { h:  10, c: 0.130 },

  /* Selection: a tinted wash behind selected material. */
  'sel.background':         { h: 220, c: 0.055 },
  'sel.backgroundContrast': { h: 220, c: 0.045 },
  'sel.standby':            { h: 220, c: 0.040 },

  /* Transport / clip semantics. Producers read these by colour at a glance,
     so they keep their conventional meaning unless the theme opts into rehue. */
  'sem.record':          { h:  25, c: 0.190 },
  'sem.recordArm':       { h:  29, c: 0.240 },
  'sem.play':            { h: 160, c: 0.172 },
  'sem.preListen':       { h: 264, c: 0.115 },
  'sem.alert':           { h:  45, c: 0.150 },
  'sem.freeze':          { h: 250, c: 0.130 },
  'sem.scale':           { h: 300, c: 0.130 },

  /* Modulation and automation overlays in device and arrangement views. */
  'sem.modulation':      { h: 205, c: 0.110 },
  'sem.modulationOff':   { h: 205, c: 0.055 },
  'sem.modulationHover': { h: 195, c: 0.130 },
  'sem.automation':      { h:  28, c: 0.185 },
  'sem.automationHover': { h:  28, c: 0.120 },
  'sem.automationOff':   { h:  28, c: 0.000 },

  /* MIDI editor zones. */
  'sem.velocity':         { h:  28, c: 0.165 },
  'sem.velocityZone':     { h:  28, c: 0.080 },
  'sem.keyZone':          { h: 150, c: 0.085 },
  'sem.keyZoneRamp':      { h: 150, c: 0.150 },
  'sem.selectorZone':     { h: 258, c: 0.070 },
  'sem.selectorZoneRamp': { h: 264, c: 0.170 },

  /* MIDI/key/macro mapping modes. Deliberately loud and mutually distinct: these only appear while mapping, and being unmissable is the point. */
  'learn.midi':  { h: 275, c: 0.260 },
  'learn.key':   { h:  45, c: 0.200 },
  'learn.macro': { h: 145, c: 0.230 },

  /* Operator's four oscillators, which must stay distinguishable from each other. */
  'op.1': { h: 100, c: 0.160 },
  'op.2': { h: 185, c: 0.140 },
  'op.3': { h: 275, c: 0.170 },
  'op.4': { h:  50, c: 0.180 },

  /* Range edit fields. */
  'field.edit1': { h: 200, c: 0.090 },
  'field.edit2': { h:   5, c: 0.090 },
  'field.edit3': { h:  60, c: 0.080 },

  'grid.tiles':     { h: 264, c: 0.020 },
  'brand.ableton':  { h: 145, c: 0.290 },

  /* VU meters. Ramp runs Maximum (top) → Minimum (bottom). Standard goes
     green→yellow→red so clipping stays legible in any theme. */
  'meter.Standard.Maximum':           { h:  29, c: 0.250 },
  'meter.Standard.AboveZeroDecibel':  { h:  29, c: 0.250 },
  'meter.Standard.ZeroDecibel':       { h:  29, c: 0.250 },
  'meter.Standard.BelowZeroDecibel1': { h:  95, c: 0.180 },
  'meter.Standard.BelowZeroDecibel2': { h: 150, c: 0.200 },
  'meter.Standard.Minimum':           { h: 150, c: 0.200 },

  'meter.Orange.Maximum':           { h: 65, c: 0.175 },
  'meter.Orange.AboveZeroDecibel':  { h: 65, c: 0.175 },
  'meter.Orange.ZeroDecibel':       { h: 65, c: 0.175 },
  'meter.Orange.BelowZeroDecibel1': { h: 65, c: 0.175 },
  'meter.Orange.BelowZeroDecibel2': { h: 65, c: 0.175 },
  'meter.Orange.Minimum':           { h: 65, c: 0.175 },

  'meter.Overload.Maximum':           { h: 29, c: 0.250 },
  'meter.Overload.Minimum':           { h: 29, c: 0.200 },

  'meter.Headphones.Maximum':           { h: 285, c: 0.140 },
  'meter.Headphones.AboveZeroDecibel':  { h: 268, c: 0.110 },
  'meter.Headphones.ZeroDecibel':       { h: 268, c: 0.110 },
  'meter.Headphones.BelowZeroDecibel1': { h: 250, c: 0.110 },
  'meter.Headphones.BelowZeroDecibel2': { h: 230, c: 0.120 },
  'meter.Headphones.Minimum':           { h: 195, c: 0.150 },

  'meter.SendsOnly.Maximum':           { h: 105, c: 0.170 },
  'meter.SendsOnly.AboveZeroDecibel':  { h: 105, c: 0.170 },
  'meter.SendsOnly.ZeroDecibel':       { h: 280, c: 0.190 },
  'meter.SendsOnly.BelowZeroDecibel1': { h: 280, c: 0.190 },
  'meter.SendsOnly.BelowZeroDecibel2': { h: 280, c: 0.190 },
  'meter.SendsOnly.Minimum':           { h: 280, c: 0.190 },

  'meter.BipolarGainReduction.Maximum':           { h: 258, c: 0.110 },
  'meter.BipolarGainReduction.AboveZeroDecibel':  { h: 258, c: 0.110 },
  'meter.BipolarGainReduction.ZeroDecibel':       { h:  65, c: 0.175 },
  'meter.BipolarGainReduction.BelowZeroDecibel1': { h:  65, c: 0.175 },
  'meter.BipolarGainReduction.BelowZeroDecibel2': { h:  65, c: 0.175 },
  'meter.BipolarGainReduction.Minimum':           { h:  65, c: 0.175 }
};

/* Roles driven directly by the theme's two accent choices. */
var ACCENT_SLOTS = {
  'accent.primary': 'accent',
  'accent.secondary': 'accent2',
  'accent.search': 'accent',
  'accent.searchStandby': 'accent'
};

/* ── Numeric + boolean entries ─────────────────────────────────────────────
   Blend factors, alphas and the lightness/saturation scalars Live applies to
   generated colours. These genuinely differ between light and dark themes. Using dark values in a light theme makes clips and lane headers look wrong, so each mode gets its own set and we interpolate on the way out.           */

var NUMERIC = {
  dark: {
    DefaultBlendFactor: 0.757, ClipBlendFactor: 0.758, TextFrameSegmentBlendFactor: 0.395,
    StripedBackgroundShadeFactor: 0.9, ClipBorderAlpha: 120,
    InaudibleTakeLightness: 0.322, InaudibleTakeSaturation: 0.775,
    InaudibleTakeNameLightness: 0.8, InaudibleTakeNameSaturation: 0.854,
    AutomationLaneClipBodyLightness: 0.26, AutomationLaneClipBodySaturation: 0.806,
    AutomationLaneHeaderLightness: 0.251, AutomationLaneHeaderSaturation: 0.534,
    TakeLaneHeaderLightness: 0.48, TakeLaneHeaderSaturation: 0.9,
    TakeLaneHeaderNameLightness: 0.85, TakeLaneHeaderNameSaturation: 0.9,
    AutomationLaneHeaderNameLightness: 0.709, AutomationLaneHeaderNameSaturation: 0.9,
    ClipContrastColorAdjustment: 24, SessionSlotOklabLCompensationFactor: 20
  },
  light: {
    DefaultBlendFactor: 0.744, ClipBlendFactor: 0.715, TextFrameSegmentBlendFactor: 0.321,
    StripedBackgroundShadeFactor: 0.818, ClipBorderAlpha: 112,
    InaudibleTakeLightness: 0.5, InaudibleTakeSaturation: 0.5,
    InaudibleTakeNameLightness: 0.75, InaudibleTakeNameSaturation: 0.75,
    AutomationLaneClipBodyLightness: 0.44, AutomationLaneClipBodySaturation: 0.66,
    AutomationLaneHeaderLightness: 0.44, AutomationLaneHeaderSaturation: 0.66,
    TakeLaneHeaderLightness: 0.5, TakeLaneHeaderSaturation: 0.5,
    TakeLaneHeaderNameLightness: 0.75, TakeLaneHeaderNameSaturation: 0.623,
    AutomationLaneHeaderNameLightness: 0.75, AutomationLaneHeaderNameSaturation: 0.623,
    ClipContrastColorAdjustment: 32, SessionSlotOklabLCompensationFactor: 50
  },
  // Identical in every built-in theme, so not mode-dependent.
  fixed: {
    IconBlendFactor: 0.73, NoteBorderStandbyBlendFactor: 0.536, RetroDisplayBlendFactor: 1,
    CheckControlNotCheckedBlendFactor: 0.5, MixSurfaceAreaBlendFactor: 0.375,
    NoteDisabledSelectedBlendFactor: 0.5, MinVelocityNoteBlendFactor: 0.264,
    NonEditableAutomationAlpha: 127, DisabledContextMenuIconAlpha: 85,
    ScrollBarAlpha: 255, ScrollBarOnHoverAlpha: 255, ScrollBarBackgroundAlpha: 255
  },
  // Draw a single flat colour from minimum to maximum instead of a ramp.
  flatMeters: ['OverloadVuMeter', 'OrangeVuMeter']
};

var INT_KEYS = ['ClipBorderAlpha', 'ClipContrastColorAdjustment',
  'SessionSlotOklabLCompensationFactor', 'NonEditableAutomationAlpha',
  'DisabledContextMenuIconAlpha', 'ScrollBarAlpha', 'ScrollBarOnHoverAlpha',
  'ScrollBarBackgroundAlpha'];

function numericSet(spec) {
  var out = {}, t = spec.mode === 'light' ? 1 : 0, k;
  for (k in NUMERIC.fixed) out[k] = NUMERIC.fixed[k];
  for (k in NUMERIC.dark) {
    var v = NUMERIC.dark[k] + (NUMERIC.light[k] - NUMERIC.dark[k]) * t;
    out[k] = INT_KEYS.indexOf(k) >= 0 ? Math.round(v) : Math.round(v * 1e6) / 1e6;
  }
  for (var i = 0; i < SCHEMA.length; i++) {
    if (SCHEMA[i][2] !== 'b') continue;
    var g = SCHEMA[i][1];
    out[SCHEMA[i][0] + '@' + g] = NUMERIC.flatMeters.indexOf(g) >= 0 ? 'true' : 'false';
  }
  return out;
}
