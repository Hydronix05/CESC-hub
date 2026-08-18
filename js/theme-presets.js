// ── THEME PRESETS ──
// All built-in theme presets for CESC Hub

const THEME_PRESETS = [
  // ── DEFAULT (neon cyber) ──
  {
    id: 'default',
    name: 'Default',
    type: 'preset',
    description: 'Neon cyber · dark bg',
    variables: {
      '--bg': '#0a0a0f',
      '--bg2': '#0f0f1a',
      '--surface': 'rgba(255,255,255,0.04)',
      '--surface2': 'rgba(255,255,255,0.07)',
      '--border': 'rgba(255,255,255,0.08)',
      '--border2': 'rgba(255,255,255,0.13)',
      '--neon': '#4a9eff',
      '--neon2': '#6c5ce7',
      '--neon-glow': 'rgba(74,158,255,0.3)',
      '--neon-glow2': 'rgba(108,92,231,0.3)',
      '--text': '#e8e8f0',
      '--text-bright': '#f0f0f8',
      '--muted': '#6b6b80',
      '--sidebar-bg': 'rgba(8,8,16,0.92)',
      '--header-bg': 'rgba(8,8,16,0.88)',
      '--overlay-bg': 'rgba(10,10,22,0.98)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.35)',
      '--danger': '#ff4d6d',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // ── ORIGINAL WHITE ──
  {
    id: 'white',
    name: 'Original White',
    type: 'preset',
    description: 'Clean · light bg',
    variables: {
      '--bg': '#f4f4f8',
      '--bg2': '#eaeaf0',
      '--surface': 'rgba(0,0,0,0.04)',
      '--surface2': 'rgba(0,0,0,0.07)',
      '--border': 'rgba(0,0,0,0.10)',
      '--border2': 'rgba(0,0,0,0.16)',
      '--neon': '#009e66',
      '--neon2': '#0077cc',
      '--neon-glow': 'rgba(0,158,102,0.15)',
      '--neon-glow2': 'rgba(0,119,204,0.15)',
      '--text': '#2a2a3a',
      '--text-bright': '#0f0f1a',
      '--muted': '#8888a0',
      '--sidebar-bg': 'rgba(255,255,255,0.92)',
      '--header-bg': 'rgba(255,255,255,0.88)',
      '--overlay-bg': 'rgba(255,255,255,0.97)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.12)',
      '--danger': '#ff4d6d',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // ── CLASSIC DARK ──
  {
    id: 'classic',
    name: 'Classic Dark',
    type: 'preset',
    description: 'Purple accent · muted',
    variables: {
      '--bg': '#111318',
      '--bg2': '#161822',
      '--surface': 'rgba(255,255,255,0.035)',
      '--surface2': 'rgba(255,255,255,0.065)',
      '--border': 'rgba(255,255,255,0.07)',
      '--border2': 'rgba(255,255,255,0.12)',
      '--neon': '#7c6af7',
      '--neon2': '#5ea8f5',
      '--neon-glow': 'rgba(124,106,247,0.25)',
      '--neon-glow2': 'rgba(94,168,245,0.25)',
      '--text': '#e4e4ed',
      '--text-bright': '#f0f0f8',
      '--muted': '#6f6f88',
      '--sidebar-bg': 'rgba(14,14,22,0.95)',
      '--header-bg': 'rgba(14,14,22,0.90)',
      '--overlay-bg': 'rgba(14,14,22,0.98)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
      '--danger': '#ff4d6d',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  }
];

// ── GET PRESET BY ID ──
function getPresetTheme(id) {
  return THEME_PRESETS.find(t => t.id === id) || null;
}

// ── GET ALL PRESETS ──
function getAllPresets() {
  return THEME_PRESETS;
}

// ── EXPOSE TO WINDOW ──
window.THEME_PRESETS = THEME_PRESETS;
window.getPresetTheme = getPresetTheme;
window.getAllPresets = getAllPresets;

console.log('✅ Theme presets loaded!');
console.log('📦 Presets:', THEME_PRESETS.length);