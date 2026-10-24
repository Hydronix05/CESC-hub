// ── SUPABASE CLIENT ──
// Using CDN version - supabase is already available globally
const SUPABASE_URL = 'https://wojbqixkarjlvbgublsg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvamJxaXhrYXJqbHZiZ3VibHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjkxNDYsImV4cCI6MjEwMTY0NTE0Nn0.A2VpByFPSIi9bS8EkAh7VPsgjuiYFfgAyuwIz-sCcas';

// supabase is already defined globally by the CDN script
// Just initialize it with the URL and key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
  auth: { persistSession: true },
  realtime: { params: { eventsPerSecond: 10 } }
});

// ── GLOBALS ──
let session = null;
let currentUser = null;
const pfpCache = {};
let isDownbarMoreOpen = false;
let _loadingSteps = [];
let _currentStepIndex = 0;
let _loadingInProgress = false;
let _loadingRetryCallback = null;
let _loadingEscapeDisabled = false;

// ═══════════════════════════════════════════════════════════
// ── NAV TEMPLATES (single source of truth) ──
// ═══════════════════════════════════════════════════════════
// These functions render the header, sidebar, downbar, and downbar-more.
// Every page has placeholder divs that get replaced with this HTML on
// DOMContentLoaded — BEFORE the page's own initPage() runs.
//
// Edit the nav ONCE here and it updates everywhere.
// ═══════════════════════════════════════════════════════════

function getActivePageKey() {
  const path = window.location.pathname;
  if (path === '/' || path === '/index.html') return 'home';
  if (path.startsWith('/chat')) return 'chat';
  if (path.startsWith('/profiles')) return 'profiles';
  if (path.startsWith('/games/bloxdio')) return 'bloxdio';
  if (path.startsWith('/games')) return 'games';
  if (path.startsWith('/leaderboard')) return 'leaderboard';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/download')) return 'download';
  if (path.startsWith('/notifications')) return 'notifications';
  if (path.startsWith('/about')) return 'about';
  if (path.startsWith('/feedback')) return 'feedback';
  if (path.startsWith('/onboarding')) return 'onboarding';
  return '';
}

function navItem(href, icon, label, opts) {
  opts = opts || {};
  const active = opts.active ? ' active' : '';
  const id = opts.id ? ' id="' + opts.id + '"' : '';
  const badge = opts.badge
    ? '<span class="nav-badge-count' + (opts.badgeShow ? ' show' : '') + '" id="' + opts.badge + '">0</span>'
    : '';
  return '<a href="' + href + '" class="nav-item' + active + '"' + id + '>'
    + '<span class="nav-icon"><i class="fas ' + icon + '"></i></span> '
    + '<span class="nav-label-text">' + label + '</span>'
    + badge
    + '</a>';
}

function downbarItem(href, icon, opts) {
  opts = opts || {};
  const active = opts.active ? ' active' : '';
  const id = opts.id ? ' id="' + opts.id + '"' : '';
  return '<a href="' + href + '" class="downbar-item' + active + '"' + id + '>'
    + '<span class="downbar-icon"><i class="fas ' + icon + '"></i></span>'
    + '</a>';
}

function downbarMoreItem(href, icon, label, opts) {
  opts = opts || {};
  const active = opts.active ? ' active' : '';
  return '<a href="' + href + '" class="downbar-more-item' + active + '">'
    + '<span class="downbar-more-icon"><i class="fas ' + icon + '"></i></span>'
    + '<span class="downbar-more-label">' + label + '</span>'
    + '</a>';
}

// ── HEADER ──
function renderHeaderNav() {
  const title = document.body.dataset.pageTitle || 'CESC Hub';
  return ''
    + '<header class="top-header">'
    +   '<div class="header-left">'
    +     '<a href="/" class="header-logo">'
    +       '<img src="https://uploads.onecompiler.io/43m56waex/44huzak7q/232a0cec-1d90-4e0b-8377-41d13d78b763.png" alt="CESC Hub"/>'
    +     '</a>'
    +     '<span class="header-page-title">' + title + '</span>'
    +   '</div>'
    +   '<div class="header-right">'
    +     '<span class="header-online-status">'
    +       '<span class="online-pulse-ring"><span class="online-pulse-dot"></span></span>'
    +       '<span class="online-count-number" id="online-count">...</span>'
    +       '<span class="online-status-text">online now</span>'
    +     '</span>'
    +     '<button class="hdr-btn theme-toggle" id="theme-btn" onclick="cycleTheme()" title="Toggle theme"><i class="fas fa-moon"></i></button>'
    +     '<a href="/notifications" class="hdr-btn" title="Notifications">'
    +       '<i class="fas fa-bell"></i>'
    +       '<span class="notif-badge" id="notif-badge">0</span>'
    +     '</a>'
    +     '<div class="profile-chip" id="profile-chip" onclick="window.toggleDropdown()">'
    +       '<div class="chip-av" id="chip-av"><span id="chip-initial">?</span></div>'
    +       '<span class="chip-name" id="chip-name">loading</span>'
    +       '<span class="chip-arrow"><i class="fas fa-chevron-down"></i></span>'
    +       '<div class="profile-dropdown" id="profile-dropdown">'
    +         '<div class="dd-header">'
    +           '<div class="dd-name" id="dd-name">—</div>'
    +           '<div class="dd-sub">CESC Hub member</div>'
    +         '</div>'
    +         '<a href="/profiles" class="dd-item"><span class="di-icon"><i class="fas fa-user"></i></span> My Profile</a>'
    +         '<a href="/settings" class="dd-item"><span class="di-icon"><i class="fas fa-cog"></i></span> Settings</a>'
+         '<a href="/leaderboard" class="dd-item"><span class="di-icon"><i class="fas fa-fire" style="color:var(--yellow);"></i></span> Streak · <span class="dd-streak-count" id="dd-streak-count" style="margin-left:4px;font-family:Space Mono,monospace;font-size:0.72rem;color:var(--yellow);font-weight:700;">0</span> days</a>'
    +         '<a href="/wallet" class="dd-item"><span class="di-icon"><i class="fas fa-coins"></i></span> Wallet <span class="dd-cein-balance" id="dd-cein-balance" style="margin-left:auto;font-family:Space Mono,monospace;font-size:0.72rem;color:var(--neon);font-weight:700;"></span></a>'
    +         '<a href="/about" class="dd-item"><span class="di-icon"><i class="fas fa-info-circle"></i></span> About</a>'
+         '<a href="/feedback" class="dd-item"><span class="di-icon"><i class="fas fa-comment-dots"></i></span> Feedback</a>'
+         '<button class="dd-item" onclick="window.forceUpdate()"><span class="di-icon"><i class="fas fa-rotate"></i></span> Force Update</button>'
+         '<div class="dd-div"></div>'
+         '<button class="dd-item logout" onclick="window.logout()"><span class="di-icon"><i class="fas fa-sign-out-alt"></i></span> Logout</button>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</header>';
}

