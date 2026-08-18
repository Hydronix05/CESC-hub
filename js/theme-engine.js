// ── THEME ENGINE ──
// Handles loading, applying, and saving themes
// Depends on theme-presets.js being loaded first

const THEME_KEY = 'cesc_theme';
const CUSTOM_THEMES_KEY = 'cesc_custom_themes';
const MAX_CUSTOM_THEMES = 3;

// ── APPLY THEME ──
function applyTheme(theme) {
  if (!theme) return;
  
  // Set CSS variables on :root
  const root = document.documentElement;
  
  // Apply all theme variables
  Object.keys(theme.variables).forEach(key => {
    root.style.setProperty(key, theme.variables[key]);
  });
  
  // Set data attribute for any remaining CSS selectors
  root.setAttribute('data-theme', theme.id);
  
  // Update theme toggle button icon
  updateThemeIcon(theme.id);
  
  // Save to localStorage
  localStorage.setItem(THEME_KEY, JSON.stringify({
    id: theme.id,
    name: theme.name,
    type: theme.type || 'preset' // 'preset' or 'custom'
  }));
}

// ── UPDATE THEME ICON ──
function updateThemeIcon(themeId) {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  
  const icon = btn.querySelector('i');
  if (!icon) return;
  
  // Determine icon based on theme
  const isDark = isThemeDark(themeId);
  icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

// ── CHECK IF THEME IS DARK ──
function isThemeDark(themeId) {
  // Check if we have the theme loaded
  const allThemes = getAvailableThemes();
  const theme = allThemes.find(t => t.id === themeId);
  
  if (theme) {
    // Check the background color for darkness
    const bg = theme.variables['--bg'] || '';
    // Simple heuristic: if bg starts with # and is dark, or if it's rgba with low values
    if (bg.startsWith('#')) {
      const hex = bg.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return (r + g + b) / 3 < 128;
    }
    if (bg.startsWith('rgba')) {
      const matches = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (matches) {
        const r = parseInt(matches[1]);
        const g = parseInt(matches[2]);
        const b = parseInt(matches[3]);
        return (r + g + b) / 3 < 128;
      }
    }
    // Default: assume dark
    return true;
  }
  
  // Default fallback
  return true;
}

// ── GET AVAILABLE THEMES ──
function getAvailableThemes() {
  // Get presets from theme-presets.js
  const presets = window.THEME_PRESETS || [];
  
  // Get custom themes from localStorage
  const customThemes = getCustomThemes();
  
  return [...presets, ...customThemes];
}

// ── GET CURRENT THEME ──
function getCurrentTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      const allThemes = getAvailableThemes();
      const theme = allThemes.find(t => t.id === data.id);
      if (theme) return theme;
    }
  } catch (e) {
    console.error('Error getting current theme:', e);
  }
  
  // Fallback to default
  return window.THEME_PRESETS?.find(t => t.id === 'default') || null;
}

// ── INIT THEME ──
function initTheme() {
  const current = getCurrentTheme();
  if (current) {
    applyTheme(current);
  } else {
    // Fallback to default preset
    const defaultTheme = window.THEME_PRESETS?.find(t => t.id === 'default');
    if (defaultTheme) {
      applyTheme(defaultTheme);
    }
  }
}

// ── TOGGLE THEME ──
function toggleTheme() {
  const current = getCurrentTheme();
  if (!current) return;
  
  const allThemes = getAvailableThemes();
  const currentIndex = allThemes.findIndex(t => t.id === current.id);
  
  // Find next theme (presets only for toggle, skip custom themes)
  const presets = window.THEME_PRESETS || [];
  const currentPresetIndex = presets.findIndex(t => t.id === current.id);
  
  if (currentPresetIndex !== -1) {
    // Toggle between presets
    const nextIndex = (currentPresetIndex + 1) % presets.length;
    const nextTheme = presets[nextIndex];
    if (nextTheme) {
      applyTheme(nextTheme);
    }
  } else {
    // If current is a custom theme, go to first preset
    const firstPreset = presets[0];
    if (firstPreset) {
      applyTheme(firstPreset);
    }
  }
}

// ── SWITCH TO THEME BY ID ──
function switchTheme(themeId) {
  const allThemes = getAvailableThemes();
  const theme = allThemes.find(t => t.id === themeId);
  if (theme) {
    applyTheme(theme);
    return true;
  }
  return false;
}

// ── CUSTOM THEMES ──
function getCustomThemes() {
  try {
    const data = localStorage.getItem(CUSTOM_THEMES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error loading custom themes:', e);
    return [];
  }
}

function saveCustomThemes(themes) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch (e) {
    console.error('Error saving custom themes:', e);
  }
}

