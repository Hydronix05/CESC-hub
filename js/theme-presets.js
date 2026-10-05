// ── THEME PRESETS ──
// Each theme family has TWO variants: dark & light.
// The header moon/sun button toggles between them.

const THEME_PRESETS = [

  // ── 1. MONOCHROME ──
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Neutral · pure grayscale',
    variants: {
      dark: {
        '--bg': '#0a0a0c',
        '--bg2': '#131316',
        '--surface': 'rgba(255,255,255,0.045)',
        '--surface2': 'rgba(255,255,255,0.075)',
        '--border': 'rgba(255,255,255,0.09)',
        '--border2': 'rgba(255,255,255,0.14)',
        '--neon': '#e8e8ee',
        '--neon2': '#9a9aa8',
        '--neon-glow': 'rgba(232,232,238,0.18)',
        '--neon-glow2': 'rgba(154,154,168,0.18)',
        '--text': '#e4e4e8',
        '--text-bright': '#f4f4f8',
        '--muted': '#6a6a74',
        '--sidebar-bg': 'rgba(10,10,14,0.92)',
        '--header-bg': 'rgba(10,10,14,0.88)',
        '--overlay-bg': 'rgba(12,12,16,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
        '--danger': '#e05555',
        '--yellow': '#d4b84a',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#f6f6f8',
        '--bg2': '#eaecef',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#2a2a30',
        '--neon2': '#5a5a64',
        '--neon-glow': 'rgba(42,42,48,0.15)',
        '--neon-glow2': 'rgba(90,90,100,0.15)',
        '--text': '#22222a',
        '--text-bright': '#0a0a0e',
        '--muted': '#8a8a94',
        '--sidebar-bg': 'rgba(255,255,255,0.92)',
        '--header-bg': 'rgba(255,255,255,0.88)',
        '--overlay-bg': 'rgba(255,255,255,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#c0392b',
        '--yellow': '#c9a227',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 2. NEBULA (blue) ──
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cool · deep blue & electric',
    variants: {
      dark: {
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
      },
      light: {
        '--bg': '#f0f4fc',
        '--bg2': '#e0e8f6',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#2b7be4',
        '--neon2': '#5a6bd6',
        '--neon-glow': 'rgba(43,123,228,0.18)',
        '--neon-glow2': 'rgba(90,107,214,0.18)',
        '--text': '#1e2634',
        '--text-bright': '#0a0f1a',
        '--muted': '#7a8598',
        '--sidebar-bg': 'rgba(255,255,255,0.92)',
        '--header-bg': 'rgba(255,255,255,0.88)',
        '--overlay-bg': 'rgba(255,255,255,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#d63d55',
        '--yellow': '#e0a500',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 3. BLOSSOM (pink) ──
  {
    id: 'blossom',
    name: 'Blossom',
    description: 'Soft · rose & cherry',
    variants: {
      dark: {
        '--bg': '#140a12',
        '--bg2': '#1e1018',
        '--surface': 'rgba(255,255,255,0.04)',
        '--surface2': 'rgba(255,255,255,0.07)',
        '--border': 'rgba(255,255,255,0.08)',
        '--border2': 'rgba(255,255,255,0.13)',
        '--neon': '#ff6b9d',
        '--neon2': '#c084d8',
        '--neon-glow': 'rgba(255,107,157,0.28)',
        '--neon-glow2': 'rgba(192,132,216,0.28)',
        '--text': '#ede4eb',
        '--text-bright': '#f7eef5',
        '--muted': '#8a7080',
        '--sidebar-bg': 'rgba(20,10,18,0.92)',
        '--header-bg': 'rgba(20,10,18,0.88)',
        '--overlay-bg': 'rgba(24,12,22,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.45)',
        '--danger': '#ff4d6d',
        '--yellow': '#f5c400',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#fcf5f7',
        '--bg2': '#f5e8ee',
        '--surface': 'rgba(0,0,0,0.03)',
        '--surface2': 'rgba(0,0,0,0.06)',
        '--border': 'rgba(0,0,0,0.08)',
        '--border2': 'rgba(0,0,0,0.14)',
        '--neon': '#e86a92',
        '--neon2': '#d4a0c4',
        '--neon-glow': 'rgba(232,106,146,0.18)',
        '--neon-glow2': 'rgba(212,160,196,0.18)',
        '--text': '#3a2030',
        '--text-bright': '#1a0a14',
        '--muted': '#9a8090',
        '--sidebar-bg': 'rgba(255,248,250,0.92)',
        '--header-bg': 'rgba(255,248,250,0.88)',
        '--overlay-bg': 'rgba(255,248,250,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.08)',
        '--danger': '#d63d55',
        '--yellow': '#e0a500',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 4. EMERALD (green) ──
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh · forest & jade',
    variants: {
      dark: {
        '--bg': '#06140f',
        '--bg2': '#0a1e17',
        '--surface': 'rgba(255,255,255,0.04)',
        '--surface2': 'rgba(255,255,255,0.07)',
        '--border': 'rgba(255,255,255,0.08)',
        '--border2': 'rgba(255,255,255,0.13)',
        '--neon': '#10d98a',
        '--neon2': '#0fa36b',
        '--neon-glow': 'rgba(16,217,138,0.3)',
        '--neon-glow2': 'rgba(15,163,107,0.3)',
        '--text': '#e4f0eb',
        '--text-bright': '#f0faf5',
        '--muted': '#5f7a70',
        '--sidebar-bg': 'rgba(6,20,15,0.92)',
        '--header-bg': 'rgba(6,20,15,0.88)',
        '--overlay-bg': 'rgba(8,24,18,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
        '--danger': '#ff5470',
        '--yellow': '#f5c400',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#f0faf5',
        '--bg2': '#e0f2e8',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#0fa36b',
        '--neon2': '#0a8256',
        '--neon-glow': 'rgba(15,163,107,0.18)',
        '--neon-glow2': 'rgba(10,130,86,0.18)',
        '--text': '#1a3a2c',
        '--text-bright': '#0a2018',
        '--muted': '#7a9a8c',
        '--sidebar-bg': 'rgba(255,255,255,0.92)',
        '--header-bg': 'rgba(255,255,255,0.88)',
        '--overlay-bg': 'rgba(255,255,255,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#d63850',
        '--yellow': '#e0a500',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 5. EMBER (red) ──
  {
    id: 'ember',
    name: 'Ember',
    description: 'Bold · wine & crimson',
    variants: {
      dark: {
        '--bg': '#140808',
        '--bg2': '#1e0e0e',
        '--surface': 'rgba(255,255,255,0.04)',
        '--surface2': 'rgba(255,255,255,0.07)',
        '--border': 'rgba(255,255,255,0.08)',
        '--border2': 'rgba(255,255,255,0.13)',
        '--neon': '#e85d5d',
        '--neon2': '#b83d3d',
        '--neon-glow': 'rgba(232,93,93,0.3)',
        '--neon-glow2': 'rgba(184,61,61,0.3)',
        '--text': '#ede4e4',
        '--text-bright': '#f7eeed',
        '--muted': '#8a7070',
        '--sidebar-bg': 'rgba(20,8,8,0.92)',
        '--header-bg': 'rgba(20,8,8,0.88)',
        '--overlay-bg': 'rgba(24,10,10,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.45)',
        '--danger': '#ff4d6d',
        '--yellow': '#f5c400',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#fdf3f3',
        '--bg2': '#f8e0e0',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#d63838',
        '--neon2': '#b02e2e',
        '--neon-glow': 'rgba(214,56,56,0.18)',
        '--neon-glow2': 'rgba(176,46,46,0.18)',
        '--text': '#3a1e1e',
        '--text-bright': '#1a0a0a',
        '--muted': '#9a8080',
        '--sidebar-bg': 'rgba(255,250,250,0.92)',
        '--header-bg': 'rgba(255,250,250,0.88)',
        '--overlay-bg': 'rgba(255,250,250,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#c0392b',
        '--yellow': '#e0a500',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 6. COCOA (brown) ──
  {
    id: 'cocoa',
    name: 'Cocoa',
    description: 'Warm · espresso & caramel',
    variants: {
      dark: {
        '--bg': '#120c08',
        '--bg2': '#1c140e',
        '--surface': 'rgba(255,255,255,0.04)',
        '--surface2': 'rgba(255,255,255,0.07)',
        '--border': 'rgba(255,255,255,0.08)',
        '--border2': 'rgba(255,255,255,0.13)',
        '--neon': '#d18b4a',
        '--neon2': '#a86f3c',
        '--neon-glow': 'rgba(209,139,74,0.3)',
        '--neon-glow2': 'rgba(168,111,60,0.3)',
        '--text': '#ede4db',
        '--text-bright': '#f7eeE5',
        '--muted': '#8a7a6a',
        '--sidebar-bg': 'rgba(18,12,8,0.92)',
        '--header-bg': 'rgba(18,12,8,0.88)',
        '--overlay-bg': 'rgba(22,15,10,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.45)',
        '--danger': '#e05555',
        '--yellow': '#f5c400',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#faf4ec',
        '--bg2': '#f0e5d6',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#a86f3c',
        '--neon2': '#8a5a2e',
        '--neon-glow': 'rgba(168,111,60,0.18)',
        '--neon-glow2': 'rgba(138,90,46,0.18)',
        '--text': '#33241a',
        '--text-bright': '#150c06',
        '--muted': '#9a8a78',
        '--sidebar-bg': 'rgba(255,250,240,0.92)',
        '--header-bg': 'rgba(255,250,240,0.88)',
        '--overlay-bg': 'rgba(255,250,240,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#c0392b',
        '--yellow': '#d4a017',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  },

  // ── 7. SOLSTICE (yellow/amber) ──
  {
    id: 'solstice',
    name: 'Solstice',
    description: 'Bright · honey & vanilla',
    variants: {
      dark: {
        '--bg': '#100e05',
        '--bg2': '#1a170a',
        '--surface': 'rgba(255,255,255,0.04)',
        '--surface2': 'rgba(255,255,255,0.07)',
        '--border': 'rgba(255,255,255,0.08)',
        '--border2': 'rgba(255,255,255,0.13)',
        '--neon': '#f5c400',
        '--neon2': '#d4a017',
        '--neon-glow': 'rgba(245,196,0,0.28)',
        '--neon-glow2': 'rgba(212,160,23,0.28)',
        '--text': '#ede8d8',
        '--text-bright': '#f7f2e2',
        '--muted': '#8a8468',
        '--sidebar-bg': 'rgba(16,14,5,0.92)',
        '--header-bg': 'rgba(16,14,5,0.88)',
        '--overlay-bg': 'rgba(20,17,8,0.98)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.4)',
        '--danger': '#e05555',
        '--yellow': '#f5c400',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      light: {
        '--bg': '#fdf9e8',
        '--bg2': '#f5efd0',
        '--surface': 'rgba(0,0,0,0.04)',
        '--surface2': 'rgba(0,0,0,0.07)',
        '--border': 'rgba(0,0,0,0.10)',
        '--border2': 'rgba(0,0,0,0.16)',
        '--neon': '#c9a227',
        '--neon2': '#a88a1a',
        '--neon-glow': 'rgba(201,162,39,0.18)',
        '--neon-glow2': 'rgba(168,138,26,0.18)',
        '--text': '#332e1a',
        '--text-bright': '#1a1608',
        '--muted': '#9a9278',
        '--sidebar-bg': 'rgba(255,253,235,0.92)',
        '--header-bg': 'rgba(255,253,235,0.88)',
        '--overlay-bg': 'rgba(255,253,235,0.97)',
        '--shadow': '0 8px 32px rgba(0,0,0,0.10)',
        '--danger': '#c0392b',
        '--yellow': '#a87800',
        '--sidebar-w': '240px',
        '--header-h': '62px',
        '--radius': '14px',
        '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      }
    }
  }
];

// ── HELPERS ──
function getPresetTheme(id) {
  return THEME_PRESETS.find(t => t.id === id) || null;
}

function getAllPresets() {
  return THEME_PRESETS;
}

function getDefaultTheme() {
  return THEME_PRESETS.find(t => t.id === 'nebula') || THEME_PRESETS[0];
}

// ── EXPOSE TO WINDOW ──
window.THEME_PRESETS = THEME_PRESETS;
window.getPresetTheme = getPresetTheme;
window.getAllPresets = getAllPresets;
window.getDefaultTheme = getDefaultTheme;

console.log('✅ Theme presets loaded!');
console.log('📦 Families:', THEME_PRESETS.length);