// ── SIDEBAR ──
function renderSidebarNav() {
  const p = getActivePageKey();
  return ''
    + '<aside class="sidebar" id="sidebar">'
    +   '<div class="sidebar-nav-scroll">'
    +     navItem('/',           'fa-newspaper',   'Feed',          { active: p === 'home' })
    +     navItem('/chat',       'fa-comments',    'Chat Room',     { active: p === 'chat', id: 'chat-nav', badge: 'chat-nav-badge' })
    +     navItem('/profiles',   'fa-users',       'Profiles',      { active: p === 'profiles' })
    +     navItem('/games',      'fa-gamepad',     'Games',         { active: p === 'games' || p === 'bloxdio' })
    +     navItem('/leaderboard','fa-trophy',      'Leaderboard',   { active: p === 'leaderboard' })
    +     navItem('/wallet',     'fa-coins',       'Wallet',        { active: p === 'wallet' })
    +     navItem('/settings',   'fa-cog',         'Settings',      { active: p === 'settings' })
    +     navItem('/download',   'fa-download',    'Downloads',     { active: p === 'download' })
    +     navItem('/notifications','fa-bell',      'Notifications', { active: p === 'notifications', id: 'notif-nav', badge: 'notif-nav-badge' })
    +     navItem('/about',      'fa-info-circle', 'About',         { active: p === 'about' })
    +     navItem('/feedback',   'fa-comment-dots','Feedback',      { active: p === 'feedback' })
    +   '</div>'
    +   '<div class="sidebar-bottom-fixed">'
    +     '<button class="sidebar-toggle" onclick="window.toggleSidebarExpand()" title="Toggle sidebar">'
    +       '<i class="fas fa-chevron-right"></i>'
    +       '<span class="toggle-label">Collapse</span>'
    +     '</button>'
    +     '<div class="sidebar-ad-slot" id="sidebar-ad-slot"></div>'
    +   '</div>'
    + '</aside>';
}

// ── DOWNBAR (mobile, 5 icons) ──
function renderDownbarNav() {
  const p = getActivePageKey();
  return ''
    + '<nav class="downbar" id="downbar">'
    +   '<div class="downbar-inner">'
    +     downbarItem('/',        'fa-newspaper', { active: p === 'home',     id: 'downbar-home' })
    +     '<a href="/chat" class="downbar-item' + (p === 'chat' ? ' active' : '') + '" id="downbar-chat" style="position:relative;">'
    +       '<span class="downbar-icon"><i class="fas fa-comments"></i></span>'
    +       '<span class="nav-badge-count" id="downbar-chat-badge">0</span>'
    +     '</a>'
    +     downbarItem('/profiles','fa-users',     { active: p === 'profiles', id: 'downbar-profiles' })
    +     downbarItem('/games',   'fa-gamepad',   { active: p === 'games' || p === 'bloxdio', id: 'downbar-games' })
    +     '<button class="downbar-item more-btn" onclick="window.toggleDownbarMore()" id="downbar-more-btn">'
    +       '<span class="downbar-icon"><i class="fas fa-ellipsis-h"></i></span>'
    +     '</button>'
    +   '</div>'
    + '</nav>';
}

