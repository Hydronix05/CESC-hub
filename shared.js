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
  
  const url = pfpUrl || pfpCache[username];
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
        if (p.pfp_url) pfpCache[p.username] = p.pfp_url;
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
      .select('username, display_name, pfp_url, bio, streak, last_active_date')
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
      img.onload = () => {
        img.style.display = 'block';
        img.classList.add('loaded');
        if (initial) initial.style.display = 'none';
      };
      img.onerror = () => img.remove();
      av.appendChild(img);
    });
  }
}

// ── UPDATE LAST SEEN ──
async function updateLastSeen() {
  if (!session) return;
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
    
    if (lastDate !== today) {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      streak = (lastDate === yest.toISOString().split('T')[0]) ? streak + 1 : 1;
      await supabaseClient
        .from('profiles')
        .update({ streak, last_active_date: today })
        .eq('id', session.user.id);
      currentUser.streak = streak;
      currentUser.last_active_date = today;
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
  }, 250);
});

// ── EXPOSE EVERYTHING TO WINDOW ──
// Use getters so they always return the current value
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
window.toggleSidebar = toggleSidebar;
window.toggleDownbarMore = toggleDownbarMore;
window.closeDownbarMore = closeDownbarMore;
window.loadOnlineCount = loadOnlineCount;
window.loadNotifCount = loadNotifCount;
window.buildAvatar = buildAvatar;
window.loadPfpCache = loadPfpCache;
window.initAuth = initAuth;
window.loadUserProfile = loadUserProfile;
window.updateUserUI = updateUserUI;
window.updateLastSeen = updateLastSeen;
window.updateStreak = updateStreak;
window.debounce = debounce;
window.throttle = throttle;

console.log('✅ shared.js loaded successfully!');
console.log('🔑 Session:', session ? 'Logged in' : 'Not logged in');