// ── THEME ENGINE ──
// Handles loading, applying, and saving themes
// Depends on theme-presets.js being loaded first

const THEME_KEY = 'cesc_theme';
const USER_CATEGORY_KEY = 'cesc_theme_category';

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
    category: theme.category || 'general',
    variant: theme.variant || 'dark'
  }));
  
  // Update user's category if present
  if (theme.category) {
    localStorage.setItem(USER_CATEGORY_KEY, theme.category);
  }
}

// ── UPDATE THEME ICON ──
function updateThemeIcon(themeId) {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  
  const icon = btn.querySelector('i');
  if (!icon) return;
  
  // Determine icon based on theme variant
  const isDark = isThemeDark(themeId);
  icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
}

// ── CHECK IF THEME IS DARK ──
function isThemeDark(themeId) {
  const allThemes = getAvailableThemes();
  const theme = allThemes.find(t => t.id === themeId);
  
  if (theme) {
    // If theme has variant property, use it
    if (theme.variant) {
      return theme.variant === 'dark';
    }
    
    // Fallback: check background color
    const bg = theme.variables['--bg'] || '';
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
    return true;
  }
  return true;
}

// ── GET AVAILABLE THEMES ──
function getAvailableThemes() {
  return window.THEME_PRESETS || [];
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
  return window.getDefaultTheme ? window.getDefaultTheme() : null;
}

// ── GET USER CATEGORY ──
function getUserCategory() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data.category || 'general';
    }
  } catch (e) {
    console.error('Error getting user category:', e);
  }
  return 'general';
}

// ── DETECT SYSTEM PREFERENCE ──
function getSystemPreference() {
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return null; // No preference detected
}

// ── INIT THEME ──
function initTheme() {
  // Check if theme is already saved
  const saved = localStorage.getItem(THEME_KEY);
  
  if (saved) {
    try {
      const data = JSON.parse(saved);
      const allThemes = getAvailableThemes();
      const theme = allThemes.find(t => t.id === data.id);
      if (theme) {
        applyTheme(theme);
        return;
      }
    } catch (e) {
      console.error('Error parsing saved theme:', e);
    }
  }
  
  // No saved theme or invalid - check system preference
  const systemPref = getSystemPreference();
  let defaultTheme;
  
  if (systemPref === 'dark') {
    defaultTheme = window.getDefaultTheme ? window.getDefaultTheme() : 
                   window.THEME_PRESETS?.find(t => t.id === 'nebula');
  } else if (systemPref === 'light') {
    defaultTheme = window.THEME_PRESETS?.find(t => t.id === 'crystal');
  } else {
    // No system preference - default to nebula (general dark)
    defaultTheme = window.getDefaultTheme ? window.getDefaultTheme() : 
                   window.THEME_PRESETS?.find(t => t.id === 'nebula');
  }
  
  if (defaultTheme) {
    applyTheme(defaultTheme);
  } else {
    // Ultimate fallback
    const fallback = window.THEME_PRESETS?.[0];
    if (fallback) applyTheme(fallback);
  }
}

// ── CYCLE THEME (Dark/Light toggle within category) ──
function cycleTheme() {
  const current = getCurrentTheme();
  if (!current) {
    initTheme();
    return;
  }
  
  const category = current.category || 'general';
  const allThemes = getAvailableThemes();
  
  // Get themes in the same category
  const categoryThemes = allThemes.filter(t => t.category === category);
  
  // Find current variant
  const currentVariant = current.variant || 'dark';
  
  // Find the opposite variant
  const oppositeVariant = currentVariant === 'dark' ? 'light' : 'dark';
  const oppositeTheme = categoryThemes.find(t => t.variant === oppositeVariant);
  
  if (oppositeTheme) {
    applyTheme(oppositeTheme);
    return;
  }
  
  // If no opposite theme exists in category, fallback to first theme in category
  if (categoryThemes.length > 0) {
    applyTheme(categoryThemes[0]);
    return;
  }
  
  // Ultimate fallback: cycle through all themes
  const currentIndex = allThemes.findIndex(t => t.id === current.id);
  const nextIndex = (currentIndex + 1) % allThemes.length;
  if (allThemes[nextIndex]) {
    applyTheme(allThemes[nextIndex]);
  }
}

// ── SET USER CATEGORY ──
function setUserCategory(category) {
  if (!category) return;
  localStorage.setItem(USER_CATEGORY_KEY, category);
  
  // Apply the default theme for this category
  const allThemes = getAvailableThemes();
  const defaultForCategory = allThemes.find(t => t.category === category && t.variant === 'dark');
  if (defaultForCategory) {
    applyTheme(defaultForCategory);
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

// ── GET THEMES BY CATEGORY ──
function getThemesByCategory(category) {
  const allThemes = getAvailableThemes();
  return allThemes.filter(t => t.category === category);
}

// ── GET THEMES GROUPED ──
function getThemesGrouped() {
  const allThemes = getAvailableThemes();
  const grouped = {};
  
  allThemes.forEach(theme => {
    const category = theme.category || 'general';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(theme);
  });
  
  return grouped;
}

// ── EXPOSE TO WINDOW ──
window.applyTheme = applyTheme;
window.initTheme = initTheme;
window.cycleTheme = cycleTheme;
window.toggleTheme = cycleTheme; // Alias for backward compatibility
window.switchTheme = switchTheme;
window.getCurrentTheme = getCurrentTheme;
window.getAvailableThemes = getAvailableThemes;
window.getUserCategory = getUserCategory;
window.setUserCategory = setUserCategory;
window.getThemesByCategory = getThemesByCategory;
window.getThemesGrouped = getThemesGrouped;
window.getSystemPreference = getSystemPreference;
window.isThemeDark = isThemeDark;
window.THEME_KEY = THEME_KEY;
window.USER_CATEGORY_KEY = USER_CATEGORY_KEY;

console.log('✅ Theme engine loaded!');
console.log('📦 Available themes:', getAvailableThemes().length);
console.log('🔄 Cycle: toggle dark/light within category');