// ── DOWNBAR MORE (drawer + overlay) ──
function renderDownbarMoreNav() {
  const p = getActivePageKey();
  return ''
    + '<div class="downbar-overlay" id="downbar-overlay" onclick="window.closeDownbarMore()"></div>'
    + '<div class="downbar-more" id="downbar-more">'
    +   '<div class="downbar-more-handle" onclick="window.closeDownbarMore()"></div>'
    +   '<div class="downbar-more-grid">'
    +     downbarMoreItem('/',            'fa-newspaper',   'Feed',          { active: p === 'home' })
    +     '<a href="/chat" class="downbar-more-item' + (p === 'chat' ? ' active' : '') + '">'
    +       '<span class="downbar-more-icon"><i class="fas fa-comments"></i></span>'
    +       '<span class="downbar-more-label">Chat</span>'
    +       '<span class="nav-badge-count" id="downbar-more-chat-badge" style="position:absolute;top:2px;right:2px;">0</span>'
    +     '</a>'
    +     downbarMoreItem('/profiles',    'fa-users',       'Profiles',      { active: p === 'profiles' })
    +     downbarMoreItem('/games',       'fa-gamepad',     'Games',         { active: p === 'games' || p === 'bloxdio' })
    +     downbarMoreItem('/leaderboard', 'fa-trophy',      'Leaderboard',   { active: p === 'leaderboard' })
    +     downbarMoreItem('/settings',    'fa-cog',         'Settings',      { active: p === 'settings' })
    +     downbarMoreItem('/wallet',      'fa-coins',       'Wallet',        { active: p === 'wallet' })
    +     downbarMoreItem('/download',    'fa-download',    'Downloads',     { active: p === 'download' })
    +     downbarMoreItem('/about',       'fa-info-circle', 'About',         { active: p === 'about' })
    +     downbarMoreItem('/feedback',    'fa-comment-dots','Feedback',      { active: p === 'feedback' })
    +     '<a href="/notifications" class="downbar-more-item' + (p === 'notifications' ? ' active' : '') + '" id="downbar-more-notif">'
    +       '<span class="downbar-more-icon"><i class="fas fa-bell"></i></span>'
    +       '<span class="downbar-more-label">Notifications</span>'
    +       '<span class="nav-badge-count" id="downbar-more-notif-badge" style="position:absolute;top:2px;right:2px;">0</span>'
    +     '</a>'
    +     '<button class="downbar-more-item logout" onclick="window.logout()">'
    +       '<span class="downbar-more-icon"><i class="fas fa-sign-out-alt"></i></span>'
    +       '<span class="downbar-more-label">Logout</span>'
    +     '</button>'
    +   '</div>'
    +   '<div class="downbar-ad-slot" id="downbar-ad-slot"></div>'
    + '</div>';
}

// ── INJECT ALL NAV SECTIONS ──
// Called on DOMContentLoaded, BEFORE the page's initPage() runs.
// Replaces the 4 placeholder divs with the rendered nav.
function injectNav() {
  const headerMount     = document.getElementById('app-header');
  const sidebarMount    = document.getElementById('app-sidebar');
  const downbarMount    = document.getElementById('app-downbar');
  const downbarMoreMount = document.getElementById('app-downbar-more');

  if (headerMount)      headerMount.outerHTML      = renderHeaderNav();
  if (sidebarMount)     sidebarMount.outerHTML     = renderSidebarNav();
  if (downbarMount)     downbarMount.outerHTML     = renderDownbarNav();
  if (downbarMoreMount) downbarMoreMount.outerHTML = renderDownbarMoreNav();
}

// ── QUICK REPORT (from any page) ──
// Redirects to /feedback with query params that pre-fill the target.
function openQuickReport(targetType, targetId, preview) {
  const params = new URLSearchParams({
    report_type: targetType,
    report_id: targetId,
    preview: preview || ''
  });
  window.location.href = '/feedback?' + params.toString();
}

// ── LOADING SCREEN ──

// Show loading screen
function showLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.style.display = 'flex';
    screen.style.opacity = '1';
    screen.style.visibility = 'visible';
  }
  // Reset error state
  hideLoadingError();
  document.getElementById('loading-retry-btn')?.classList.remove('show');
}

// Hide loading screen - INSTANT (no animation for debugging)
function hideLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.style.display = 'none';
    screen.style.opacity = '0';
    screen.style.visibility = 'hidden';
  }
  _loadingInProgress = false;
}

// Update progress
function updateLoadingProgress(percent, friendly, technical) {
  const fill = document.getElementById('loading-progress-fill');
  const text = document.getElementById('loading-progress-text');
  const friendlyEl = document.getElementById('loading-status-friendly');
  const technicalEl = document.getElementById('loading-status-technical');
  
  if (fill) {
    const clamped = Math.min(100, Math.max(0, percent));
    fill.style.width = clamped + '%';
  }
  
  if (text) {
    text.textContent = Math.min(100, Math.max(0, percent)) + '%';
  }
  
  if (friendlyEl && friendly) {
    friendlyEl.textContent = friendly;
  }
  
  if (technicalEl && technical) {
    technicalEl.textContent = technical;
  }
}

// Define loading steps
function defineLoadingSteps(steps) {
  _loadingSteps = steps;
  _currentStepIndex = 0;
}

// Advance to next loading step
function nextLoadingStep() {
  if (_currentStepIndex < _loadingSteps.length) {
    const step = _loadingSteps[_currentStepIndex];
    const percent = Math.round((_currentStepIndex / _loadingSteps.length) * 100);
    updateLoadingProgress(percent, step.label, step.technical);
    _currentStepIndex++;
    return step;
  }
  return null;
}

// Complete loading (100%)
function completeLoading() {
  updateLoadingProgress(100, 'Done! ✨', 'All systems ready');
  // Hide loading screen after a brief moment
  setTimeout(hideLoadingScreen, 300);
}

// Show loading error
function showLoadingError(friendly, technical) {
  const errorEl = document.getElementById('loading-error');
  const friendlyEl = document.getElementById('loading-error-friendly');
  const technicalEl = document.getElementById('loading-error-technical');
  const retryBtn = document.getElementById('loading-retry-btn');
  
  if (errorEl) {
    errorEl.classList.add('show');
  }
  
  if (friendlyEl) {
    friendlyEl.textContent = friendly || 'Something went wrong';
  }
  
  if (technicalEl) {
    technicalEl.textContent = technical || 'Unknown error';
  }
  
  if (retryBtn) {
    retryBtn.classList.add('show');
  }
  
  // Turn progress bar red
  const fill = document.getElementById('loading-progress-fill');
  if (fill) {
    fill.style.background = 'var(--danger)';
  }
}

