// ── THEME PRESETS ──
// All built-in theme presets for CESC Hub

const THEME_PRESETS = [
  // ── GENERAL THEMES ──
  {
    id: 'nebula',
    name: 'Nebula',
    type: 'preset',
    category: 'general',
    variant: 'dark',
    description: 'Cosmic · deep blue & purple',
    variables: {
      '--bg': '#080a14',
      '--bg2': '#0e1020',
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
      '--sidebar-bg': 'rgba(8,10,20,0.92)',
      '--header-bg': 'rgba(8,10,20,0.88)',
      '--overlay-bg': 'rgba(8,10,20,0.98)',
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
  {
    id: 'crystal',
    name: 'Crystal',
    type: 'preset',
    category: 'general',
    variant: 'light',
    description: 'Clean · ice blue & white',
    variables: {
      '--bg': '#f0f2f8',
      '--bg2': '#e4e8f0',
      '--surface': 'rgba(0,0,0,0.04)',
      '--surface2': 'rgba(0,0,0,0.07)',
      '--border': 'rgba(0,0,0,0.10)',
      '--border2': 'rgba(0,0,0,0.16)',
      '--neon': '#2b7be4',
      '--neon2': '#5a6bd6',
      '--neon-glow': 'rgba(43,123,228,0.15)',
      '--neon-glow2': 'rgba(90,107,214,0.15)',
      '--text': '#2a2a3a',
      '--text-bright': '#0f0f1a',
      '--muted': '#8888a0',
      '--sidebar-bg': 'rgba(255,255,255,0.92)',
      '--header-bg': 'rgba(255,255,255,0.88)',
      '--overlay-bg': 'rgba(255,255,255,0.97)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
      '--danger': '#e63946',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // ── MALE THEMES ──
  {
    id: 'obsidian',
    name: 'Obsidian',
    type: 'preset',
    category: 'male',
    variant: 'dark',
    description: 'Bold · charcoal & electric blue',
    variables: {
      '--bg': '#0a0a0f',
      '--bg2': '#11111a',
      '--surface': 'rgba(255,255,255,0.05)',
      '--surface2': 'rgba(255,255,255,0.08)',
      '--border': 'rgba(255,255,255,0.09)',
      '--border2': 'rgba(255,255,255,0.14)',
      '--neon': '#00d4ff',
      '--neon2': '#7b61ff',
      '--neon-glow': 'rgba(0,212,255,0.3)',
      '--neon-glow2': 'rgba(123,97,255,0.3)',
      '--text': '#e8e8f0',
      '--text-bright': '#f0f0f8',
      '--muted': '#6b6b80',
      '--sidebar-bg': 'rgba(8,8,14,0.92)',
      '--header-bg': 'rgba(8,8,14,0.88)',
      '--overlay-bg': 'rgba(10,10,18,0.98)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
      '--danger': '#ff4d6d',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  {
    id: 'sol',
    name: 'Sol',
    type: 'preset',
    category: 'male',
    variant: 'light',
    description: 'Bright · warm sun & sand',
    variables: {
      '--bg': '#f8f4ed',
      '--bg2': '#efe8e0',
      '--surface': 'rgba(0,0,0,0.04)',
      '--surface2': 'rgba(0,0,0,0.07)',
      '--border': 'rgba(0,0,0,0.10)',
      '--border2': 'rgba(0,0,0,0.16)',
      '--neon': '#e07c2e',
      '--neon2': '#d4a02b',
      '--neon-glow': 'rgba(224,124,46,0.15)',
      '--neon-glow2': 'rgba(212,160,43,0.15)',
      '--text': '#2a2a2a',
      '--text-bright': '#0f0f0f',
      '--muted': '#8a8a8a',
      '--sidebar-bg': 'rgba(255,250,245,0.92)',
      '--header-bg': 'rgba(255,250,245,0.88)',
      '--overlay-bg': 'rgba(255,250,245,0.97)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
      '--danger': '#d62828',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  // ── FEMALE THEMES ──
  {
    id: 'void',
    name: 'Void',
    type: 'preset',
    category: 'female',
    variant: 'dark',
    description: 'Sleek · midnight & rose gold',
    variables: {
      '--bg': '#0f0a14',
      '--bg2': '#161020',
      '--surface': 'rgba(255,255,255,0.04)',
      '--surface2': 'rgba(255,255,255,0.07)',
      '--border': 'rgba(255,255,255,0.08)',
      '--border2': 'rgba(255,255,255,0.13)',
      '--neon': '#ff6b9d',
      '--neon2': '#c084d8',
      '--neon-glow': 'rgba(255,107,157,0.25)',
      '--neon-glow2': 'rgba(192,132,216,0.25)',
      '--text': '#e8e4ed',
      '--text-bright': '#f0ecf5',
      '--muted': '#7a6a88',
      '--sidebar-bg': 'rgba(12,8,20,0.92)',
      '--header-bg': 'rgba(12,8,20,0.88)',
      '--overlay-bg': 'rgba(14,10,22,0.98)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
      '--danger': '#ff4d6d',
      '--yellow': '#f5c400',
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },
  {
    id: 'sakura',
    name: 'Sakura',
    type: 'preset',
    category: 'female',
    variant: 'light',
    description: 'Soft · cream & cherry blossom',
    variables: {
      '--bg': '#fcf5f7',
      '--bg2': '#f5ecf0',
      '--surface': 'rgba(0,0,0,0.03)',
      '--surface2': 'rgba(0,0,0,0.06)',
      '--border': 'rgba(0,0,0,0.08)',
      '--border2': 'rgba(0,0,0,0.14)',
      '--neon': '#e86a92',
      '--neon2': '#d4a0c4',
      '--neon-glow': 'rgba(232,106,146,0.15)',
      '--neon-glow2': 'rgba(212,160,196,0.15)',
      '--text': '#2a1e28',
      '--text-bright': '#0f0a0e',
      '--muted': '#8a7a86',
      '--sidebar-bg': 'rgba(255,248,250,0.92)',
      '--header-bg': 'rgba(255,248,250,0.88)',
      '--overlay-bg': 'rgba(255,248,250,0.97)',
      '--shadow': '0 8px 32px rgba(0,0,0,0.08)',
      '--danger': '#d62828',
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

// ── GET THEMES BY CATEGORY ──
function getThemesByCategory(category) {
  return THEME_PRESETS.filter(t => t.category === category);
}

// ── GET THEMES BY VARIANT ──
function getThemesByVariant(variant) {
  return THEME_PRESETS.filter(t => t.variant === variant);
}

// ── GET DEFAULT THEME ──
function getDefaultTheme() {
  return THEME_PRESETS.find(t => t.id === 'nebula') || THEME_PRESETS[0];
}

// ── EXPOSE TO WINDOW ──
window.THEME_PRESETS = THEME_PRESETS;
window.getPresetTheme = getPresetTheme;
window.getAllPresets = getAllPresets;
window.getThemesByCategory = getThemesByCategory;
window.getThemesByVariant = getThemesByVariant;
window.getDefaultTheme = getDefaultTheme;

console.log('✅ Theme presets loaded!');
console.log('📦 Presets:', THEME_PRESETS.length);
console.log('📂 Categories:', [...new Set(THEME_PRESETS.map(t => t.category))]);