function createCustomTheme(name, variables) {
  const customThemes = getCustomThemes();
  
  if (customThemes.length >= MAX_CUSTOM_THEMES) {
    showToast(`Maximum ${MAX_CUSTOM_THEMES} custom themes allowed 💀`, 'error');
    return null;
  }
  
  const newTheme = {
    id: 'custom_' + Date.now(),
    name: name || 'Custom Theme',
    type: 'custom',
    variables: {
      '--bg': variables.bg || '#0a0a0f',
      '--bg2': variables.bg2 || '#0f0f1a',
      '--surface': variables.surface || 'rgba(255,255,255,0.04)',
      '--surface2': variables.surface2 || 'rgba(255,255,255,0.07)',
      '--border': variables.border || 'rgba(255,255,255,0.08)',
      '--border2': variables.border2 || 'rgba(255,255,255,0.13)',
      '--neon': variables.neon || '#4a9eff',
      '--neon2': variables.neon2 || '#6c5ce7',
      '--neon-glow': variables.neonGlow || 'rgba(74,158,255,0.3)',
      '--neon-glow2': variables.neonGlow2 || 'rgba(108,92,231,0.3)',
      '--text': variables.text || '#e8e8f0',
      '--text-bright': variables.textBright || '#f0f0f8',
      '--muted': variables.muted || '#6b6b80',
      '--sidebar-bg': variables.sidebarBg || 'rgba(8,8,16,0.92)',
      '--header-bg': variables.headerBg || 'rgba(8,8,16,0.88)',
      '--overlay-bg': variables.overlayBg || 'rgba(10,10,22,0.98)',
      '--shadow': variables.shadow || '0 8px 32px rgba(0,0,0,0.35)',
      '--danger': '#ff4d6d', // Fixed
      '--yellow': '#f5c400', // Fixed
      '--sidebar-w': '240px',
      '--header-h': '62px',
      '--radius': '14px',
      '--transition-smooth': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--transition-bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  };
  
  customThemes.push(newTheme);
  saveCustomThemes(customThemes);
  return newTheme;
}

// ── CORE DELETE FUNCTION (RENAMED TO AVOID CONFLICT) ──
function deleteCustomThemeById(themeId) {
  let customThemes = getCustomThemes();
  const filteredThemes = customThemes.filter(t => t.id !== themeId);
  
  // Check if anything was actually deleted
  if (filteredThemes.length === customThemes.length) {
    console.warn('Theme not found:', themeId);
    return false;
  }
  
  saveCustomThemes(filteredThemes);
  
  // If current theme was deleted, switch to default
  const current = getCurrentTheme();
  if (current && current.id === themeId) {
    const defaultTheme = window.THEME_PRESETS?.find(t => t.id === 'default');
    if (defaultTheme) {
      applyTheme(defaultTheme);
    }
  }
  
  return true;
}

// ── KEEP OLD NAME FOR BACKWARD COMPATIBILITY ──
function deleteCustomTheme(themeId) {
  return deleteCustomThemeById(themeId);
}

function updateCustomTheme(themeId, name, variables) {
  let customThemes = getCustomThemes();
  const index = customThemes.findIndex(t => t.id === themeId);
  
  if (index === -1) return null;
  
  const theme = customThemes[index];
  if (name) theme.name = name;
  
  if (variables) {
    Object.keys(variables).forEach(key => {
      const cssKey = '--' + key;
      if (theme.variables[cssKey] !== undefined) {
        theme.variables[cssKey] = variables[key];
      }
    });
  }
  
  customThemes[index] = theme;
  saveCustomThemes(customThemes);
  
  // Re-apply if it's the current theme
  const current = getCurrentTheme();
  if (current && current.id === themeId) {
    applyTheme(theme);
  }
  
  return theme;
}

// ── GET THEME VARIABLES FOR EDITOR ──
function getThemeVariables(themeId) {
  const allThemes = getAvailableThemes();
  const theme = allThemes.find(t => t.id === themeId);
  
  if (!theme) return null;
  
  // Return a clean copy of variables for the editor
  const vars = { ...theme.variables };
  
  // Remove fixed values and dimension vars
  delete vars['--danger'];
  delete vars['--yellow'];
  delete vars['--sidebar-w'];
  delete vars['--header-h'];
  delete vars['--radius'];
  delete vars['--transition-smooth'];
  delete vars['--transition-bounce'];
  
  return vars;
}

// ── EXPOSE TO WINDOW ──
window.applyTheme = applyTheme;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.switchTheme = switchTheme;
window.getCurrentTheme = getCurrentTheme;
window.getAvailableThemes = getAvailableThemes;
window.getThemeVariables = getThemeVariables;
window.createCustomTheme = createCustomTheme;
window.deleteCustomTheme = deleteCustomTheme;  // ← This is the engine version
window.updateCustomTheme = updateCustomTheme;
window.getCustomThemes = getCustomThemes;
window.THEME_KEY = THEME_KEY;
window.CUSTOM_THEMES_KEY = CUSTOM_THEMES_KEY;
window.MAX_CUSTOM_THEMES = MAX_CUSTOM_THEMES;

console.log('✅ Theme engine loaded!');
console.log('📦 Available themes:', getAvailableThemes().length);