// Hide loading error
function hideLoadingError() {
  const errorEl = document.getElementById('loading-error');
  const retryBtn = document.getElementById('loading-retry-btn');
  
  if (errorEl) {
    errorEl.classList.remove('show');
  }
  
  if (retryBtn) {
    retryBtn.classList.remove('show');
  }
  
  // Restore progress bar color
  const fill = document.getElementById('loading-progress-fill');
  if (fill) {
    fill.style.background = 'linear-gradient(90deg, var(--neon), var(--neon2))';
  }
}

// Set retry callback
function setLoadingRetry(callback) {
  _loadingRetryCallback = callback;
}

// Retry loading
function retryLoading() {
  if (typeof _loadingRetryCallback === 'function') {
    hideLoadingError();
    _currentStepIndex = 0;
    _loadingInProgress = true;
    _loadingRetryCallback();
  }
}

// Enable/disable escape key
function setLoadingEscapeEnabled(enabled) {
  _loadingEscapeDisabled = !enabled;
}

// ── TOAST ──
function showToast(msg, type = 'error') {
  const t = document.getElementById('toast');
  if (!t) return;
  
  t.className = 'toast';
  void t.offsetWidth;
  
  t.textContent = msg;
  t.classList.add(type, 'show');
  
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => {
    t.classList.remove('show');
  }, 2800);
}

// ── TIME HELPERS ──
function timeAgo(ts) {
  if (!ts) return 'never';
  const d = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (d < 60) return 'just now';
  if (d < 3600) return Math.floor(d / 60) + 'm ago';
  if (d < 86400) return Math.floor(d / 3600) + 'h ago';
  if (d < 604800) return Math.floor(d / 86400) + 'd ago';
  return Math.floor(d / 604800) + 'w ago';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── ESCAPE HTML ──
function escapeHTML(s) {
  if (!s) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(s).replace(/[&<>"']/g, m => map[m]);
}

// ── DROPDOWN ──
function toggleDropdown() {
  const chip = document.getElementById('profile-chip');
  const dd = document.getElementById('profile-dropdown');
  if (!chip || !dd) return;
  
  const open = dd.classList.contains('open');
  dd.classList.toggle('open', !open);
  chip.classList.toggle('open', !open);
}

// ── LOGOUT ──
async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('cesc_last_post_time');
  window.location.href = 'login.html';
}

// ── FORCE UPDATE ──
// Clears SW caches + reloads the page with fresh assets.
async function forceUpdate() {
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    // Clear all caches
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    showToast('Cleared cache. Reloading…', 'success');
    setTimeout(() => {
      window.location.reload(true);
    }, 600);
  } catch (e) {
    console.error('Force update failed:', e);
    showToast('Update failed — try reloading manually', 'error');
  }
}

// ── SIDEBAR TOGGLE (MOBILE ONLY) ──
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  
  // Only works on mobile
  if (window.innerWidth > 768) return;
  
  // On mobile, use the slide-in/out logic
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
  
  const isOpen = sidebar.classList.contains('open');
  localStorage.setItem('cesc_sidebar_open', isOpen ? 'true' : 'false');
}

// ── SIDEBAR EXPAND TOGGLE (DESKTOP) ──
// Toggles the .expanded class on the sidebar. Persists choice in localStorage.
// Does NOT interfere with the mobile off-canvas sidebar.
function toggleSidebarExpand() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  const isExpanded = sidebar.classList.toggle('expanded');
  localStorage.setItem('cesc_sidebar_expanded', isExpanded ? 'true' : 'false');
}

// Restore the sidebar expanded state on desktop page load.
// Should be called on DOM ready (auto-called at bottom of this file).
function initSidebarExpand() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  // Only apply on desktop — mobile uses the off-canvas drawer
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('expanded');
    return;
  }
  
  const saved = localStorage.getItem('cesc_sidebar_expanded');
  if (saved === 'true') {
    sidebar.classList.add('expanded');
  } else {
    sidebar.classList.remove('expanded');
  }
}

// ── DOWNBAR MORE TOGGLE (MOBILE) ──
function toggleDownbarMore() {
  const more = document.getElementById('downbar-more');
  const overlay = document.getElementById('downbar-overlay');
  
  if (!more) return;
  
  isDownbarMoreOpen = !isDownbarMoreOpen;
  
  if (isDownbarMoreOpen) {
    more.classList.add('open');
    if (overlay) {
      overlay.classList.add('show');
      overlay.style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
  } else {
    more.classList.remove('open');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.style.display = 'none';
    }
    document.body.style.overflow = '';
  }
}

// ── CLOSE DOWNBAR MORE ──
function closeDownbarMore() {
  if (!isDownbarMoreOpen) return;
  
  const more = document.getElementById('downbar-more');
  const overlay = document.getElementById('downbar-overlay');
  
  isDownbarMoreOpen = false;
  more.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.style.display = 'none';
  }
  document.body.style.overflow = '';
}

// ── ONLINE COUNT ──
async function loadOnlineCount() {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { count } = await supabaseClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', cutoff);
    
    const el = document.getElementById('online-count');
    if (el) {
      const prev = el.textContent;
      el.textContent = count ?? '?';
      if (prev !== el.textContent) {
        el.style.transition = 'transform 0.3s';
        el.style.transform = 'scale(1.3)';
        setTimeout(() => { el.style.transform = 'scale(1)'; }, 300);
      }
    }
    
    // Update header online count
    const headerCount = document.querySelector('.online-count-number');
    if (headerCount) headerCount.textContent = count ?? '?';
  } catch (e) {
    console.error('Error loading online count:', e);
  }
}

