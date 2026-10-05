// ── THEME ENGINE ──
// Each theme is a family with dark + light variants.
// The moon/sun button in the header toggles the current family's variant.

const THEME_KEY = 'cesc_theme';           // legacy key (kept for migration)
const THEME_ID_KEY = 'cesc_theme_id';     // family id (e.g. 'nebula')
const THEME_VARIANT_KEY = 'cesc_theme_variant'; // 'dark' | 'light'

// ── APPLY THEME ──
function applyTheme(familyId, variant) {
  const theme = getPresetTheme(familyId);
  if (!theme) return;

  const v = variant === 'light' ? 'light' : 'dark';
  const vars = theme.variants[v];
  if (!vars) return;

  const root = document.documentElement;
  Object.keys(vars).forEach(key => {
    root.style.setProperty(key, vars[key]);
  });

  root.setAttribute('data-theme', familyId);
  root.setAttribute('data-variant', v);

  updateThemeIcon(v);

  try {
    localStorage.setItem(THEME_ID_KEY, familyId);
    localStorage.setItem(THEME_VARIANT_KEY, v);
    // Keep legacy key in sync so old code doesn't break
    localStorage.setItem(THEME_KEY, JSON.stringify({
      id: familyId,
      name: theme.name,
      variant: v
    }));
  } catch (e) {}
}

// ── UPDATE HEADER ICON ──
function updateThemeIcon(variant) {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = variant === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// ── GET CURRENT ──
function getCurrentTheme() {
  // Try new keys first
  let id = null;
  let variant = null;
  try {
    id = localStorage.getItem(THEME_ID_KEY);
    variant = localStorage.getItem(THEME_VARIANT_KEY);
  } catch (e) {}

  // Migration from old THEME_KEY format
  if (!id) {
    try {
      const legacy = localStorage.getItem(THEME_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.id) {
          // Map old preset ids to new family ids
          const migrationMap = {
            'nebula':    'nebula',
            'crystal':   'nebula',
            'obsidian':  'monochrome',
            'sol':       'cocoa',
            'void':      'blossom',
            'sakura':    'blossom',
            'emerald':   'emerald',
            'sunset':    'ember',
            'citrus':    'solstice',
            'velvet':    'ember'
          };
          id = migrationMap[parsed.id] || 'nebula';
          variant = parsed.variant || 'dark';
          try {
            localStorage.setItem(THEME_ID_KEY, id);
            localStorage.setItem(THEME_VARIANT_KEY, variant);
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // Fallback: system preference
  if (!id) {
    const sysPref = getSystemPreference();
    id = 'nebula';
    variant = sysPref === 'light' ? 'light' : 'dark';
  }

  const family = getPresetTheme(id) || getDefaultTheme();
  return {
    id: family.id,
    name: family.name,
    description: family.description,
    variant: variant === 'light' ? 'light' : 'dark',
    variables: family.variants[variant === 'light' ? 'light' : 'dark']
  };
}

// ── SYSTEM PREF ──
function getSystemPreference() {
  if (window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  }
  return null;
}

// ── INIT ──
function initTheme() {
  const current = getCurrentTheme();
  applyTheme(current.id, current.variant);
}

// ── CYCLE (moon/sun button) ──
function cycleTheme() {
  const current = getCurrentTheme();
  const next = current.variant === 'dark' ? 'light' : 'dark';
  applyTheme(current.id, next);
  return next;
}

// ── SWITCH FAMILY ──
function switchTheme(familyId) {
  const family = getPresetTheme(familyId);
  if (!family) return false;
  const current = getCurrentTheme();
  applyTheme(familyId, current.variant);
  return true;
}

// ── EXPOSE ──
window.applyTheme = applyTheme;
window.initTheme = initTheme;
window.cycleTheme = cycleTheme;
window.toggleTheme = cycleTheme;
window.switchTheme = switchTheme;
window.getCurrentTheme = getCurrentTheme;
window.getAvailableThemes = () => window.THEME_PRESETS || [];
window.getSystemPreference = getSystemPreference;
window.THEME_ID_KEY = THEME_ID_KEY;
window.THEME_VARIANT_KEY = THEME_VARIANT_KEY;

console.log('✅ Theme engine loaded!');