// ── NOTIFICATION COUNT ──
async function loadNotifCount() {
  if (!session) return;
  try {
    const { count } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .eq('read', false);
    
    const badge = document.getElementById('notif-badge');
    const navBadge = document.getElementById('notif-nav-badge');
    const downbarMoreBadge = document.getElementById('downbar-more-notif-badge');
    
    if (count && count > 0) {
      const label = count > 99 ? '99+' : count;
      if (badge) { badge.textContent = label; badge.classList.add('show'); }
      if (navBadge) { navBadge.textContent = label; navBadge.classList.add('show'); }
      if (downbarMoreBadge) { downbarMoreBadge.textContent = label; downbarMoreBadge.classList.add('show'); }
    } else {
      if (badge) badge.classList.remove('show');
      if (navBadge) navBadge.classList.remove('show');
      if (downbarMoreBadge) downbarMoreBadge.classList.remove('show');
    }
  } catch (e) {
    console.error('Error loading notification count:', e);
  }
}

// ── CHAT UNREAD COUNT (global, across all pages) ──
// Counts how many CONVERSATIONS have unread messages, not total messages.
// Includes: DMs + GCs + Global chat.
// Updates every chat badge in the DOM.
async function loadChatUnreadCount() {
  if (!session) return;
  const myId = session.user.id;

  try {
    // Fetch my conversation memberships with last_read_at + last_message_at
    const { data: members, error } = await supabaseClient
      .from('conversation_members')
      .select(`
        conversation_id,
        last_read_at,
        conversations(
          id, type, slug, last_message_at
        )
      `)
      .eq('user_id', myId);

    if (error || !members) {
      console.error('loadChatUnreadCount:', error);
      return;
    }

    let unreadConvoCount = 0;

    // Identify the global-chat conversation id (uses `messages` table, not gc_messages)
    let globalChatId = null;
    const globalEntry = members.find(m => m.conversations?.slug === 'global-chat');
    if (globalEntry) globalChatId = globalEntry.conversations.id;

    for (const m of members) {
      const c = m.conversations;
      if (!c) continue;

      const lastRead = m.last_read_at || '1970-01-01T00:00:00Z';

      if (c.id === globalChatId) {
        // Global chat: check latest `messages` row directly
        const { data: latestGlobal } = await supabaseClient
          .from('messages')
          .select('created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestGlobal && latestGlobal.user_id !== myId && latestGlobal.created_at > lastRead) {
          unreadConvoCount++;
        }
      } else {
        // DM + GC: use conversations.last_message_at
        if (c.last_message_at && c.last_message_at > lastRead) {
          unreadConvoCount++;
        }
      }
    }

    updateChatBadges(unreadConvoCount);
  } catch (e) {
    console.error('loadChatUnreadCount exception:', e);
  }
}

// Update all chat badges in the DOM
function updateChatBadges(count) {
  const label = count > 99 ? '99+' : (count > 0 ? String(count) : '');
  const els = [
    document.getElementById('chat-nav-badge'),
    document.getElementById('downbar-chat-badge'),
    document.getElementById('downbar-more-chat-badge'),
  ];

  els.forEach(el => {
    if (!el) return;
    if (count > 0) {
      el.textContent = label;
      el.classList.add('show');
    } else {
      el.textContent = '0';
      el.classList.remove('show');
    }
  });
}

// ── CHAT UNREAD REALTIME SUBSCRIPTION ──
// One subscription per page load. Tear down on unload.
let _chatUnreadChannel = null;
let _chatUnreadDebounce = null;

function startChatUnreadRealtime() {
  if (!session) return;
  if (_chatUnreadChannel) return; // already running

  const scheduleRefresh = () => {
    if (_chatUnreadDebounce) clearTimeout(_chatUnreadDebounce);
    _chatUnreadDebounce = setTimeout(() => {
      _chatUnreadDebounce = null;
      loadChatUnreadCount();
    }, 500);
  };

  try {
    _chatUnreadChannel = supabaseClient
      .channel('global-chat-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gc_messages' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, scheduleRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${session.user.id}` }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${session.user.id}` }, scheduleRefresh)
      .subscribe();
  } catch (e) {
    console.error('startChatUnreadRealtime:', e);
  }
}

function stopChatUnreadRealtime() {
  if (_chatUnreadChannel) {
    supabaseClient.removeChannel(_chatUnreadChannel);
    _chatUnreadChannel = null;
  }
  if (_chatUnreadDebounce) {
    clearTimeout(_chatUnreadDebounce);
    _chatUnreadDebounce = null;
  }
}

// ── CEIN BALANCE IN DROPDOWN ──
async function loadCEINBalance() {
  if (!session) return;
  try {
    const { data, error } = await supabaseClient.rpc('get_my_credits');
    if (error || !data || !data.ok) return;

    const el = document.getElementById('dd-cein-balance');
    if (el) {
      el.textContent = data.balance + ' CEIN';
    }
  } catch (e) {
    console.error('loadCEINBalance:', e);
  }
}

// ── DAILY LOGIN CEIN CLAIM ──
// Runs once per page load. Idempotent server-side.
// Only shows a toast on the feed page (so it doesn't spam every page).
async function claimDailyLoginCEIN() {
  if (!session) return;
  try {
    const { data, error } = await supabaseClient.rpc('claim_daily_login');
    if (error) {
      console.error('claim_daily_login error:', error);
      return;
    }

    if (data && data.ok) {
      // Refresh the CEIN balance shown in the dropdown
      await loadCEINBalance();

      // Toast only on the feed page
      const isFeed = window.location.pathname === '/' || window.location.pathname === '/index.html';
      if (isFeed) {
        showToast(`+10 CEIN claimed · ${data.balance} total`, 'success');
      }
    }
    // If already claimed today, stay silent.
  } catch (e) {
    console.error('claimDailyLoginCEIN exception:', e);
  }
}

// ── AVATAR BUILDER ──
function buildAvatar(username, pfpUrl, size = 40, cls = '') {
  const div = document.createElement('div');
  div.className = cls || 'avatar';
  div.style.width = size + 'px';
  div.style.height = size + 'px';
  div.style.flexShrink = '0';
  div.style.position = 'relative';
  div.style.overflow = 'hidden';
  div.style.borderRadius = '50%';
  div.style.background = 'linear-gradient(135deg, var(--neon), var(--neon2))';
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.fontWeight = '800';
  div.style.color = '#000';
  div.style.fontSize = (size * 0.4) + 'px';
  
  const span = document.createElement('span');
  span.textContent = (username?.[0] || '?').toUpperCase();
  span.style.position = 'relative';
  span.style.zIndex = '1';
  div.appendChild(span);
  
  // Resolve the pfp url from cache if not passed in
  const url = pfpUrl || pfpCache[username] || null;
  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = username || 'avatar';
    img.style.position = 'absolute';
    img.style.inset = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'none';
    img.style.borderRadius = '50%';
    img.loading = 'eager';           // ← load immediately (was lazy)
    img.decoding = 'async';
    img.onload = () => {
      img.style.display = 'block';
      span.style.display = 'none';
      img.classList.add('loaded');
    };
    img.onerror = () => {
      img.remove();
      span.style.display = '';
    };
    div.appendChild(img);
  }
  return div;
}

async function loadPfpCache() {
  try {
    const { data } = await supabaseClient.from('profiles').select('username, pfp_url');
    if (data) {
      data.forEach(p => {
        // Cache even null values so we know we checked already
        pfpCache[p.username] = p.pfp_url || null;
      });
    }
  } catch (e) {
    console.error('Error loading PFP cache:', e);
  }
}

// ── AUTH INIT ──
async function initAuth() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    session = data.session;
    if (!session) {
      window.location.href = 'login.html';
      return null;
    }
    return session;
  } catch (e) {
    console.error('Error initializing auth:', e);
    window.location.href = 'login.html';
    return null;
  }
}

async function loadUserProfile() {
  if (!session) return null;
  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id, username, display_name, pfp_url, bio, streak, last_active_date, is_timed_out, timeout_until, roles, onboarding_completed_at, is_private, follower_count, following_count, verified, banner_url, links, pinned_post_id, location, created_at')
      .eq('id', session.user.id)
      .single();
    if (profile) currentUser = profile;
    return profile;
  } catch (e) {
    console.error('Error loading user profile:', e);
    return null;
  }
}

function updateUserUI(profile) {
  if (!profile) return;
  const displayName = profile.display_name || profile.username || 'you';
  const rawName = profile.username || 'you';
  
  const elements = {
    'chip-name': displayName,
    'chip-initial': rawName[0].toUpperCase(),
    'dd-name': displayName,
    'sidebar-user': displayName,
    'compose-name': displayName,
    'compose-initial': rawName[0].toUpperCase(),
    'welcome-name': displayName,
  };
  
  Object.entries(elements).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
  
  if (profile.pfp_url) {
    ['chip-av', 'compose-av'].forEach(id => {
      const av = document.getElementById(id);
      if (!av) return;
      const initial = av.querySelector('span');
      const existingImg = av.querySelector('img');
      if (existingImg) existingImg.remove();
      
      const img = document.createElement('img');
      img.src = profile.pfp_url;
      img.loading = 'lazy';
      img.onload = () => {
        img.style.display = 'block';
        img.classList.add('loaded');
        if (initial) initial.style.display = 'none';
      };
      img.onerror = () => img.remove();
      av.appendChild(img);
    });
  }

    // Streak in dropdown
  const ddStreak = document.getElementById('dd-streak-count');
  if (ddStreak && profile.streak !== undefined) {
    ddStreak.textContent = profile.streak || 0;
  }
}

// ── UPDATE LAST SEEN ──
let _lastSeenUpdate = 0;

async function updateLastSeen() {
  if (!session) return;
  const now = Date.now();
  if (now - _lastSeenUpdate < 10000) return; // Throttle to 10s
  _lastSeenUpdate = now;
  try {
    await supabaseClient
      .from('profiles')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', session.user.id);
  } catch (e) {
    console.error('Error updating last seen:', e);
  }
}

// ── STREAK UPDATE ──
async function updateStreak() {
  if (!session || !currentUser) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = currentUser?.last_active_date;
    let streak = currentUser?.streak || 0;
    let newStreak = null;
    
    if (lastDate !== today) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      newStreak = (lastDate === yest.toISOString().split('T')[0]) ? streak + 1 : 1;
      await supabaseClient
        .from('profiles')
        .update({ streak: newStreak, last_active_date: today })
        .eq('id', session.user.id);
      currentUser.streak = newStreak;
      currentUser.last_active_date = today;
    }

    // Streak milestone bonus — idempotent server-side.
    // Fire only when we just incremented to a milestone.
    const effectiveStreak = newStreak !== null ? newStreak : streak;
    if (effectiveStreak === 7 || effectiveStreak === 30 || effectiveStreak === 100) {
      try {
        const { data } = await supabaseClient.rpc('award_streak_bonus', { p_days: effectiveStreak });
        if (data && data.ok) {
          showToast(`🔥 ${effectiveStreak}-day streak! +${data.amount} CEIN`, 'success');
          await loadCEINBalance();
        }
      } catch (e) {
        console.error('award_streak_bonus failed:', e);
      }
    }
  } catch (e) {
    console.error('Error updating streak:', e);
  }
}

// ── DEBOUNCE ──
function debounce(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── THROTTLE ──
function throttle(fn, limit = 300) {
  let inThrottle = false;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

// ── BACKGROUND TASKS ──
let _backgroundInterval = null;

function startBackgroundTasks() {
  if (_backgroundInterval) return;
  
  // Run immediately
  if (session) {
    updateLastSeen();
    loadOnlineCount();
    loadNotifCount();
    loadCEINBalance();
    loadChatUnreadCount();
    startChatUnreadRealtime();
  }
  
  // Run every 10s
  _backgroundInterval = setInterval(() => {
    if (!session) return;
    updateLastSeen();
    loadOnlineCount();
    loadNotifCount();
    loadChatUnreadCount();
  }, 10000);
}

function stopBackgroundTasks() {
  if (_backgroundInterval) {
    clearInterval(_backgroundInterval);
    _backgroundInterval = null;
  }
}

// ── PAGE INIT WRAPPER ──
async function initPage(pageInitFn) {
  if (_loadingInProgress) return;
  _loadingInProgress = true;
  
  // Show loading screen
  showLoadingScreen();
  
  // Set retry callback
  setLoadingRetry(() => {
    _loadingInProgress = true;
    _currentStepIndex = 0;
    initPage(pageInitFn);
  });
  
  // Enable escape key for debugging
  setLoadingEscapeEnabled(true);
  
  try {
    // Step 1: Theme
    nextLoadingStep();
    if (typeof window.initTheme === 'function') {
      window.initTheme();
    }
    
    // Step 2: Auth
    nextLoadingStep();
    const sess = await initAuth();
    if (!sess) {
      _loadingInProgress = false;
      return;
    }
    
    // Step 3: User Profile
    nextLoadingStep();
    const profile = await loadUserProfile();
    if (profile) {
      updateUserUI(profile);
      // Streak — runs on every page, once per day, silently
      try { await updateStreak(); } catch (e) { console.error('updateStreak failed:', e); }

      // ── TIMEOUT ENFORCEMENT ──
      // Skip the check on /timeout itself to avoid redirect loop
      const isTimeoutPage = window.location.pathname.startsWith('/timeout');
      if (!isTimeoutPage) {
        // Auto-clear expired timeouts (RPC handles both state + timeouts table)
        try {
          await supabaseClient.rpc('check_and_clear_my_timeout');
        } catch (e) {
          console.error('check_and_clear_my_timeout failed:', e);
        }

        // Re-fetch profile (state may have changed)
        const rechecked = await loadUserProfile();

        if (rechecked && rechecked.is_timed_out) {
          // Still timed out → redirect to prison
          _loadingInProgress = false;
          window.location.replace('/timeout');
          return;
        }

        // ── ONBOARDING ENFORCEMENT ──
        // Skip on /onboarding itself (no loop). Skip for owners.
        // Everyone else with onboarding_completed_at = null gets redirected.
        const isOnboardingPage = window.location.pathname.startsWith('/onboarding');
        const userRoles = Array.isArray(rechecked?.roles) ? rechecked.roles : [];
        const isOwnerRole = userRoles.includes('owner');

        if (!isOnboardingPage && !isOwnerRole && !rechecked?.onboarding_completed_at) {
          _loadingInProgress = false;
          window.location.replace('/onboarding');
          return;
        }
      }

      // ── CEIN: DAILY LOGIN CLAIM ──
      // Server-side idempotent. Silent if already claimed.
      try { await claimDailyLoginCEIN(); } catch (e) { console.error('claimDailyLoginCEIN failed:', e); }
    }
    
    // Step 4: PFP Cache
    nextLoadingStep();
    await loadPfpCache();
    
    // Step 5: Page-specific init
    if (typeof pageInitFn === 'function') {
      await pageInitFn();
    }
    
    // Step 6: Background tasks
    nextLoadingStep();
    startBackgroundTasks();
    
    // Step 7: Online & Notifications
    nextLoadingStep();
    await Promise.all([
      loadOnlineCount(),
      loadNotifCount(),
      loadChatUnreadCount()
    ]);

    // ── ADS: load ads + mount slots BEFORE hiding the loading screen ──
    nextLoadingStep(); // extra step for ads
    try {
      if (window.Ads && typeof window.Ads.init === 'function') {
        await window.Ads.init();
      }

      // Loading-screen ad (show while loading is still visible)
      const loadingSlot = document.getElementById('loading-ad-slot');
      if (loadingSlot && window.Ads && typeof window.Ads.mountLoadingSlot === 'function') {
        window.Ads.mountLoadingSlot(loadingSlot);
      }

      // Sidebar ad (all pages with a sidebar)
      const sidebarSlot = document.getElementById('sidebar-ad-slot');
      if (sidebarSlot && window.Ads && typeof window.Ads.mountSidebarSlot === 'function') {
        window.Ads.mountSidebarSlot(sidebarSlot);
      }

      // Downbar more drawer ad (mobile expanded drawer)
      const downbarSlot = document.getElementById('downbar-ad-slot');
      if (downbarSlot && window.Ads && typeof window.Ads.mountDownbarSlot === 'function') {
        window.Ads.mountDownbarSlot(downbarSlot);
      }
    } catch (e) {
      console.log('[Ads init exception]', e);
    }

    // Complete
    nextLoadingStep();
    completeLoading();
    _loadingInProgress = false;

    // ── ADS: re-render ads that depend on the page being ready ──
    try {
      if (window.Ads && typeof window.Ads.reRenderAll === 'function') {
        setTimeout(() => {
          try { window.Ads.reRenderAll(); } catch (e) {}
        }, 200);
      }
    } catch (e) {}

  } catch (error) {
    console.error('Loading error:', error);
    _loadingInProgress = false;
    
    // Show error
    const friendly = error.friendly || 'Something went wrong';
    const technical = error.technical || error.message || 'Unknown error';
    showLoadingError(friendly, technical);
  }
}

// ── CLICK OUTSIDE HANDLER ──
document.addEventListener('click', e => {
  // Close dropdown
  const chip = document.getElementById('profile-chip');
  const dd = document.getElementById('profile-dropdown');
  if (chip && !chip.contains(e.target)) {
    dd?.classList.remove('open');
    chip.classList.remove('open');
  }
  
  // Close sidebar overlay on mobile
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (window.innerWidth <= 768 && 
      sidebar?.classList.contains('open') && 
      overlay?.contains(e.target) &&
      !sidebar.contains(e.target) &&
      !mobileMenu?.contains(e.target)) {
    toggleSidebar();
  }
  
  // Close downbar more when clicking outside
  if (isDownbarMoreOpen) {
    const more = document.getElementById('downbar-more');
    const overlay = document.getElementById('downbar-overlay');
    const moreBtn = document.querySelector('.downbar-item.more-btn');
    
    if (overlay && overlay.contains(e.target) && !moreBtn?.contains(e.target)) {
      closeDownbarMore();
    }
  }
});

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  // ESC key closes downbar more
  if (e.key === 'Escape' && isDownbarMoreOpen) {
    closeDownbarMore();
  }
  
  // ESC key FORCE HIDE loading screen (debug only)
  if (e.key === 'Escape' && _loadingInProgress && !_loadingEscapeDisabled) {
    console.log('🔑 ESC pressed - force hiding loading screen (debug)');
    hideLoadingScreen();
    _loadingInProgress = false;
  }
});

// ── WINDOW RESIZE HANDLER ──
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Close downbar more if open
    if (isDownbarMoreOpen) {
      closeDownbarMore();
    }
    
    // Close mobile sidebar overlay if screen becomes desktop
    if (window.innerWidth > 768) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    }
    
    // Re-apply desktop sidebar expansion state on breakpoint changes
    initSidebarExpand();
  }, 250);
});

// ── EXPOSE EVERYTHING TO WINDOW ──
Object.defineProperty(window, 'session', {
  get: function() { return session; },
  set: function(val) { session = val; }
});

Object.defineProperty(window, 'currentUser', {
  get: function() { return currentUser; },
  set: function(val) { currentUser = val; }
});

window.supabaseClient = supabaseClient;
window.pfpCache = pfpCache;
window.showToast = showToast;
window.timeAgo = timeAgo;
window.formatTime = formatTime;
window.formatDate = formatDate;
window.escapeHTML = escapeHTML;
window.toggleDropdown = toggleDropdown;
window.logout = logout;
window.forceUpdate = forceUpdate;
window.toggleSidebar = toggleSidebar;
window.toggleSidebarExpand = toggleSidebarExpand;
window.injectNav = injectNav;
window.getActivePageKey = getActivePageKey;
window.toggleDownbarMore = toggleDownbarMore;
window.closeDownbarMore = closeDownbarMore;
window.loadChatUnreadCount = loadChatUnreadCount;
window.updateChatBadges = updateChatBadges;
window.startChatUnreadRealtime = startChatUnreadRealtime;
window.stopChatUnreadRealtime = stopChatUnreadRealtime;
window.loadCEINBalance = loadCEINBalance;
window.claimDailyLoginCEIN = claimDailyLoginCEIN;
window.buildAvatar = buildAvatar;
window.loadPfpCache = loadPfpCache;
window.initAuth = initAuth;
window.loadUserProfile = loadUserProfile;
window.updateUserUI = updateUserUI;
window.updateLastSeen = updateLastSeen;
window.updateStreak = updateStreak;
window.debounce = debounce;
window.throttle = throttle;
window.startBackgroundTasks = startBackgroundTasks;
window.stopBackgroundTasks = stopBackgroundTasks;
window.initPage = initPage;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.updateLoadingProgress = updateLoadingProgress;
window.defineLoadingSteps = defineLoadingSteps;
window.nextLoadingStep = nextLoadingStep;
window.completeLoading = completeLoading;
window.showLoadingError = showLoadingError;
window.hideLoadingError = hideLoadingError;
window.setLoadingRetry = setLoadingRetry;
window.retryLoading = retryLoading;
window.setLoadingEscapeEnabled = setLoadingEscapeEnabled;
window.openQuickReport = openQuickReport;

// ── AUTO-INIT: INJECT NAV + SIDEBAR EXPANSION ──
function _autoInitOnReady() {
  if (typeof injectNav === 'function') injectNav();
  if (typeof initSidebarExpand === 'function') initSidebarExpand();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _autoInitOnReady);
} else {
  _autoInitOnReady();
}

// ── CLEANUP ON UNLOAD ──
window.addEventListener('beforeunload', () => {
  stopChatUnreadRealtime();
});

console.log('✅ shared.js loaded successfully!');
console.log('🔑 Session:', session ? 'Logged in' : 'Not logged in');