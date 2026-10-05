/* ═══════════════════════════════════════════════════════════
   CESC HUB — CHAT LOGIC (Phase 1.7)
   Inbox + Global + DMs + Groups + Notes + Receipts + Presence
   ═══════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════
// ── CONSTANTS ──
// ═══════════════════════════════════════════════════════════
const MAX_IMAGE_SIZE = 500 * 1024;
const EDIT_WINDOW_MINUTES = 15;
const LAYOUT_KEY = 'cesc_chat_layout';
const MENTION_SPAM_WINDOW_MS = 60 * 1000;
const MENTION_SPAM_KEY = 'cesc_mention_spam';
const LONG_PRESS_MS = 500;
const GLOBAL_CHAT_SLUG = 'global-chat';
const NOTE_MAX_LEN = 60;
const ONLINE_THRESHOLD_MS = 90 * 1000;
const ACTIVE_STATUS_TICK_MS = 30 * 1000;
const NEAR_BOTTOM_THRESHOLD_PX = 120;

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😜','😝','😛','🤑','🤪','😋','😇','🤗',
  '🤩','🥳','😎','🤓','🧐','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩',
  '🥺','😢','😭','😤','🔥','✨','⭐','🌟','💫','❤️','🧡','💛','💚','💙','💜','🖤',
  '💔','💕','💞','💗','💖','💘','💝','🎉','🎊','🎈','🎁','💪','🫶','🤝','👏','🙌',
  '🤘','🖐️','🌺','🌸','🌷','🌹','🌻','🌼','🌿','☘️','🍀','🌴','🌳','🌲','🍂','🍁',
  '🍃','🌵','🌊','🌅','🌄','🌈','🍕','🍔','🌮','🌯','🥗','🍣','🍱','🍜','🍲','🍛',
  '🍦','🍩','🍪','🎂','🧁','☕','🍵','🍺','🍻','🥂','⚽','🏀','🏈','⚾','🎾','🏐',
  '🏉','🎱','🏓','🏸','🎮','🎯','🎳','🎤','🎧','🎼','🎹','🥁','🎺','🎸','📱','💻',
  '⌨️','🖥️','📷','📸','📹','🎬','📺','🎵','📚','📖','✏️','📝','📌','📍','🔗','📎'
];

// ═══════════════════════════════════════════════════════════
// ── STATE ──
// ═══════════════════════════════════════════════════════════
let username = 'user';
let myUserId = null;
let currentDisplayName = '';
let myPfpUrl = null;

let activeChat = null;
let activeChannel = null;
let inboxChannel = null;
let profilesChannel = null;
let activeStatusTicker = null;

let replyTo = null;
let editingId = null;
let editingMsgCreatedAt = null;
let editingImageUrl = null;
let pendingImageFile = null;
let isUploading = false;

let emojiPickerInitialized = false;
let mentionPanelOpen = false;
let mentionMatches = [];
let mentionSelectedIndex = 0;
let mentionQueryStart = -1;
let contextMenuOpen = false;
let longPressTimer = null;
let longPressStartPos = null;

let chatLayout = 'meta';

let notificationPermission = false;
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 3000;
let pendingNotificationCount = 0;
let pendingNotificationSender = null;
let notificationTimeout = null;
let unreadCount = 0;
let isPageVisible = true;

let badWords = [];

let conversationsCache = [];
let profilesIndex = {};
let currentSearchQuery = '';

// Notes
let notesCache = [];
let notesChannel = null;
let currentViewingNote = null;

// Ads (chat)
let currentChatAd = null;          // the ad shown as the pseudo-DM row
let currentInboxBottomAd = null;   // the ad shown in the inbox bottom slot
let chatAdRefreshTimer = null;     // rotates pseudo-DM every ROTATE_MS
let preAdActiveChat = null;        // remember the chat that was open before ad view
let currentChatAdSlot = null;      // cached slot index (2-4) so the ad doesn't jump
let currentChatAdSignature = null; // signature of the last rendered ad (id + slot)

// ═══════════════════════════════════════════════════════════
// ── UTILITIES ──
// ═══════════════════════════════════════════════════════════
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function fmtDate(ts) {
  const d = new Date(ts), today = new Date(), yesterday = new Date();
  yesterday.setDate(yesterday.getDate()-1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month:'long', day:'numeric', year:'numeric' });
}
function fmtRelativeShort(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return diffMin + 'm';
  if (diffHr < 24) return diffHr + 'h';
  if (diffDay < 7) return diffDay + 'd';
  return d.toLocaleDateString([], { month:'short', day:'numeric' });
}
function timeAgoShort(ts) {
  if (!ts) return 'never';
  const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  const m = Math.floor(diffSec / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  const w = Math.floor(d / 7);
  if (w < 4) return w + 'w ago';
  return new Date(ts).toLocaleDateString([], { month:'short', day:'numeric' });
}
function canEditMessage(createdAt) {
  const diffMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  return diffMin <= EDIT_WINDOW_MINUTES;
}
function dmSlug(a, b) {
  const x = String(a).toLowerCase();
  const y = String(b).toLowerCase();
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}
function dmSlugForMe(otherUsername) {
  return dmSlug(username, otherUsername);
}
function resolveDMOther(convo) {
  if (!convo) return null;
  const my = username.toLowerCase();
  const a = (convo.dm_user_a || '').toLowerCase();
  const b = (convo.dm_user_b || '').toLowerCase();
  if (a && b) return (a === my) ? b : a;
  const parts = (convo.slug || '').split('_');
  return parts.find(p => p !== my) || null;
}
function isUserOnline(uname) {
  if (uname === username) return true;
  const p = profilesIndex[uname];
  if (!p || !p.last_seen) return false;
  return (Date.now() - new Date(p.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
}

// ═══════════════════════════════════════════════════════════
// ── LOADING STEPS ──
// ═══════════════════════════════════════════════════════════
function definePageSteps() {
  defineLoadingSteps([
    { id: 'theme', label: 'Loading theme...', technical: 'Applying saved theme preferences' },
    { id: 'auth', label: 'Connecting...', technical: 'Checking authentication' },
    { id: 'profile', label: 'Loading your profile...', technical: 'Fetching user data' },
    { id: 'pfp', label: 'Loading profile pictures...', technical: 'Caching avatars' },
    { id: 'inbox', label: 'Loading conversations...', technical: 'Fetching chats' },
    { id: 'online', label: 'Loading online users...', technical: 'Counting active users' },
    { id: 'notifs', label: 'Loading notifications...', technical: 'Checking unread count' },
    { id: 'ready', label: 'Ready! ✨', technical: 'Chat ready' }
  ]);
}

// ═══════════════════════════════════════════════════════════
// ── BAD WORD FILTER ──
// ═══════════════════════════════════════════════════════════
async function loadBadWords() {
  try {
    const res = await fetch('/badwords.json', { cache: 'no-cache' });
    if (!res.ok) { badWords = []; return; }
    const data = await res.json();
    if (Array.isArray(data?.words)) {
      badWords = data.words
        .filter(w => typeof w === 'string' && w.trim().length > 0)
        .map(w => w.toLowerCase().trim());
    }
  } catch { badWords = []; }
}
function maskBadWords(text) {
  if (!badWords.length || !text) return text;
  let result = text;
  for (const word of badWords) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    result = result.replace(re, m => '*'.repeat(m.length));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// ── LAYOUT ──
// ═══════════════════════════════════════════════════════════
function loadChatLayout() {
  const saved = localStorage.getItem(LAYOUT_KEY);
  if (saved === 'discord' || saved === 'meta') {
    chatLayout = saved;
  } else {
    chatLayout = window.innerWidth >= 900 ? 'discord' : 'meta';
    localStorage.setItem(LAYOUT_KEY, chatLayout);
  }
  applyChatLayout();
}
function applyChatLayout() {
  const wrapper = document.getElementById('chat-wrapper');
  if (!wrapper) return;
  wrapper.classList.remove('discord-layout', 'meta-layout');
  wrapper.classList.add(chatLayout + '-layout');
}

// ═══════════════════════════════════════════════════════════
// ── MOBILE VIEW TOGGLE + FULL-SCREEN ──
// ═══════════════════════════════════════════════════════════
function setMobileView(view) {
  const shell = document.getElementById('chat-shell');
  if (!shell) return;
  if (view === 'chat') {
    shell.classList.add('view-chat');
    document.body.classList.add('chat-open');
  } else {
    shell.classList.remove('view-chat');
    document.body.classList.remove('chat-open');
  }
}

// ═══════════════════════════════════════════════════════════
// ── ROUTER ──
// ═══════════════════════════════════════════════════════════
function parseChatRoute() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('c');
  if (q) return decodeURIComponent(q);
  const m = window.location.pathname.match(/^\/chat\/(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  return null;
}
function pushUrl(slug) {
  const newPath = slug ? `/chat/${encodeURIComponent(slug)}` : '/chat';
  if (window.location.pathname + window.location.search !== newPath) {
    history.pushState({ slug }, '', newPath);
  }
}
async function navigateTo(slug, hintUsername) {
  await openChatBySlug(slug, hintUsername);
}
window.addEventListener('popstate', () => {
  const slug = parseChatRoute();
  if (slug) openChatBySlug(slug);
  else closeChat();
});

// ═══════════════════════════════════════════════════════════
// ── DATA LOADING ──
// ═══════════════════════════════════════════════════════════
async function loadProfilesIndex() {
  const { data, error } = await window.supabaseClient
    .from('profiles')
    .select('id, username, display_name, pfp_url, last_seen');
  if (error) return;
  profilesIndex = {};
  data.forEach(p => { profilesIndex[p.username] = p; });
}

async function loadConversations() {
  const { data: members, error: memErr } = await window.supabaseClient
    .from('conversation_members')
    .select(`
      conversation_id,
      last_read_at,
      nickname,
      conversations(
        id, type, slug, name, pfp_url,
        dm_user_a, dm_user_b,
        member_count, message_count, last_message_at
      )
    `)
    .eq('user_id', myUserId);

  if (memErr) { console.error(memErr); return; }
  if (!members || members.length === 0) { conversationsCache = []; return; }

  // ── Build initial convo objects + collect IDs ──
  const convos = [];
  const dmIds = [];
  const gcIds = [];
  const lastReadMap = {};

  for (const m of members) {
    const c = m.conversations;
    if (!c) continue;

    lastReadMap[c.id] = m.last_read_at || '1970-01-01';

    let otherUsername = null;
    let otherProfile = null;
    let displayName = c.name || 'Conversation';
    let pfpUrl = c.pfp_url || null;

    if (c.type === 'dm') {
      otherUsername = resolveDMOther(c);
      otherProfile = otherUsername ? (profilesIndex[otherUsername] || null) : null;
      displayName = otherProfile?.display_name || otherProfile?.username || otherUsername || 'Unknown';
      pfpUrl = otherProfile?.pfp_url || null;
      dmIds.push(c.id);
    } else {
      gcIds.push(c.id);
    }

    convos.push({
      id: c.id,
      slug: c.slug,
      type: c.type,
      otherUsername,
      otherProfile,
      displayName,
      pfpUrl,
      lastMessage: null,
      lastAt: c.last_message_at || null,
      unread: 0,
      memberCount: c.member_count || 0,
    });
  }

  // ── Batch fetch: last messages + unread counts ──
  const allIds = [...dmIds, ...gcIds];
  if (allIds.length === 0) { conversationsCache = convos; return; }

  const convoMap = {};
  convos.forEach(c => { convoMap[c.id] = c; });

  // Fetch recent messages for all conversations in parallel (last 30 per convo)
  const fetches = [];
  if (dmIds.length > 0) {
    fetches.push(
      window.supabaseClient
        .from('dm_messages')
        .select('conversation_id, content, username, display_name, image_url, created_at, user_id')
        .in('conversation_id', dmIds)
        .order('created_at', { ascending: false })
        .limit(150)
    );
  }
  if (gcIds.length > 0) {
    fetches.push(
      window.supabaseClient
        .from('gc_messages')
        .select('conversation_id, content, username, display_name, image_url, created_at, user_id')
        .in('conversation_id', gcIds)
        .order('created_at', { ascending: false })
        .limit(150)
    );
  }

  const results = await Promise.all(fetches);

  // Group messages by conversation
  const grouped = {};
  results.forEach(res => {
    (res.data || []).forEach(msg => {
      const cid = msg.conversation_id;
      if (!grouped[cid]) grouped[cid] = [];
      grouped[cid].push(msg);
    });
  });

  // Assign last message + unread count per convo
  Object.keys(grouped).forEach(cid => {
    const msgs = grouped[cid];
    if (!msgs || msgs.length === 0) return;
    const lastRead = lastReadMap[cid] || '1970-01-01';
    const last = msgs[0];
    const convo = convoMap[cid];
    if (!convo) return;

    convo.lastMessage = {
      content: last.content,
      username: last.username,
      display_name: last.display_name,
      image_url: last.image_url,
      created_at: last.created_at,
    };
    convo.lastAt = last.created_at;
    convo.unread = msgs.filter(m =>
      m.user_id !== myUserId && m.created_at > lastRead
    ).length;
  });

  // Sort: newest message first
  convos.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return new Date(b.lastAt) - new Date(a.lastAt);
  });

  conversationsCache = convos;
}

// ═══════════════════════════════════════════════════════════
// ── NOTES ──
// ═══════════════════════════════════════════════════════════
async function loadNotes() {
  try { window.supabaseClient.rpc('cleanup_expired_notes').then(() => {}, () => {}); } catch {}

  const { data, error } = await window.supabaseClient
    .from('notes')
    .select('id, user_id, username, display_name, pfp_url, content, created_at, expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadNotes:', error);
    notesCache = [];
    return;
  }
  notesCache = data || [];
  renderNotesRow();
}

function renderNotesRow() {
  const row = document.getElementById('notes-row');
  if (!row) return;

  row.innerHTML = '';

  const noteByUser = {};
  notesCache.forEach(n => { noteByUser[n.username] = n; });

  const myNote = noteByUser[username];

  const ownCard = buildNoteCard({
    username,
    display_name: currentDisplayName,
    pfp_url: myPfpUrl,
    content: myNote ? myNote.content : null,
    isOwn: true,
    isOnline: true,
    onClick: () => {
      if (myNote) {
        currentViewingNote = myNote;
        openNoteViewModal(myNote);
      } else {
        openNoteComposeModal();
      }
    }
  });
  row.appendChild(ownCard);

  const others = Object.values(noteByUser).filter(n => n.username !== username);

  others.sort((a, b) => {
    const aOnline = isUserOnline(a.username);
    const bOnline = isUserOnline(b.username);
    if (aOnline !== bOnline) return aOnline ? -1 : 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  others.forEach(n => {
    const card = buildNoteCard({
      username: n.username,
      display_name: n.display_name || n.username,
      pfp_url: n.pfp_url,
      content: n.content,
      isOwn: false,
      isOnline: isUserOnline(n.username),
      onClick: () => {
        currentViewingNote = n;
        openNoteViewModal(n);
      }
    });
    row.appendChild(card);
  });

  if (row.children.length === 0) row.classList.add('empty');
  else row.classList.remove('empty');
}

function buildNoteCard(opts) {
  const card = document.createElement('div');
  card.className = 'note-card' + (opts.isOwn ? ' own' : '');

  if (opts.content) {
    const bubble = document.createElement('div');
    bubble.className = 'note-bubble';

    // Show the user's content as-is.
    // Real newlines (from Enter) are preserved via CSS white-space: pre-wrap.
    // Visual truncation to ~3 lines + trailing … is handled by CSS line-clamp.
    // No character-cutting here — advertisers/authors always see the full text
    // when they open the note in the modal.
    const text = String(opts.content);

    // Render each real newline as a <br> so it works even if CSS
    // white-space is overridden somewhere.
    bubble.innerHTML = text
      .split('\n')
      .map(l => window.escapeHTML(l))
      .join('<br>');

    card.appendChild(bubble);
  }

  const wrap = document.createElement('div');
  wrap.className = 'note-avatar-wrap';

  const av = document.createElement('div');
  av.className = 'note-avatar';
  const span = document.createElement('span');
  span.textContent = (opts.username?.[0] || '?').toUpperCase();
  av.appendChild(span);
  if (opts.pfp_url) {
    const img = document.createElement('img');
    img.src = opts.pfp_url;
    img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
    img.onerror = () => img.remove();
    av.appendChild(img);
  }
  wrap.appendChild(av);

  if (opts.isOwn && !opts.content) {
    const badge = document.createElement('div');
    badge.className = 'note-add-badge';
    badge.innerHTML = '<i class="fas fa-plus"></i>';
    wrap.appendChild(badge);
  }

  if (opts.isOnline) {
    const dot = document.createElement('div');
    dot.className = 'note-online-dot';
    wrap.appendChild(dot);
  }

  card.appendChild(wrap);

  const name = document.createElement('div');
  name.className = 'note-name';
  name.textContent = opts.isOwn ? 'Your note' : (opts.display_name || opts.username);
  card.appendChild(name);

  card.onclick = opts.onClick;
  return card;
}

// ═══════════════════════════════════════════════════════════
// ── NOTE MODAL ──
// ═══════════════════════════════════════════════════════════
window.openNoteComposeModal = function() {
  const overlay = document.getElementById('note-modal');
  const compose = document.getElementById('note-modal-compose');
  const view = document.getElementById('note-modal-view');
  if (!overlay || !compose || !view) return;

  const existing = notesCache.find(n => n.username === username);
  const input = document.getElementById('note-input');
  if (input) {
    input.value = existing ? existing.content : '';
    updateNoteCharCount();
  }
  document.getElementById('note-post-btn').textContent = existing ? 'Update Note' : 'Post Note';

  compose.style.display = 'block';
  view.style.display = 'none';
  overlay.classList.add('show');
  if (input) setTimeout(() => input.focus(), 100);
};

function openNoteViewModal(note) {
  const overlay = document.getElementById('note-modal');
  const compose = document.getElementById('note-modal-compose');
  const view = document.getElementById('note-modal-view');
  if (!overlay || !compose || !view) return;

  const av = document.getElementById('note-view-avatar');
  av.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = (note.username?.[0] || '?').toUpperCase();
  av.appendChild(span);
  if (note.pfp_url) {
    const img = document.createElement('img');
    img.src = note.pfp_url;
    img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
    img.onerror = () => img.remove();
    av.appendChild(img);
  }

  document.getElementById('note-view-name').textContent = note.display_name || note.username;
  document.getElementById('note-view-username').textContent = '@' + note.username;
  const contentEl = document.getElementById('note-view-content');
  contentEl.innerHTML = String(note.content)
    .split('\n')
    .map(line => window.escapeHTML(line))
    .join('<br>');
  document.getElementById('note-view-time').textContent = timeAgoShort(note.created_at);

  const delBtn = document.getElementById('note-view-delete');
  if (note.username === username) {
    delBtn.style.display = 'inline-block';
  } else {
    delBtn.style.display = 'none';
  }

  compose.style.display = 'none';
  view.style.display = 'flex';
  overlay.classList.add('show');
};

window.closeNoteModal = function(e) {
  if (e && e.target && e.target.id !== 'note-modal') return;
  const overlay = document.getElementById('note-modal');
  if (overlay) overlay.classList.remove('show');
  currentViewingNote = null;
};

function updateNoteCharCount() {
  const input = document.getElementById('note-input');
  const count = document.getElementById('note-char-count');
  if (!input || !count) return;
  const len = input.value.length;
  count.textContent = len;
  count.parentElement.classList.remove('near', 'full');
  if (len >= NOTE_MAX_LEN) count.parentElement.classList.add('full');
  else if (len > NOTE_MAX_LEN - 10) count.parentElement.classList.add('near');
}

window.submitNote = async function() {
  const input = document.getElementById('note-input');
  if (!input) return;
  const content = input.value.trim();
  if (!content) {
    window.showToast('Write something first 💀', 'error');
    return;
  }
  if (content.length > NOTE_MAX_LEN) {
    window.showToast(`Max ${NOTE_MAX_LEN} characters`, 'error');
    return;
  }

  const btn = document.getElementById('note-post-btn');
  btn.disabled = true;
  btn.textContent = 'Posting...';

  const { error } = await window.supabaseClient
    .from('notes')
    .insert({
      user_id: myUserId,
      username,
      display_name: currentDisplayName,
      pfp_url: myPfpUrl,
      content,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

  btn.disabled = false;
  btn.textContent = 'Post Note';

  if (error) {
    window.showToast('Failed: ' + error.message, 'error');
    return;
  }

  window.closeNoteModal();
  window.showToast('Note posted ✨', 'success');
  await loadNotes();
};

window.deleteMyNote = async function() {
  if (!currentViewingNote || currentViewingNote.username !== username) return;
  if (!confirm('Delete your note?')) return;
  const { error } = await window.supabaseClient
    .from('notes')
    .delete()
    .eq('id', currentViewingNote.id);
  if (error) {
    window.showToast('Delete failed: ' + error.message, 'error');
    return;
  }
  window.closeNoteModal();
  window.showToast('Note deleted', 'success');
  await loadNotes();
};

function setupNotesRealtime() {
  if (notesChannel) window.supabaseClient.removeChannel(notesChannel);
  notesChannel = window.supabaseClient.channel('notes-watch')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
      clearTimeout(window._notesRefreshTimeout);
      window._notesRefreshTimeout = setTimeout(loadNotes, 300);
    })
    .subscribe();
}

// ═══════════════════════════════════════════════════════════
// ── PROFILES REALTIME (online status) ──
// ═══════════════════════════════════════════════════════════
function setupProfilesRealtime() {
  if (profilesChannel) window.supabaseClient.removeChannel(profilesChannel);

  profilesChannel = window.supabaseClient.channel('profiles-watch')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
      const p = payload.new;
      if (!p || !p.username) return;

      if (profilesIndex[p.username]) {
        profilesIndex[p.username].last_seen = p.last_seen;
        if (p.pfp_url) profilesIndex[p.username].pfp_url = p.pfp_url;
        if (p.display_name) profilesIndex[p.username].display_name = p.display_name;
      } else {
        profilesIndex[p.username] = {
          username: p.username,
          display_name: p.display_name,
          pfp_url: p.pfp_url,
          last_seen: p.last_seen,
        };
      }

      // ── Update the online dot IN-PLACE instead of rebuilding the inbox ──
      // Rebuilding tears down every <img> and forces a re-decode → flicker.
      // We only need to refresh the visual online indicator.
      updateInboxPresenceDots();

      if (activeChat && activeChat.otherUsername === p.username) {
        updateActiveStatusLine(p.username);
      }

      // Notes row also rebuilt every profile update — only if the notes
      // list actually changed. Simplest: only re-render if the pfp cache
      // would change. For now, skip — notes auto-refresh on their own timer.
      // renderNotesRow();
    })
    .subscribe();
}

// Lightweight: iterate through inbox rows and flip the online dot
// based on the latest `last_seen` in profilesIndex. No DOM rebuild.
function updateInboxPresenceDots() {
  const list = document.getElementById('inbox-list');
  if (!list) return;

  list.querySelectorAll('.inbox-row').forEach(row => {
    // Skip ad rows
    if (row.classList.contains('inbox-row-ad')) return;

    const avatar = row.querySelector('.inbox-row-avatar');
    if (!avatar) return;

    // Figure out which username this row corresponds to
    // (stored as data-username on the row when it was built)
    const uname = row.dataset.username;
    if (!uname) return;

    const isOnline = isUserOnline(uname);
    const existingDot = avatar.querySelector('.active-dot');

    if (isOnline && !existingDot) {
      const dot = document.createElement('div');
      dot.className = 'active-dot';
      avatar.appendChild(dot);
    } else if (!isOnline && existingDot) {
      existingDot.remove();
    }
  });
}

// ═══════════════════════════════════════════════════════════
// ── ACTIVE STATUS TICKER + LINE UPDATER ──
// ═══════════════════════════════════════════════════════════
function updateActiveStatusLine(uname) {
  if (!activeChat || activeChat.type !== 'dm') return;
  if (activeChat.otherUsername !== uname) return;

  const subEl = document.getElementById('chat-head-sub');
  const av = document.getElementById('chat-head-avatar');
  if (!subEl) return;

  const isOnline = isUserOnline(uname);

  if (isOnline) {
    subEl.textContent = 'Active now';
    subEl.classList.add('active-now');
  } else {
    const lastSeen = profilesIndex[uname]?.last_seen;
    subEl.textContent = 'Active ' + timeAgoShort(lastSeen);
    subEl.classList.remove('active-now');
  }

  if (av) {
    const existingDot = av.querySelector('.active-dot');
    if (isOnline && !existingDot) {
      const dot = document.createElement('div');
      dot.className = 'active-dot';
      av.appendChild(dot);
    } else if (!isOnline && existingDot) {
      existingDot.remove();
    }
  }
}

function startActiveStatusTicker() {
  stopActiveStatusTicker();
  activeStatusTicker = setInterval(() => {
    if (!activeChat || activeChat.type !== 'dm' || !activeChat.otherUsername) return;
    updateActiveStatusLine(activeChat.otherUsername);
  }, ACTIVE_STATUS_TICK_MS);
}

function stopActiveStatusTicker() {
  if (activeStatusTicker) {
    clearInterval(activeStatusTicker);
    activeStatusTicker = null;
  }
}

// ═══════════════════════════════════════════════════════════
// ── INBOX RENDERING ──
// ═══════════════════════════════════════════════════════════
function renderInbox() {
  const list = document.getElementById('inbox-list');
  if (!list) return;

  if (currentSearchQuery.trim()) {
    renderSearchResults(list, currentSearchQuery.trim());
    return;
  }

  list.innerHTML = '';

  list.appendChild(buildInboxRow({
    kind: 'global',
    name: 'Global Chat',
    sub: 'Everyone in CESC',
    avatarType: 'global',
    active: activeChat && activeChat.type === 'global'
  }));

  if (conversationsCache.length > 0) {
    const label = document.createElement('div');
    label.className = 'inbox-section-label';
    label.textContent = 'Conversations';
    list.appendChild(label);
  }

  if (conversationsCache.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inbox-empty';
    empty.innerHTML = `<span class="big">💬</span>No conversations yet.<br>Search someone to start one.`;
    list.appendChild(empty);
    return;
  }

  conversationsCache.forEach(c => {
    const previewText = buildPreviewText(c.lastMessage);
    const isGroup = c.type === 'group';
    const row = buildInboxRow({
      kind: c.type,
      slug: c.slug,
      name: c.displayName,
      sub: previewText,
      avatarType: isGroup ? 'group' : 'user',
      avatarUser: isGroup ? { username: c.slug, pfp_url: c.pfpUrl } : (c.otherProfile || { username: c.otherUsername }),
      time: c.lastAt,
      unread: c.unread,
      active: activeChat && activeChat.slug === c.slug,
      isGroup,
      conversation: c
    });
    list.appendChild(row);
  });

  // ── Inject the pseudo-DM ad row (slots 2-4) ──
  maybeInjectChatAdRow(list);

  // ── Append persistent bottom ad INSIDE the scroll list ──
  maybeInjectBottomAd(list);
}

// Append the persistent bottom-of-inbox ad INSIDE the scrollable list.
// Rendered as a normal inbox row (no card look) so it scrolls with DMs.
function maybeInjectBottomAd(list) {
  if (!list) return;
  if (!window.Ads || !window.Ads.getCached) return;
  const ads = window.Ads.getCached() || [];
  if (ads.length === 0) return;

  // ── If the bottom ad is already in the DOM, leave it alone ──
  const existingBottom = list.querySelector('.inbox-row-bottom-ad');
  if (existingBottom && currentInboxBottomAd) {
    const existingId = existingBottom.dataset.adId;
    if (existingId === currentInboxBottomAd.id) {
      return;
    }
  }

  // Pick an ad for the 'inbox' placement (different from the pseudo-DM if possible)
  const excludeIds = currentChatAd ? [currentChatAd.id] : [];
  let ad = null;
  if (typeof window.Ads.pickWeightedAd === 'function') {
    ad = window.Ads.pickWeightedAd(ads.filter(a => {
      const p = a.placements || [];
      return Array.isArray(p) && p.includes('inbox') && !excludeIds.includes(a.id);
    }));
  }
  // Fallback if none matched: pick any inbox ad
  if (!ad && typeof window.Ads.pickWeightedAd === 'function') {
    ad = window.Ads.pickWeightedAd(ads.filter(a => {
      const p = a.placements || [];
      return Array.isArray(p) && p.includes('inbox');
    }));
  }
  if (!ad) return;

  currentInboxBottomAd = ad;

  // Build as a compact inbox row (same look as a DM row)
  const row = document.createElement('div');
  row.className = 'inbox-row inbox-row-ad inbox-row-bottom-ad';
  row.dataset.adId = ad.id;

  // Match the pseudo-DM row style: use the ad's square image as the avatar
  // and the ad TITLE as the name — no advertiser duplication.
  const rowTitle = ad.title || ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
  const rowAvatarUrl =
    ad.image_square_url ||
    ad.advertiser_pfp_url ||
    ad.image_wide_url ||
    (window.pfpCache && ad.advertiser_username ? window.pfpCache[ad.advertiser_username] : null);

  const av = document.createElement('div');
  av.className = 'inbox-row-avatar';
  const span = document.createElement('span');
  span.textContent = (rowTitle[0] || '?').toUpperCase();
  av.appendChild(span);
  if (rowAvatarUrl) {
    const img = document.createElement('img');
    img.src = rowAvatarUrl;
    img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
    img.onerror = () => img.remove();
    av.appendChild(img);
  }
  row.appendChild(av);

  const body = document.createElement('div');
  body.className = 'inbox-row-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'inbox-row-name';
  nameEl.textContent = rowTitle;
  const preview = document.createElement('div');
  preview.className = 'inbox-row-preview';
  preview.innerHTML = `${window.escapeHTML(ad.advertiser_display_name || ad.advertiser_username || 'Sponsored')} <span style="color:var(--neon);font-weight:600">· Ad</span>`;
  body.appendChild(nameEl);
  body.appendChild(preview);
  row.appendChild(body);

  const meta = document.createElement('div');
  meta.className = 'inbox-row-meta';
  meta.innerHTML = '<div class="ad-badge-inline">Ad</div>';
  row.appendChild(meta);

  row.addEventListener('click', (e) => {
    e.stopPropagation();
    openChatAdView(ad);
  });

  list.appendChild(row);
}

function buildPreviewText(lastMessage) {
  if (!lastMessage) return 'No messages yet';
  const isMine = lastMessage.username === username;
  let body = lastMessage.content || '';
  if (!body && lastMessage.image_url) body = '📷 Photo';
  if (body === '📷') body = '📷 Photo';
  const masked = maskBadWords(body);
  return isMine ? `<span class="preview-you">You: </span>${window.escapeHTML(masked)}` : masked;
}

function buildInboxRow(opts) {
  const row = document.createElement('div');
  row.className = 'inbox-row' + (opts.active ? ' active' : '');
  // Stamp the username so presence updater can find this row later
  if (opts.avatarType === 'user' && opts.avatarUser && opts.avatarUser.username) {
    row.dataset.username = opts.avatarUser.username;
  }

  const av = document.createElement('div');
  av.className = 'inbox-row-avatar';
  if (opts.avatarType === 'global') {
    av.classList.add('global');
    av.innerHTML = '<i class="fas fa-globe"></i>';
  } else if (opts.avatarType === 'group') {
    av.classList.add('global');
    av.innerHTML = '<i class="fas fa-users"></i>';
  } else {
    const u = opts.avatarUser || {};
    const span = document.createElement('span');
    span.textContent = (u.username?.[0] || '?').toUpperCase();
    av.appendChild(span);
    const pfp = u.pfp_url || (window.pfpCache && u.username ? window.pfpCache[u.username] : null);
    if (pfp) {
      const img = document.createElement('img');
      img.src = pfp;
      img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
      img.onerror = () => img.remove();
      av.appendChild(img);
    }
    if (opts.kind === 'dm' && u.username && isUserOnline(u.username)) {
      const dot = document.createElement('div');
      dot.className = 'active-dot';
      av.appendChild(dot);
    }
  }
  row.appendChild(av);

  const body = document.createElement('div');
  body.className = 'inbox-row-body';
  const nameEl = document.createElement('div');
  nameEl.className = 'inbox-row-name';
  nameEl.textContent = opts.name;
  body.appendChild(nameEl);

  const preview = document.createElement('div');
  preview.className = 'inbox-row-preview';
  preview.innerHTML = opts.sub || '';
  body.appendChild(preview);
  row.appendChild(body);

  const meta = document.createElement('div');
  meta.className = 'inbox-row-meta';
  if (opts.time) {
    const t = document.createElement('div');
    t.className = 'inbox-row-time';
    t.textContent = fmtRelativeShort(opts.time);
    meta.appendChild(t);
  }
  if (opts.unread && opts.unread > 0) {
    const badge = document.createElement('div');
    badge.className = 'inbox-row-badge';
    badge.textContent = opts.unread > 99 ? '99+' : opts.unread;
    meta.appendChild(badge);
  }
  row.appendChild(meta);

  row.onclick = () => {
    if (opts.kind === 'global') navigateTo(GLOBAL_CHAT_SLUG);
    else navigateTo(opts.slug);
  };

  if (opts.conversation && opts.conversation.type === 'dm') {
    attachInboxDeleteTrigger(row, opts.conversation);
  }

  return row;
}

// ═══════════════════════════════════════════════════════════
// ── CHAT ADS: pseudo-DM row + ad chat view + inbox bottom slot ──
// ═══════════════════════════════════════════════════════════

function startChatAdRotation() {
  stopChatAdRotation();
  // Re-evaluate the pseudo-DM every 10 min so a new ad rotates in
  // once the previous one is throttled/removed.
  chatAdRefreshTimer = setInterval(() => {
    renderInbox();
  }, 10 * 60 * 1000);
}
function stopChatAdRotation() {
  if (chatAdRefreshTimer) {
    clearInterval(chatAdRefreshTimer);
    chatAdRefreshTimer = null;
  }
}

// Build the pseudo-DM row that goes inside the inbox list.
// Position: slot 2-4 (after Global Chat + the first 1-3 conversations).
function maybeInjectChatAdRow(list) {
  if (!list) return;
  if (!window.Ads || typeof window.Ads.buildInboxChatAdRow !== 'function') return;

  // Ensure ad's pfp is in the pfp cache BEFORE building the row
  // (fake ads won't have it, so fetch it here)
  const prepareAd = async () => {
    const ads = window.Ads.getCached ? window.Ads.getCached() : [];
    ads.forEach(a => {
      if (a.advertiser_pfp_url && a.advertiser_username && !window.pfpCache[a.advertiser_username]) {
        window.pfpCache[a.advertiser_username] = a.advertiser_pfp_url;
      }
    });
  };
  prepareAd();

  // Pick the ad that isn't already in the bottom slot (if possible)
  const excludeIds = currentInboxBottomAd ? [currentInboxBottomAd.id] : [];
  const ad = window.Ads.pickChatAdForInbox({ excludeIds });
  if (!ad) {
    currentChatAd = null;
    currentChatAdSignature = null;
    return;
  }

  // ── If the SAME ad is already in the DOM, leave it alone ──
  // This avoids flicker + image reloads on every renderInbox() call.
  const signature = `${ad.id}`;
  const existing = list.querySelector(`.inbox-row-ad[data-ad-id="${ad.id}"]`);
  if (existing && currentChatAdSignature === signature) {
    // Ad is already there with the same slot position — nothing to do.
    currentChatAd = ad;
    return;
  }

  currentChatAd = ad;
  currentChatAdSignature = signature;

  const { el: row } = window.Ads.buildInboxChatAdRow(ad, openChatAdView);

  // ── Positions in the DOM ──
  // The list looks like this after full render:
  //   [0] Global Chat
  //   [1] "Conversations" label    (only if there are conversations)
  //   [2] conversation 1
  //   [3] conversation 2
  //   [4] conversation 3
  //
  // "Slot 2-4" means we want the ad between the 1st and 3rd real conversation.
  //
  // Slot index is cached in `currentChatAdSlot` so the ad stays put across
  // re-renders. Only re-randomize when the cached slot doesn't exist or the
  // ad itself changed (which we handled above).

  const children = Array.from(list.children);
  const convStartIndex = children.length > 1 && children[1].classList.contains('inbox-section-label') ? 2 : 1;
  const convCount = children.length - convStartIndex;

  // Not enough conversations? Just append at the end.
  if (convCount < 1) {
    list.appendChild(row);
    if (currentChatAdSlot === null) currentChatAdSlot = 0;
    return;
  }

  const maxAfter = Math.min(3, convCount);  // 1..3

  // If we haven't picked a slot yet, pick one now and remember it.
  if (currentChatAdSlot === null || currentChatAdSlot < 1 || currentChatAdSlot > maxAfter) {
    currentChatAdSlot = 1 + Math.floor(Math.random() * maxAfter); // 1..maxAfter
  }
  const afterCount = Math.min(currentChatAdSlot, maxAfter);
  const insertAt = convStartIndex + afterCount;

  if (insertAt >= children.length) {
    list.insertBefore(row, children[children.length - 1]?.nextSibling || null);
  } else {
    list.insertBefore(row, children[insertAt]);
  }
}

// Open the ad chat view when a pseudo-DM is clicked.
function openChatAdView(ad) {
  if (!ad) return;

  // Remember the currently-open chat so we can return to it on close.
  preAdActiveChat = activeChat;

  // Hide real chat views
  const empty = document.getElementById('chat-empty');
  const chatView = document.getElementById('chat-view');
  if (empty) empty.style.display = 'none';
  if (chatView) chatView.style.display = 'none';

  // Show ad chat view
  const adView = document.getElementById('ad-chat-view');
  const adHead = document.getElementById('ad-chat-head');
  const adBody = document.getElementById('ad-chat-body');

  if (!adView || !adHead || !adBody) return;

  // If Ads.js exposes renderAdChatView, use it — it fills header + body
  if (window.Ads && typeof window.Ads.renderAdChatView === 'function') {
    window.Ads.renderAdChatView(ad, adView, adHead, adBody);

    // Hook the close + back buttons ourselves (the shared renderer
    // attaches its own close handler that just hides `container`).
    // We override it to also restore the previous view.
    const closeBtns = adHead.querySelectorAll('[data-ad-close], .chat-back-btn');
    closeBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        closeChatAdView();
      };
    });

    // Hook the CTA button so it ALSO closes the view + removes the pseudo-DM.
    const ctaBtn = adBody.querySelector('.ad-chat-cta');
    if (ctaBtn) {
      ctaBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Fire the click logging (open the link, bump counter)
        if (window.Ads && typeof window.Ads.logClick === 'function') {
          window.Ads.logClick(ad.id, 'chat');
        }
        if (window.Ads && typeof window.Ads.markChatAdSeen === 'function') {
          window.Ads.markChatAdSeen(ad.id);
        }
        try { window.open(ad.link_url, '_blank', 'noopener,noreferrer'); } catch {}

        // Remove the pseudo-DM row from the inbox
        const row = document.querySelector(`.inbox-row-ad[data-ad-id="${ad.id}"]`);
        if (row) row.remove();

        // Close the ad view + return to previous chat/inbox
        closeChatAdView();

        // Re-render inbox so the rotation logic can evaluate fresh
        setTimeout(() => {
          try { renderInbox(); } catch (e) {}
        }, 500);
      };
    }

    // Also override the image click (it opens the link too, in Ads.js)
    const imgWrap = adBody.querySelector('.ad-chat-img-wrap');
    if (imgWrap) {
      imgWrap.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (window.Ads && typeof window.Ads.logClick === 'function') {
          window.Ads.logClick(ad.id, 'chat');
        }
        if (window.Ads && typeof window.Ads.markChatAdSeen === 'function') {
          window.Ads.markChatAdSeen(ad.id);
        }
        try { window.open(ad.link_url, '_blank', 'noopener,noreferrer'); } catch {}

        const row = document.querySelector(`.inbox-row-ad[data-ad-id="${ad.id}"]`);
        if (row) row.remove();

        closeChatAdView();
      };
    }
  } else {
    // Fallback: minimal ad view if Ads.js helpers aren't available
    adHead.innerHTML = `
      <button class="chat-back-btn" title="Back"><i class="fas fa-arrow-left"></i></button>
      <div class="chat-head-info">
        <div class="chat-head-name">Sponsored</div>
        <div class="chat-head-sub">Ad</div>
      </div>
    `;
    adBody.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">Ad unavailable</div>`;
  }

  adView.style.display = 'flex';
  setMobileView('chat');
}

function closeChatAdView() {
  const adView = document.getElementById('ad-chat-view');
  if (adView) {
    adView.style.display = 'none';
    // Wipe contents so nothing leaks into the DOM when it reappears
    const head = document.getElementById('ad-chat-head');
    const body = document.getElementById('ad-chat-body');
    if (head) head.innerHTML = '';
    if (body) body.innerHTML = '';
  }

  // Return to whatever was open before, or show empty state
  if (preAdActiveChat) {
    const remembered = preAdActiveChat;
    preAdActiveChat = null;

    if (remembered.type === 'global') {
      openGlobalChat();
    } else if (remembered.slug) {
      openChatBySlug(remembered.slug, remembered.otherUsername);
    } else {
      showEmptyView();
    }
  } else {
    showEmptyView();
  }
}

function showEmptyView() {
  const empty = document.getElementById('chat-empty');
  const chatView = document.getElementById('chat-view');
  const adView = document.getElementById('ad-chat-view');
  if (empty) empty.style.display = 'flex';
  if (chatView) chatView.style.display = 'none';
  if (adView) adView.style.display = 'none';
  setMobileView('inbox');
}




function attachInboxDeleteTrigger(row, convo) {
  let timer = null;
  let startPos = null;

  const start = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button, a')) return;
    startPos = { x: e.clientX || 0, y: e.clientY || 0 };
    timer = setTimeout(() => {
      timer = null;
      row.classList.remove('long-pressing');
      if (navigator.vibrate) navigator.vibrate(30);
      confirmDeleteConversation(convo);
    }, LONG_PRESS_MS);
    // Visual feedback starting at 200ms
    setTimeout(() => {
      if (timer) row.classList.add('long-pressing');
    }, 200);
  };

  const cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    row.classList.remove('long-pressing');
    startPos = null;
  };

  row.addEventListener('mousedown', start);
  row.addEventListener('mouseup', cancel);
  row.addEventListener('mouseleave', cancel);
  row.addEventListener('touchstart', start, { passive: true });
  row.addEventListener('touchend', cancel);
  row.addEventListener('touchcancel', cancel);
  row.addEventListener('touchmove', cancel, { passive: true });
  row.addEventListener('mousemove', (e) => {
    if (!startPos) return;
    const dx = Math.abs((e.clientX || 0) - startPos.x);
    const dy = Math.abs((e.clientY || 0) - startPos.y);
    if (dx > 15 || dy > 15) cancel();
  });

  row.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    confirmDeleteConversation(convo);
  });
}

async function confirmDeleteConversation(convo) {
  if (!convo || convo.type !== 'dm') return;
  const otherName = convo.displayName || convo.otherUsername || 'this user';
  const ok = confirm(`Delete your conversation with ${otherName}?\n\nThis deletes all messages for both of you. No undo.`);
  if (!ok) return;

  const { error } = await window.supabaseClient
    .from('conversations')
    .delete()
    .eq('id', convo.id);

  if (error) {
    window.showToast('Delete failed: ' + error.message, 'error');
    return;
  }

  window.showToast('Conversation deleted', 'success');

  if (activeChat && activeChat.conversationId === convo.id) {
    closeChat();
  }

  await loadConversations();
  renderInbox();
}

function renderSearchResults(list, query) {
  list.innerHTML = '';
  const q = query.toLowerCase();
  const matches = Object.values(profilesIndex).filter(p => {
    if (!p) return false;
    if (p.username === username) return false;
    const u = (p.username || '').toLowerCase();
    const d = (p.display_name || '').toLowerCase();
    return u.includes(q) || d.includes(q);
  }).slice(0, 20);

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'inbox-empty';
    empty.innerHTML = `<span class="big">🔍</span>No people found for "<strong>${window.escapeHTML(query)}</strong>"`;
    list.appendChild(empty);
    return;
  }

  const label = document.createElement('div');
  label.className = 'inbox-section-label';
  label.textContent = 'People';
  list.appendChild(label);

  matches.forEach(p => {
    const row = document.createElement('div');
    row.className = 'inbox-row';

    const av = document.createElement('div');
    av.className = 'inbox-row-avatar';
    const span = document.createElement('span');
    span.textContent = (p.username?.[0] || '?').toUpperCase();
    av.appendChild(span);
    if (p.pfp_url) {
      const img = document.createElement('img');
      img.src = p.pfp_url;
      img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
      img.onerror = () => img.remove();
      av.appendChild(img);
    }
    if (isUserOnline(p.username)) {
      const dot = document.createElement('div');
      dot.className = 'active-dot';
      av.appendChild(dot);
    }
    row.appendChild(av);

    const body = document.createElement('div');
    body.className = 'inbox-row-body';
    const nameEl = document.createElement('div');
    nameEl.className = 'inbox-row-name';
    nameEl.textContent = p.display_name || p.username;
    const unEl = document.createElement('div');
    unEl.className = 'inbox-row-preview';
    unEl.textContent = '@' + p.username;
    body.appendChild(nameEl);
    body.appendChild(unEl);
    row.appendChild(body);

    row.onclick = () => {
      clearSearchInput();
      const slug = dmSlugForMe(p.username);
      navigateTo(slug, p.username);
    };

    list.appendChild(row);
  });
}

// ═══════════════════════════════════════════════════════════
// ── SEARCH INPUT ──
// ═══════════════════════════════════════════════════════════
function initSearchInput() {
  const input = document.getElementById('inbox-search-input');
  const clearBtn = document.getElementById('inbox-search-clear');
  const wrap = input?.closest('.inbox-search');
  if (!input) return;
  input.addEventListener('input', () => {
    currentSearchQuery = input.value;
    if (wrap) wrap.classList.toggle('has-value', !!input.value);
    renderInbox();
  });
  if (clearBtn) {
    clearBtn.onclick = () => {
      input.value = '';
      currentSearchQuery = '';
      if (wrap) wrap.classList.remove('has-value');
      input.focus();
      renderInbox();
    };
  }
}
function clearSearchInput() {
  const input = document.getElementById('inbox-search-input');
  const wrap = input?.closest('.inbox-search');
  if (input) input.value = '';
  currentSearchQuery = '';
  if (wrap) wrap.classList.remove('has-value');
}

// ═══════════════════════════════════════════════════════════
// ── OPEN A CHAT ──
// ═══════════════════════════════════════════════════════════
async function openChatBySlug(slug, hintUsername) {
  if (!slug) { closeChat(); return; }
  pushUrl(slug);

  if (slug === GLOBAL_CHAT_SLUG) {
    await openGlobalChat();
  } else {
    await openConversationBySlug(slug, hintUsername);
  }
}

async function openGlobalChat() {
  stopActiveStatusTicker();
  activeChat = { type: 'global', slug: GLOBAL_CHAT_SLUG };
  renderInbox();
  updateChatHeader({
    name: 'Global Chat',
    sub: 'Everyone in CESC',
    avatarType: 'global'
  });
  showChatView();
  setMobileView('chat');
  await loadMessagesForChat();
  setupRealtimeForChat();
}

async function openConversationBySlug(slug, hintUsername) {
  stopActiveStatusTicker();

  let { data: existing } = await window.supabaseClient
    .from('conversations')
    .select('id, type, slug, name, pfp_url, dm_user_a, dm_user_b, member_count, message_count, last_message_at')
    .eq('slug', slug)
    .maybeSingle();

  let otherUsername = null;
  let otherProfile = null;
  let displayName = existing?.name || 'Conversation';
  let pfpUrl = existing?.pfp_url || null;

  if (existing) {
    if (existing.type === 'dm') {
      otherUsername = resolveDMOther(existing);
      otherProfile = otherUsername ? (profilesIndex[otherUsername] || null) : null;
      displayName = otherProfile?.display_name || otherProfile?.username || otherUsername || 'Unknown';
      pfpUrl = otherProfile?.pfp_url || null;
    }
  } else {
    let rawUser = null;
    if (hintUsername && profilesIndex[hintUsername]) {
      rawUser = hintUsername;
    } else if (profilesIndex[slug]) {
      rawUser = slug;
    }
    if (!rawUser) {
      window.showToast('User not found', 'error');
      closeChat();
      return;
    }

    otherUsername = rawUser;
    otherProfile = profilesIndex[rawUser];
    displayName = otherProfile.display_name || otherProfile.username;
    pfpUrl = otherProfile.pfp_url || null;

    slug = dmSlugForMe(rawUser);
    const { data: retry } = await window.supabaseClient
      .from('conversations')
      .select('id, type, slug, name, pfp_url, dm_user_a, dm_user_b, member_count, message_count, last_message_at')
      .eq('slug', slug)
      .maybeSingle();
    if (retry) existing = retry;
  }

  if (existing && existing.type === 'dm' && !otherUsername) {
    otherUsername = resolveDMOther(existing);
    otherProfile = otherUsername ? (profilesIndex[otherUsername] || null) : null;
    displayName = otherProfile?.display_name || otherProfile?.username || otherUsername || 'Unknown';
    pfpUrl = otherProfile?.pfp_url || null;
  }

  activeChat = {
    type: existing?.type || 'dm',
    slug,
    conversationId: existing?.id || null,
    ephemeral: !existing,
    otherUsername,
    otherProfile,
    displayName,
    pfpUrl,
  };

  renderInbox();
  updateChatHeader({
    name: displayName,
    sub: activeChat.type === 'dm'
      ? ('@' + (otherUsername || slug))
      : ('Group · ' + (existing?.member_count || 0) + ' members'),
    avatarType: activeChat.type === 'group' ? 'group' : 'user',
    avatarUser: activeChat.type === 'group'
      ? { username: slug, pfp_url: pfpUrl }
      : (otherProfile || { username: otherUsername }),
  });
  showChatView();
  setMobileView('chat');
  await loadMessagesForChat();
  if (activeChat.conversationId) {
    setupRealtimeForChat();
    await markConversationRead(activeChat.conversationId);
  }

  // Start the ticker if it's a DM
  if (activeChat.type === 'dm' && activeChat.otherUsername) {
    startActiveStatusTicker();
  }
}

function closeChat() {
  stopActiveStatusTicker();
  activeChat = null;
  teardownRealtime();
  pushUrl(null);
  const view = document.getElementById('chat-view');
  const empty = document.getElementById('chat-empty');
  if (view) view.style.display = 'none';
  if (empty) empty.style.display = 'flex';
  renderInbox();
  setMobileView('inbox');
}

function showChatView() {
  const view = document.getElementById('chat-view');
  const empty = document.getElementById('chat-empty');
  if (view) view.style.display = 'flex';
  if (empty) empty.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// ── CHAT HEADER ──
// ═══════════════════════════════════════════════════════════
function updateChatHeader(opts) {
  const av = document.getElementById('chat-head-avatar');
  const nameEl = document.getElementById('chat-head-name');
  const subEl = document.getElementById('chat-head-sub');
  if (!av || !nameEl || !subEl) return;

  av.classList.remove('global');
  av.innerHTML = '';

  if (opts.avatarType === 'global' || opts.avatarType === 'group') {
    av.classList.add('global');
    av.innerHTML = opts.avatarType === 'global'
      ? '<i class="fas fa-globe"></i>'
      : '<i class="fas fa-users"></i>';
    if (opts.avatarType === 'group' && opts.avatarUser?.pfp_url) {
      av.innerHTML = '';
      const img = document.createElement('img');
      img.src = opts.avatarUser.pfp_url;
      img.onload = () => img.classList.add('loaded');
      av.appendChild(img);
    }
  } else {
    const u = opts.avatarUser || {};
    const span = document.createElement('span');
    span.textContent = (u.username?.[0] || '?').toUpperCase();
    av.appendChild(span);
    const pfp = u.pfp_url || (window.pfpCache && u.username ? window.pfpCache[u.username] : null);
    if (pfp) {
      const img = document.createElement('img');
      img.src = pfp;
      img.onload = () => { img.classList.add('loaded'); span.style.display = 'none'; };
      img.onerror = () => img.remove();
      av.appendChild(img);
    }
    if (u.username && isUserOnline(u.username)) {
      const dot = document.createElement('div');
      dot.className = 'active-dot';
      av.appendChild(dot);
    }
  }

  nameEl.textContent = opts.name || '—';

  subEl.classList.remove('active-now');
  if (opts.avatarType === 'user' && opts.avatarUser?.username) {
    const uname = opts.avatarUser.username;
    if (isUserOnline(uname)) {
      subEl.textContent = 'Active now';
      subEl.classList.add('active-now');
    } else {
      const lastSeen = profilesIndex[uname]?.last_seen;
      subEl.textContent = 'Active ' + timeAgoShort(lastSeen);
    }
  } else {
    subEl.textContent = opts.sub || '';
  }

  const input = document.getElementById('msg-input');
  if (input) input.placeholder = `Message ${opts.name}...`;
}

// ═══════════════════════════════════════════════════════════
// ── MESSAGES LOADING ──
// ═══════════════════════════════════════════════════════════
async function loadMessagesForChat() {
  const container = document.getElementById('messages');
  if (!container) return;
  container.innerHTML = '<div class="loading-msgs"><div class="loading-spin"></div>loading messages...</div>';
  resetMessageRenderState();

  if (activeChat.type === 'global') {
    await loadGlobalMessages();
  } else if (activeChat.ephemeral) {
    container.innerHTML = '';
    const sys = document.createElement('div');
    sys.className = 'system-msg';
    sys.textContent = 'Say hi 👋 — this conversation will be created when you send a message';
    container.appendChild(sys);
    return;
  } else if (activeChat.type === 'dm') {
    await loadDMMessages(activeChat.conversationId);
  } else if (activeChat.type === 'group') {
    await loadGCMessages(activeChat.conversationId);
  }
}

async function loadGlobalMessages() {
  const { data, error } = await window.supabaseClient
    .from('messages').select('*')
    .order('created_at', { ascending: true });
  if (error) { window.showToast('Failed to load messages', 'error'); return; }
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="system-msg">chat is live ⚡ say something</div>';
    return;
  }
  data.forEach(m => appendMessage(m, false));
  container.scrollTop = container.scrollHeight;
}

async function loadDMMessages(conversationId) {
  const { data, error } = await window.supabaseClient
    .from('dm_messages').select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) { window.showToast('Failed to load messages', 'error'); return; }
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="system-msg">Say hi 👋</div>';
    return;
  }
  data.forEach(m => appendMessage(m, false));
  container.scrollTop = container.scrollHeight;
  attachAllReceipts();
  markDMMessagesSeen(conversationId);
}

async function loadGCMessages(conversationId) {
  const { data, error } = await window.supabaseClient
    .from('gc_messages').select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) { window.showToast('Failed to load messages', 'error'); return; }
  const container = document.getElementById('messages');
  container.innerHTML = '';
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="system-msg">No messages yet</div>';
    return;
  }
  data.forEach(m => appendMessage(m, false));
  container.scrollTop = container.scrollHeight;
}

async function markConversationRead(conversationId) {
  if (!conversationId) return;
  await window.supabaseClient
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', myUserId);
  const c = conversationsCache.find(x => x.id === conversationId);
  if (c) c.unread = 0;
  renderInbox();
}

async function markDMMessagesSeen(conversationId) {
  if (!conversationId) return;
  await window.supabaseClient
    .from('dm_messages')
    .update({ seen_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('receiver_username', username)
    .is('seen_at', null);
}

// ═══════════════════════════════════════════════════════════
// ── READ RECEIPTS ──
// ═══════════════════════════════════════════════════════════
function attachAllReceipts() {
  document.querySelectorAll('.msg-receipt').forEach(el => el.remove());

  if (!activeChat || activeChat.type !== 'dm') return;

  const groups = Array.from(document.querySelectorAll('.msg-group.own'));
  if (groups.length === 0) return;
  const lastOwn = groups[groups.length - 1];

  const seenAt = lastOwn.dataset.seen_at || '';
  const isSeen = !!seenAt;

  const receipt = document.createElement('div');
  receipt.className = 'msg-receipt ' + (isSeen ? 'seen' : 'delivered');
  receipt.innerHTML = isSeen
    ? '<i class="fas fa-check-double"></i> Seen'
    : '<i class="fas fa-check"></i> Delivered';

  const content = lastOwn.querySelector('.msg-content');
  if (content) content.appendChild(receipt);
}

function updateReceiptForMessage(msg) {
  if (!activeChat || activeChat.type !== 'dm') return;
  if (msg.username !== username) return;

  const group = document.querySelector(`.msg-group[data-id="${msg.id}"]`);
  if (group) group.dataset.seen_at = msg.seen_at || '';

  const ownGroups = Array.from(document.querySelectorAll('.msg-group.own'));
  if (ownGroups.length === 0) return;
  const lastOwn = ownGroups[ownGroups.length - 1];
  if (lastOwn.dataset.id === msg.id) {
    attachAllReceipts();
  }
}

// ═══════════════════════════════════════════════════════════
// ── MESSAGE RENDERING ──
// ═══════════════════════════════════════════════════════════
let lastDate = null, lastUser = null, lastTimestamp = null;

function resetMessageRenderState() {
  lastDate = null; lastUser = null; lastTimestamp = null;
}

function isNearBottom() {
  const container = document.getElementById('messages');
  if (!container) return true;
  const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
  return dist < NEAR_BOTTOM_THRESHOLD_PX;
}

function appendMessage(msg, scroll = true) {
  const container = document.getElementById('messages');
  const loading = container.querySelector('.loading-msgs');
  if (loading) loading.remove();

  // DEDUPE
  if (document.querySelector(`.msg-group[data-id="${msg.id}"]`)) return;

  // Only auto-scroll if the user was near the bottom already
  const wasNearBottom = isNearBottom();

  const msgDate = fmtDate(msg.created_at);
  if (msgDate !== lastDate) {
    const div = document.createElement('div');
    div.className = 'date-divider';
    div.textContent = msgDate;
    container.appendChild(div);
    lastDate = msgDate;
    lastUser = null;
  }

  const timeDiff = lastTimestamp ? (new Date(msg.created_at) - new Date(lastTimestamp)) / 60000 : 999;
  const isContinued = msg.username === lastUser && timeDiff < 5 && !msg.reply_to;

  const group = buildMessageGroup(msg, isContinued);
  container.appendChild(group);
  lastUser = msg.username;
  lastTimestamp = msg.created_at;

  // Smart scroll: only scroll if caller asked AND user was near bottom
  if (scroll && wasNearBottom) {
    container.scrollTop = container.scrollHeight;
  }

  attachAllReceipts();
}

function buildMsgAvatar(uname) {
  const div = document.createElement('div');
  div.className = 'msg-avatar';
  const initial = document.createElement('span');
  initial.textContent = (uname?.[0] || '?').toUpperCase();
  div.appendChild(initial);
  const pfpUrl = window.pfpCache && window.pfpCache[uname];
  if (pfpUrl) {
    const img = document.createElement('img');
    img.src = pfpUrl;
    img.alt = uname;
    img.onload = () => { img.classList.add('loaded'); initial.style.display = 'none'; };
    img.onerror = () => { img.remove(); initial.style.display = ''; };
    div.appendChild(img);
  }
  return div;
}

function buildMessageGroup(msg, isContinued) {
  const group = document.createElement('div');
  group.className = 'msg-group' + (isContinued ? '' : ' first-in-group');
  group.dataset.id = msg.id;
  group.dataset.username = msg.username;
  group.dataset.display_name = msg.display_name || msg.username;
  group.dataset.content = msg.content;
  group.dataset.created_at = msg.created_at;
  group.dataset.image_url = msg.image_url || '';
  group.dataset.seen_at = msg.seen_at || '';

  const displayName = msg.display_name || msg.username;
  const isOwn = msg.username === username;
  if (isOwn) group.classList.add('own');

  const maskedContent = maskBadWords(msg.content);
  const isMentioned = msg.content && username &&
    new RegExp(`@${username}\\b`, 'i').test(msg.content) && !isOwn;

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  const replyBtn = document.createElement('button');
  replyBtn.className = 'action-btn';
  replyBtn.innerHTML = '<i class="fas fa-reply"></i>';
  replyBtn.onclick = (e) => { e.stopPropagation(); window.startReply(msg.id, displayName, maskedContent.slice(0, 80)); };
  actions.appendChild(replyBtn);
  if (isOwn) {
    const canEdit = canEditMessage(msg.created_at);
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn' + (!canEdit ? ' disabled' : '');
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    if (canEdit) editBtn.onclick = (e) => { e.stopPropagation(); window.startEditMode(msg.id); };
    actions.appendChild(editBtn);
    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn del';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.onclick = (e) => { e.stopPropagation(); window.deleteMsg(msg.id); };
    actions.appendChild(delBtn);
  }
  group.appendChild(actions);

  const row = document.createElement('div');
  row.className = 'msg-row';

  let replyHTML = '';
  if (msg.reply_to && msg.reply_username) {
    replyHTML = `
      <div class="reply-quote" onclick="event.stopPropagation(); window.scrollToMsg('${msg.reply_to}')">
        <div class="reply-body">
          <div class="reply-who">${window.escapeHTML(msg.reply_username)}</div>
          <div class="reply-text">${window.escapeHTML(maskBadWords(msg.reply_preview || ''))}</div>
        </div>
      </div>`;
  }
  let imageHTML = '';
  if (msg.image_url) {
    imageHTML = `<img src="${msg.image_url}" alt="Image" onclick="event.stopPropagation(); window.openChatImageModal('${msg.image_url}')"/>`;
  }

  if (!isContinued) {
    row.appendChild(buildMsgAvatar(msg.username));
    const content = document.createElement('div');
    content.className = 'msg-content';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = `
      ${replyHTML}
      <div class="msg-header">
        <span class="msg-username">${window.escapeHTML(displayName)}</span>
        ${isMentioned ? '<span class="mention-badge">@you</span>' : ''}
        <span class="msg-time">${fmtTime(msg.created_at)}</span>
        ${msg.edited ? '<span class="msg-edited">(edited)</span>' : ''}
      </div>
      <div class="msg-text" id="text-${msg.id}">${window.escapeHTML(maskedContent)} ${imageHTML}</div>
    `;
    content.appendChild(bubble);
    row.appendChild(content);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'msg-avatar-placeholder';
    placeholder.innerHTML = `<span class="msg-timestamp-inline">${fmtTime(msg.created_at)}</span>`;
    row.appendChild(placeholder);
    const content = document.createElement('div');
    content.className = 'msg-content';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = `
      ${replyHTML}
      <div class="msg-text" id="text-${msg.id}">${window.escapeHTML(maskedContent)} ${imageHTML}</div>
    `;
    content.appendChild(bubble);
    row.appendChild(content);
  }

  group.appendChild(row);
  attachContextTrigger(group, msg.id);
  return group;
}

// ═══════════════════════════════════════════════════════════
// ── REALTIME (active chat) ──
// ═══════════════════════════════════════════════════════════
function setupRealtimeForChat() {
  teardownRealtime();
  if (!activeChat) return;

  const channelName = 'chat-' + activeChat.slug + '-' + Date.now();
  let ch = window.supabaseClient.channel(channelName);

  if (activeChat.type === 'global') {
    ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => handleIncoming(p.new));
    ch = ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, p => handleMessageUpdate(p.new));
    ch = ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, p => {
      if (!p.old?.id) return;
      document.querySelector(`.msg-group[data-id="${p.old.id}"]`)?.remove();
    });
  } else if (activeChat.type === 'dm' && activeChat.conversationId) {
    const filter = `conversation_id=eq.${activeChat.conversationId}`;
    ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter }, p => handleIncoming(p.new));
    ch = ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter }, p => {
      const msg = p.new;
      if (msg.username === username && msg.seen_at) {
        updateReceiptForMessage(msg);
      }
      handleMessageUpdate(msg);
    });
    ch = ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dm_messages', filter }, p => {
      if (!p.old?.id) return;
      document.querySelector(`.msg-group[data-id="${p.old.id}"]`)?.remove();
      attachAllReceipts();
    });
  } else if (activeChat.type === 'group' && activeChat.conversationId) {
    const filter = `conversation_id=eq.${activeChat.conversationId}`;
    ch = ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gc_messages', filter }, p => handleIncoming(p.new));
    ch = ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gc_messages', filter }, p => handleMessageUpdate(p.new));
    ch = ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gc_messages', filter }, p => {
      if (!p.old?.id) return;
      document.querySelector(`.msg-group[data-id="${p.old.id}"]`)?.remove();
    });
  }

  activeChannel = ch.subscribe();
}

function teardownRealtime() {
  if (activeChannel) {
    window.supabaseClient.removeChannel(activeChannel);
    activeChannel = null;
  }
}

function handleIncoming(msg) {
  if (!activeChat) return;
  if (activeChat.type === 'dm' && msg.conversation_id && activeChat.conversationId && msg.conversation_id !== activeChat.conversationId) return;

  const sys = document.querySelector('#messages .system-msg');
  if (sys) sys.remove();

  if (msg.username && msg.username !== username) {
    if (!document.hidden) playNotificationSound();
    sendChatNotification(msg.display_name || msg.username, msg.content || '', msg.image_url || null);
  }
  if (window.pfpCache && !window.pfpCache[msg.username]) {
    window.supabaseClient.from('profiles').select('pfp_url').eq('username', msg.username).maybeSingle()
      .then(({ data }) => { if (data?.pfp_url) window.pfpCache[msg.username] = data.pfp_url; });
  }
  appendMessage(msg);

  if (activeChat.type === 'dm' && msg.receiver_username === username && !msg.seen_at) {
    markDMMessagesSeen(activeChat.conversationId);
  }
}

function handleMessageUpdate(msg) {
  const textEl = document.getElementById(`text-${msg.id}`);
  if (textEl) {
    let imageHTML = '';
    if (msg.image_url) {
      imageHTML = `<img src="${msg.image_url}" alt="Image" onclick="event.stopPropagation(); window.openChatImageModal('${msg.image_url}')"/>`;
    }
    textEl.innerHTML = window.escapeHTML(maskBadWords(msg.content)) + ' ' + imageHTML;
    const header = textEl.closest('.msg-content')?.querySelector('.msg-header');
    if (header && msg.edited && !header.querySelector('.msg-edited')) {
      const badge = document.createElement('span');
      badge.className = 'msg-edited';
      badge.textContent = '(edited)';
      header.appendChild(badge);
    }
  }
  const group = document.querySelector(`.msg-group[data-id="${msg.id}"]`);
  if (group) {
    group.dataset.content = msg.content;
    group.dataset.image_url = msg.image_url || '';
    if (msg.seen_at !== undefined) group.dataset.seen_at = msg.seen_at || '';
  }
}

// ═══════════════════════════════════════════════════════════
// ── INBOX REALTIME (all DMs & GCs) ──
// ═══════════════════════════════════════════════════════════
function setupInboxRealtime() {
  if (inboxChannel) window.supabaseClient.removeChannel(inboxChannel);

  inboxChannel = window.supabaseClient.channel('inbox-watch')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' },
      payload => handleInboxMessage(payload.new, 'dm'))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gc_messages' },
      payload => handleInboxMessage(payload.new, 'gc'))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'dm_messages' },
      () => scheduleInboxRefresh())
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'gc_messages' },
      () => scheduleInboxRefresh())
    .subscribe();
}

let _inboxRefreshTimeout = null;
function scheduleInboxRefresh() {
  if (_inboxRefreshTimeout) clearTimeout(_inboxRefreshTimeout);
  _inboxRefreshTimeout = setTimeout(async () => {
    _inboxRefreshTimeout = null;
    await loadConversations();
    renderInbox();
  }, 250);
}

function handleInboxMessage(msg, kind) {
  scheduleInboxRefresh();

  if (activeChat) {
    if (activeChat.type === 'dm' && kind === 'dm' && msg.conversation_id === activeChat.conversationId) return;
    if (activeChat.type === 'group' && kind === 'gc' && msg.conversation_id === activeChat.conversationId) return;
  }

  if (msg.username === username) return;

  if (!document.hidden) playNotificationSound();
  sendChatNotification(msg.display_name || msg.username, msg.content || '', msg.image_url || null);

  if (kind === 'dm' && msg.receiver_username === username && !msg.seen_at) {
    window.supabaseClient
      .from('dm_messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', msg.id)
      .then(() => {}, () => {});
  }
}

// ═══════════════════════════════════════════════════════════
// ── NOTIFICATIONS ──
// ═══════════════════════════════════════════════════════════
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
  } catch {}
}
function updateBadgeCounter() {
  if (document.hidden) {
    if (unreadCount > 0) {
      const label = unreadCount > 99 ? '99+' : unreadCount;
      document.title = `(${label}) CESC Hub — Chat`;
      if ('setAppBadge' in navigator) navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      document.title = 'CESC Hub — Chat';
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
    }
  }
}
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') notificationPermission = true;
}
function askNotificationPermissionOnce() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => { notificationPermission = p === 'granted'; });
  } else if (Notification.permission === 'granted') {
    notificationPermission = true;
  }
}
function sendGroupedNotification(sender, count) {
  if (!notificationPermission || Notification.permission !== 'granted') return;
  try {
    const message = count > 1 ? `${count} new messages from ${sender}` : `New message from ${sender}`;
    const n = new Notification(`💬 ${count > 1 ? 'Multiple messages' : sender}`, {
      body: message,
      icon: 'https://uploads.onecompiler.io/43m56waex/44huzak7q/232a0cec-1d90-4e0b-8377-41d13d78b763.png',
      tag: 'chat-group'
    });
    n.onclick = function() { window.focus(); n.close(); };
    setTimeout(() => { if (n && !n.closed) n.close(); }, 8000);
  } catch {}
}
function checkForMentions(content, sender) {
  if (!content || !username) return false;
  const re = new RegExp(`@${username}\\b`, 'i');
  const isMentioned = re.test(content);
  if (isMentioned) {
    playNotificationSound();
    if (notificationPermission && Notification.permission === 'granted') {
      try {
        const n = new Notification(`🔔 ${sender} mentioned you!`, {
          body: content.length > 50 ? content.slice(0, 50) + '...' : content,
          icon: 'https://uploads.onecompiler.io/43m56waex/44huzak7q/232a0cec-1d90-4e0b-8377-41d13d78b763.png',
          tag: 'mention-' + Date.now(),
          requireInteraction: true
        });
        n.onclick = function() { window.focus(); n.close(); };
      } catch {}
    }
  }
  return isMentioned;
}
function sendChatNotification(sender, content, imageUrl) {
  if (!document.hidden) return;
  if (sender === username) return;
  if (checkForMentions(content, sender)) {
    unreadCount++;
    updateBadgeCounter();
    return;
  }
  const now = Date.now();
  if (now - lastNotificationTime > 10000 || (pendingNotificationSender && pendingNotificationSender !== sender)) {
    if (pendingNotificationCount > 0 && pendingNotificationSender) {
      sendGroupedNotification(pendingNotificationSender, pendingNotificationCount);
      playNotificationSound();
    }
    pendingNotificationCount = 0;
    pendingNotificationSender = null;
  }
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    pendingNotificationCount++;
    if (!pendingNotificationSender) pendingNotificationSender = sender;
    if (notificationTimeout) clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
      if (pendingNotificationCount > 0 && pendingNotificationSender) {
        sendGroupedNotification(pendingNotificationSender, pendingNotificationCount);
        playNotificationSound();
        pendingNotificationCount = 0;
        pendingNotificationSender = null;
      }
    }, 3000);
    unreadCount++;
    updateBadgeCounter();
    return;
  }
  lastNotificationTime = now;
  if (!notificationPermission || Notification.permission !== 'granted') return;
  let displayContent = content || '📷 Image';
  if (content && content.length > 60) displayContent = content.slice(0, 60) + '...';
  if (imageUrl && !content) displayContent = '📷 Sent an image';
  try {
    const n = new Notification(`💬 ${sender}`, {
      body: displayContent,
      icon: 'https://uploads.onecompiler.io/43m56waex/44huzak7q/232a0cec-1d90-4e0b-8377-41d13d78b763.png',
      tag: 'chat-message-' + Date.now()
    });
    n.onclick = function() { window.focus(); n.close(); };
    setTimeout(() => { if (n && !n.closed) n.close(); }, 8000);
    unreadCount++;
    updateBadgeCounter();
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// ── MENTION NOTIFICATIONS ──
// ═══════════════════════════════════════════════════════════
function loadMentionSpamMap() {
  try { return JSON.parse(localStorage.getItem(MENTION_SPAM_KEY) || '{}'); } catch { return {}; }
}
function saveMentionSpamMap(map) {
  try { localStorage.setItem(MENTION_SPAM_KEY, JSON.stringify(map)); } catch {}
}
function canSendMentionNotification(recipientUsername) {
  const map = loadMentionSpamMap();
  const key = recipientUsername;
  const now = Date.now();
  const last = map[key] || 0;
  if (now - last < MENTION_SPAM_WINDOW_MS) return false;
  map[key] = now;
  saveMentionSpamMap(map);
  return true;
}
async function sendMentionNotifications(content, messageId) {
  if (!content || !window.session) return;
  const tokens = content.match(/@([a-zA-Z0-9_]+)/g);
  if (!tokens || tokens.length === 0) return;
  const unames = [...new Set(tokens.map(t => t.slice(1).toLowerCase()))];
  const myU = username.toLowerCase();
  const filtered = unames.filter(u => u !== myU);
  if (filtered.length === 0) return;
  const { data: profiles, error } = await window.supabaseClient
    .from('profiles')
    .select('id, username, display_name, pfp_url')
    .in('username', filtered);
  if (error || !profiles || profiles.length === 0) return;
  const toNotify = profiles.filter(p => p.id && canSendMentionNotification(p.username));
  if (toNotify.length === 0) return;
  const inserts = toNotify.map(p => ({
    recipient_id: p.id,
    actor_username: username,
    actor_display_name: currentDisplayName,
    actor_pfp_url: myPfpUrl,
    type: 'chat_mention',
    ref_id: messageId || null,
    preview: content.slice(0, 80)
  }));
  try { await window.supabaseClient.from('notifications').insert(inserts); } catch {}
}

// ═══════════════════════════════════════════════════════════
// ── SEND MESSAGE ──
// ═══════════════════════════════════════════════════════════
window.sendMsg = function() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  askNotificationPermissionOnce();
  if (editingId) { saveEdit(); return; }
  if (!activeChat) return;
  if (!text && !pendingImageFile) {
    window.showToast('write something or add an image 💀', 'error');
    return;
  }
  if (!window.session) { window.showToast('Not logged in', 'error'); return; }
  if (isUploading) return;
  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  isUploading = true;
  sendMessageToActive(text, btn);
};

async function sendMessageToActive(text, btn) {
  let image_url = null;
  if (pendingImageFile) {
    const ext = pendingImageFile.name.split('.').pop();
    const path = `${window.session.user.id}/${Date.now()}_chat.${ext}`;
    const { error: upErr } = await window.supabaseClient.storage
      .from('post-images').upload(path, pendingImageFile, { contentType: pendingImageFile.type });
    if (upErr) {
      window.showToast('Image upload failed: ' + upErr.message, 'error');
      btn.disabled = false; isUploading = false;
      return;
    }
    const { data: urlData } = window.supabaseClient.storage.from('post-images').getPublicUrl(path);
    image_url = urlData.publicUrl;
    pendingImageFile = null;
    document.getElementById('image-preview-wrap').classList.remove('show');
  }

  const payload = {
    user_id: window.session.user.id,
    username: username,
    display_name: currentDisplayName,
    content: text || '📷',
    image_url: image_url || null,
    ...(replyTo ? {
      reply_to: replyTo.id,
      reply_username: replyTo.username,
      reply_preview: replyTo.content.slice(0, 100)
    } : {})
  };

  let error, insertedRow;
  const wasNewConversation = activeChat.type === 'dm' && !activeChat.conversationId;

  if (activeChat.type === 'global') {
    ({ data: insertedRow, error } = await window.supabaseClient
      .from('messages').insert(payload).select('*').single());
  } else if (activeChat.type === 'dm') {
    if (!activeChat.conversationId) {
      const ok = await createDMConversation();
      if (!ok) { window.showToast('Could not create conversation', 'error'); btn.disabled = false; isUploading = false; return; }
    }
    payload.conversation_id = activeChat.conversationId;
    payload.receiver_username = activeChat.otherUsername;
    ({ data: insertedRow, error } = await window.supabaseClient
      .from('dm_messages').insert(payload).select('*').single());
  } else if (activeChat.type === 'group') {
    if (!activeChat.conversationId) {
      window.showToast('Group not found', 'error'); btn.disabled = false; isUploading = false;
      return;
    }
    payload.conversation_id = activeChat.conversationId;
    ({ data: insertedRow, error } = await window.supabaseClient
      .from('gc_messages').insert(payload).select('*').single());
  }

  if (error) {
    window.showToast('Send failed: ' + error.message, 'error');
    btn.disabled = false; isUploading = false;
    return;
  }

  // Optimistic append + force-scroll for own messages
  if (insertedRow) {
    if (wasNewConversation) {
      const sys = document.querySelector('#messages .system-msg');
      if (sys) sys.remove();
    }
    // Own messages: always scroll to bottom
    const container = document.getElementById('messages');
    // We bypass `isNearBottom` by directly setting scroll after append
    appendMessage(insertedRow, false);
    if (container) container.scrollTop = container.scrollHeight;
  }

  if (text && text.includes('@')) {
    sendMentionNotifications(text, insertedRow?.id).catch(() => {});
  }

  if (activeChat.type !== 'global') {
    if (wasNewConversation) setupRealtimeForChat();
    await loadConversations();
    renderInbox();
  }

  await window.updateLastSeen();
  document.getElementById('msg-input').value = '';
  document.getElementById('msg-input').style.height = 'auto';
  btn.disabled = false;
  isUploading = false;
  window.cancelReply();
  closeMentionPanel();
}

async function createDMConversation() {
  if (!activeChat.otherProfile || !activeChat.otherProfile.id) {
    const { data: p } = await window.supabaseClient
      .from('profiles')
      .select('id, username, display_name, pfp_url')
      .eq('username', activeChat.otherUsername)
      .maybeSingle();
    if (!p) {
      window.showToast('User not found', 'error');
      return false;
    }
    activeChat.otherProfile = p;
    profilesIndex[p.username] = p;
  }

  const { data: existing } = await window.supabaseClient
    .from('conversations').select('id').eq('slug', activeChat.slug).maybeSingle();
  if (existing) {
    activeChat.conversationId = existing.id;
    await ensureMembership(existing.id);
    return true;
  }

  const sorted = [username.toLowerCase(), activeChat.otherUsername.toLowerCase()].sort();

  const { data: newConvo, error: cErr } = await window.supabaseClient
    .from('conversations')
    .insert({
      type: 'dm',
      slug: activeChat.slug,
      name: `${sorted[0]}-${sorted[1]}`,
      created_by: window.session.user.id,
      owner_id: null,
      dm_user_a: sorted[0],
      dm_user_b: sorted[1]
    })
    .select('id')
    .single();

  if (cErr) {
    if (cErr.code === '23505') {
      const { data: retry } = await window.supabaseClient
        .from('conversations').select('id').eq('slug', activeChat.slug).maybeSingle();
      if (retry) {
        activeChat.conversationId = retry.id;
        await ensureMembership(retry.id);
        return true;
      }
    }
    console.error('createDMConversation error:', cErr);
    window.showToast('Create conversation failed: ' + cErr.message, 'error');
    return false;
  }

  activeChat.conversationId = newConvo.id;
  activeChat.ephemeral = false;

  const members = [
    { conversation_id: newConvo.id, user_id: window.session.user.id, role: 'member' }
  ];
  if (activeChat.otherProfile?.id) {
    members.push({ conversation_id: newConvo.id, user_id: activeChat.otherProfile.id, role: 'member' });
  }

  const { error: mErr } = await window.supabaseClient
    .from('conversation_members').insert(members);
  if (mErr) {
    console.error('add members error:', mErr);
    window.showToast('Add members failed: ' + mErr.message, 'error');
  }

  return true;
}

async function ensureMembership(conversationId) {
  const { data: existing } = await window.supabaseClient
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId);

  const existingIds = new Set((existing || []).map(r => r.user_id));
  const toAdd = [];

  if (!existingIds.has(window.session.user.id)) {
    toAdd.push({ conversation_id: conversationId, user_id: window.session.user.id, role: 'member' });
  }
  if (activeChat.otherProfile?.id && !existingIds.has(activeChat.otherProfile.id)) {
    toAdd.push({ conversation_id: conversationId, user_id: activeChat.otherProfile.id, role: 'member' });
  }

  if (toAdd.length === 0) return;

  const { error } = await window.supabaseClient
    .from('conversation_members').insert(toAdd);
  if (error) console.error('ensureMembership insert:', error);
}

// ═══════════════════════════════════════════════════════════
// ── CHAT-HEAD ACTIONS: refresh + read all ──
// ═══════════════════════════════════════════════════════════
window.refreshChat = async function() {
  const btn = document.getElementById('chat-head-refresh');
  if (btn) btn.classList.add('spinning');

  try {
    await loadProfilesIndex();
    await loadConversations();
    renderInbox();
    await loadNotes();
    if (activeChat) {
      await loadMessagesForChat();
    }
  } catch (e) {
    console.error('refreshChat:', e);
  }

  setTimeout(() => {
    if (btn) btn.classList.remove('spinning');
  }, 600);
  window.showToast('Refreshed ✅', 'success');
};

window.markAllChatRead = async function() {
  if (!activeChat || !activeChat.conversationId) {
    window.showToast('No chat open', 'info');
    return;
  }
  if (activeChat.type === 'dm') {
    await window.supabaseClient
      .from('dm_messages')
      .update({ seen_at: new Date().toISOString() })
      .eq('conversation_id', activeChat.conversationId)
      .eq('receiver_username', username)
      .is('seen_at', null);
  }
  await markConversationRead(activeChat.conversationId);
  await loadConversations();
  renderInbox();
  attachAllReceipts();
  window.showToast('Marked all as read ✅', 'success');
};

// ═══════════════════════════════════════════════════════════
// ── EDIT ──
// ═══════════════════════════════════════════════════════════
window.startEditMode = function(id) {
  const group = document.querySelector(`.msg-group[data-id="${id}"]`);
  if (!group) return;
  const createdAt = group.dataset.created_at;
  if (!canEditMessage(createdAt)) {
    window.showToast('Edit window expired (15 min)', 'error');
    return;
  }
  if (editingId) window.cancelEditMode();
  editingId = id;
  editingMsgCreatedAt = createdAt;
  const currentText = group.dataset.content || '';
  editingImageUrl = group.dataset.image_url || null;
  document.getElementById('edit-banner').classList.add('show');
  document.getElementById('edit-banner-text').textContent =
    currentText.slice(0, 60) + (currentText.length > 60 ? '...' : '');
  const input = document.getElementById('msg-input');
  input.value = currentText;
  input.focus();
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  const btn = document.getElementById('send-btn');
  btn.innerHTML = '<i class="fas fa-check"></i>';
  btn.classList.add('editing');
  document.getElementById('input-hint').textContent = 'edit message · esc to cancel';
  if (editingImageUrl) {
    document.getElementById('image-preview').src = editingImageUrl;
    document.getElementById('image-preview-size').textContent = 'existing';
    document.getElementById('edit-image-label').style.display = 'block';
    document.getElementById('image-preview-wrap').classList.add('show');
  } else {
    window.removeImage();
  }
  window.cancelReply();
  closeMentionPanel();
};

window.cancelEditMode = function() {
  if (!editingId) return;
  editingId = null;
  editingMsgCreatedAt = null;
  editingImageUrl = null;
  document.getElementById('edit-banner').classList.remove('show');
  const input = document.getElementById('msg-input');
  input.value = '';
  input.style.height = 'auto';
  const btn = document.getElementById('send-btn');
  btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  btn.classList.remove('editing');
  document.getElementById('input-hint').textContent = 'enter to send · shift+enter for new line · @ to mention';
  window.removeImage();
  closeMentionPanel();
};

async function saveEdit() {
  if (!editingId) return;
  const input = document.getElementById('msg-input');
  const newText = input.value.trim();
  if (!newText && !pendingImageFile && !editingImageUrl) {
    window.showToast('Message cannot be empty', 'error');
    return;
  }
  if (!canEditMessage(editingMsgCreatedAt)) {
    window.showToast('Edit window expired (15 min)', 'error');
    window.cancelEditMode();
    return;
  }

  let image_url = editingImageUrl;
  if (pendingImageFile) {
    const ext = pendingImageFile.name.split('.').pop();
    const path = `${window.session.user.id}/${Date.now()}_chat.${ext}`;
    const { error: upErr } = await window.supabaseClient.storage
      .from('post-images').upload(path, pendingImageFile, { contentType: pendingImageFile.type });
    if (upErr) { window.showToast('Image upload failed: ' + upErr.message, 'error'); return; }
    const { data: urlData } = window.supabaseClient.storage.from('post-images').getPublicUrl(path);
    image_url = urlData.publicUrl;
    pendingImageFile = null;
    document.getElementById('image-preview-wrap').classList.remove('show');
  }

  const updateData = { content: newText || '📷', edited: true };
  if (image_url !== editingImageUrl || pendingImageFile) updateData.image_url = image_url;
  if (!document.getElementById('image-preview-wrap').classList.contains('show') && !editingImageUrl) {
    updateData.image_url = null;
  }

  const table = activeChat.type === 'global' ? 'messages'
             : activeChat.type === 'dm' ? 'dm_messages'
             : 'gc_messages';

  const { error } = await window.supabaseClient.from(table)
    .update(updateData)
    .eq('id', editingId)
    .eq('user_id', window.session.user.id);

  if (error) { window.showToast('Edit failed: ' + error.message, 'error'); return; }

  const group = document.querySelector(`.msg-group[data-id="${editingId}"]`);
  if (group) {
    group.dataset.content = newText;
    group.dataset.image_url = image_url || '';
  }

  if (activeChat && activeChat.type !== 'global') {
    await loadConversations();
    renderInbox();
  }

  window.cancelEditMode();
  window.showToast('Message edited ✅', 'success');
}

// ═══════════════════════════════════════════════════════════
// ── REPLY ──
// ═══════════════════════════════════════════════════════════
window.startReply = function(id, uname, content) {
  if (editingId) window.cancelEditMode();
  replyTo = { id, username: uname, content };
  document.getElementById('reply-banner').classList.add('show');
  document.getElementById('reply-banner-who').textContent = 'replying to ' + uname;
  document.getElementById('reply-banner-text').textContent = content;
  document.getElementById('msg-input').focus();
  closeMentionPanel();
};
window.cancelReply = function() {
  replyTo = null;
  document.getElementById('reply-banner').classList.remove('show');
};
window.scrollToMsg = function(id) {
  const el = document.querySelector(`.msg-group[data-id="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.background = 'rgba(74,158,255,0.06)';
  setTimeout(() => { el.style.background = ''; }, 1200);
};

// ═══════════════════════════════════════════════════════════
// ── DELETE ──
// ═══════════════════════════════════════════════════════════
window.deleteMsg = async function(id) {
  if (!confirm('Delete this message? No undo.')) return;
  const table = activeChat.type === 'global' ? 'messages'
             : activeChat.type === 'dm' ? 'dm_messages'
             : 'gc_messages';
  const { error } = await window.supabaseClient.from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', window.session.user.id);
  if (error) { window.showToast('Delete failed: ' + error.message, 'error'); return; }
  document.querySelector(`.msg-group[data-id="${id}"]`)?.remove();

  if (activeChat && activeChat.type !== 'global') {
    await loadConversations();
    renderInbox();
  }
  attachAllReceipts();
  window.showToast('Message deleted', 'success');
};

// ═══════════════════════════════════════════════════════════
// ── EMOJI PICKER ──
// ═══════════════════════════════════════════════════════════
function initEmojiPicker() {
  if (emojiPickerInitialized) return;
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  const frag = document.createDocumentFragment();
  EMOJIS.forEach(e => {
    const span = document.createElement('span');
    span.textContent = e;
    span.onclick = () => insertEmoji(e);
    frag.appendChild(span);
  });
  grid.appendChild(frag);
  emojiPickerInitialized = true;
}
function positionEmojiPicker() {
  const picker = document.getElementById('emoji-picker');
  const inputBox = document.getElementById('input-box');
  if (!picker || !inputBox) return;
  const rect = inputBox.getBoundingClientRect();
  const pickerHeight = 280;
  if (rect.top >= pickerHeight + 16) {
    picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    picker.style.top = 'auto';
  } else {
    picker.style.top = (rect.bottom + 8) + 'px';
    picker.style.bottom = 'auto';
  }
  picker.style.left = rect.left + 'px';
  picker.style.width = Math.min(rect.width, 360) + 'px';
}
window.toggleEmojiPicker = function(e) {
  if (e) e.stopPropagation();
  const picker = document.getElementById('emoji-picker');
  if (!picker) return;
  if (!emojiPickerInitialized) initEmojiPicker();
  if (picker.classList.contains('open')) picker.classList.remove('open');
  else {
    positionEmojiPicker();
    picker.classList.add('open');
    closeMentionPanel();
    closeContextMenu();
  }
};
function insertEmoji(emoji) {
  const input = document.getElementById('msg-input');
  const pos = input.selectionStart ?? input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  input.selectionStart = input.selectionEnd = pos + emoji.length;
  input.focus();
}

// ═══════════════════════════════════════════════════════════
// ── MENTION PANEL ──
// ═══════════════════════════════════════════════════════════
function positionMentionPanel() {
  const panel = document.getElementById('mention-panel');
  const inputBox = document.getElementById('input-box');
  if (!panel || !inputBox) return;
  const rect = inputBox.getBoundingClientRect();
  const panelHeight = 260;
  if (rect.top >= panelHeight + 16) {
    panel.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    panel.style.top = 'auto';
  } else {
    panel.style.top = (rect.bottom + 8) + 'px';
    panel.style.bottom = 'auto';
  }
  panel.style.left = rect.left + 'px';
  panel.style.width = Math.min(rect.width, 360) + 'px';
}
function renderMentionPanel() {
  const list = document.getElementById('mention-list');
  if (!list) return;
  if (mentionMatches.length === 0) { closeMentionPanel(); return; }
  list.innerHTML = '';
  mentionMatches.forEach((u, idx) => {
    const row = document.createElement('div');
    row.className = 'mention-row' + (idx === mentionSelectedIndex ? ' selected' : '');
    const av = document.createElement('div');
    av.className = 'mention-avatar';
    const sp = document.createElement('span');
    sp.textContent = (u.username?.[0] || '?').toUpperCase();
    av.appendChild(sp);
    if (u.pfp_url) {
      const img = document.createElement('img');
      img.src = u.pfp_url;
      img.onload = () => { img.classList.add('loaded'); sp.style.display = 'none'; };
      img.onerror = () => img.remove();
      av.appendChild(img);
    }
    row.appendChild(av);
    const text = document.createElement('div');
    text.className = 'mention-text';
    const dn = document.createElement('div');
    dn.className = 'mention-display';
    dn.textContent = u.display_name || u.username;
    const un = document.createElement('div');
    un.className = 'mention-username';
    un.textContent = '@' + u.username;
    text.appendChild(dn); text.appendChild(un);
    row.appendChild(text);
    row.onclick = (e) => { e.stopPropagation(); selectMention(u); };
    row.onmouseenter = () => { mentionSelectedIndex = idx; renderMentionPanel(); };
    list.appendChild(row);
  });
}
function openMentionPanel() {
  const panel = document.getElementById('mention-panel');
  if (!panel) return;
  if (!mentionPanelOpen) {
    mentionPanelOpen = true;
    positionMentionPanel();
    panel.classList.add('open');
  }
}
function closeMentionPanel() {
  const panel = document.getElementById('mention-panel');
  if (!panel) return;
  panel.classList.remove('open');
  mentionPanelOpen = false;
  mentionMatches = [];
  mentionSelectedIndex = 0;
  mentionQueryStart = -1;
}
function selectMention(user) {
  const input = document.getElementById('msg-input');
  const value = input.value;
  const cursorPos = input.selectionStart ?? value.length;
  if (mentionQueryStart < 0) return;
  const before = value.slice(0, mentionQueryStart);
  const after = value.slice(cursorPos);
  const inserted = `@${user.username} `;
  input.value = before + inserted + after;
  const newPos = (before + inserted).length;
  input.selectionStart = input.selectionEnd = newPos;
  input.focus();
  closeMentionPanel();
}
function updateMentionPanelForInput() {
  const input = document.getElementById('msg-input');
  const value = input.value;
  const cursorPos = input.selectionStart ?? value.length;
  const beforeCursor = value.slice(0, cursorPos);
  const lastAt = beforeCursor.lastIndexOf('@');
  if (lastAt === -1) { closeMentionPanel(); return; }
  const between = beforeCursor.slice(lastAt + 1);
  if (!/^[a-zA-Z0-9_]*$/.test(between)) { closeMentionPanel(); return; }
  mentionQueryStart = lastAt;
  const q = between.toLowerCase();
  const matches = Object.values(profilesIndex).filter(p => {
    if (!p || p.username === username) return false;
    const u = (p.username || '').toLowerCase();
    const d = (p.display_name || '').toLowerCase();
    return u.includes(q) || d.includes(q);
  }).slice(0, 5);
  mentionMatches = matches;
  if (mentionMatches.length === 0) { closeMentionPanel(); return; }
  mentionSelectedIndex = 0;
  renderMentionPanel();
  openMentionPanel();
}

// ═══════════════════════════════════════════════════════════
// ── IMAGE HANDLERS ──
// ═══════════════════════════════════════════════════════════
window.handleImageUpload = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > MAX_IMAGE_SIZE) {
    window.showToast(`Image too large (${(file.size/1024).toFixed(0)}KB). Max 500KB 💀`, 'error');
    e.target.value = '';
    return;
  }
  pendingImageFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('image-preview').src = ev.target.result;
    document.getElementById('image-preview-size').textContent = (file.size / 1024).toFixed(1) + ' KB';
    document.getElementById('edit-image-label').style.display = 'none';
    document.getElementById('image-preview-wrap').classList.add('show');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};
window.removeImage = function() {
  pendingImageFile = null;
  editingImageUrl = null;
  document.getElementById('image-preview-wrap').classList.remove('show');
  document.getElementById('image-preview').src = '';
  document.getElementById('edit-image-label').style.display = 'none';
};
window.insertNewline = function() {
  const input = document.getElementById('msg-input');
  const pos = input.selectionStart;
  input.value = input.value.slice(0, pos) + '\n' + input.value.slice(pos);
  input.selectionStart = input.selectionEnd = pos + 1;
  input.focus();
};
window.openChatImageModal = function(url) {
  const modal = document.getElementById('chat-img-modal');
  document.getElementById('chat-modal-img').src = url;
  modal.classList.add('show');
};
window.closeChatImageModal = function() {
  document.getElementById('chat-img-modal').classList.remove('show');
};

// ═══════════════════════════════════════════════════════════
// ── CONTEXT MENU ──
// ═══════════════════════════════════════════════════════════
function openContextMenu(msgId) {
  const group = document.querySelector(`.msg-group[data-id="${msgId}"]`);
  if (!group) return;
  contextMenuOpen = true;
  const menu = document.getElementById('context-menu');
  const body = menu.querySelector('.ctx-menu-body');
  body.innerHTML = '';
  const isOwn = group.classList.contains('own');
  const content = group.dataset.content || '';
  const createdAt = group.dataset.created_at;
  const canEdit = isOwn && canEditMessage(createdAt);
  const displayName = group.dataset.display_name || group.dataset.username;

  const replyBtn = document.createElement('button');
  replyBtn.className = 'ctx-item';
  replyBtn.innerHTML = '<i class="fas fa-reply"></i> Reply';
  replyBtn.onclick = () => { closeContextMenu(); window.startReply(msgId, displayName, maskBadWords(content).slice(0, 80)); };
  body.appendChild(replyBtn);

  const copyBtn = document.createElement('button');
  copyBtn.className = 'ctx-item';
  copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
  copyBtn.onclick = async () => {
    closeContextMenu();
    try { await navigator.clipboard.writeText(content); window.showToast('copied 📋', 'success'); }
    catch { window.showToast('copy failed', 'error'); }
  };
  body.appendChild(copyBtn);

  if (isOwn) {
    const editBtn = document.createElement('button');
    editBtn.className = 'ctx-item' + (!canEdit ? ' disabled' : '');
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit' + (!canEdit ? ' <span style="opacity:0.5;font-size:0.7rem">(expired)</span>' : '');
    if (canEdit) editBtn.onclick = () => { closeContextMenu(); window.startEditMode(msgId); };
    body.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'ctx-item danger';
    delBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    delBtn.onclick = () => { closeContextMenu(); window.deleteMsg(msgId); };
    body.appendChild(delBtn);
  }
  menu.classList.add('open');
}
function closeContextMenu() {
  const menu = document.getElementById('context-menu');
  if (menu) menu.classList.remove('open');
  contextMenuOpen = false;
}
function attachContextTrigger(group, msgId) {
  group.addEventListener('dblclick', (e) => {
    if (chatLayout !== 'meta') return;
    e.preventDefault(); e.stopPropagation();
    openContextMenu(msgId);
  });
  const startTouch = (e) => {
    if (chatLayout !== 'meta') return;
    if (e.target.closest('button, a, img')) return;
    if (e.target.closest('.reply-quote')) return;
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      openContextMenu(msgId);
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  };
  const cancelTouch = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
  group.addEventListener('touchstart', startTouch, { passive: true });
  group.addEventListener('touchend', cancelTouch);
  group.addEventListener('touchcancel', cancelTouch);
  group.addEventListener('mousedown', (e) => {
    if (chatLayout !== 'meta') return;
    if (e.button !== 0) return;
    if (e.target.closest('button, a, img')) return;
    if (e.target.closest('.reply-quote')) return;
    longPressStartPos = { x: e.clientX, y: e.clientY };
    longPressTimer = setTimeout(() => {
      longPressTimer = null;
      openContextMenu(msgId);
    }, LONG_PRESS_MS);
  });
  group.addEventListener('mouseup', () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } longPressStartPos = null; });
  group.addEventListener('mousemove', (e) => {
    if (!longPressStartPos) return;
    const dx = Math.abs(e.clientX - longPressStartPos.x);
    const dy = Math.abs(e.clientY - longPressStartPos.y);
    if (dx > 15 || dy > 15) {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      longPressStartPos = null;
    }
  });
}

// ═══════════════════════════════════════════════════════════
// ── GLOBAL CLICK HANDLERS ──
// ═══════════════════════════════════════════════════════════
document.addEventListener('click', (e) => {
  const picker = document.getElementById('emoji-picker');
  if (picker && picker.classList.contains('open')) {
    if (!picker.contains(e.target) && !e.target.closest('#emoji-btn')) picker.classList.remove('open');
  }
  if (mentionPanelOpen) {
    const panel = document.getElementById('mention-panel');
    if (panel && !panel.contains(e.target) && e.target.id !== 'msg-input') closeMentionPanel();
  }
  if (contextMenuOpen) {
    const menu = document.getElementById('context-menu');
    if (menu && !menu.contains(e.target) && !e.target.closest('.msg-group')) closeContextMenu();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('emoji-picker')?.classList.remove('open');
    closeMentionPanel();
    closeContextMenu();
    if (editingId) window.cancelEditMode();
    window.closeChatImageModal();
    const noteModal = document.getElementById('note-modal');
    if (noteModal && noteModal.classList.contains('show')) window.closeNoteModal();
  }
});
window.addEventListener('scroll', () => {
  const ep = document.getElementById('emoji-picker');
  if (ep && ep.classList.contains('open')) positionEmojiPicker();
  if (mentionPanelOpen) positionMentionPanel();
}, { passive: true });
window.addEventListener('resize', () => {
  const ep = document.getElementById('emoji-picker');
  if (ep && ep.classList.contains('open')) positionEmojiPicker();
  if (mentionPanelOpen) positionMentionPanel();
});

// ═══════════════════════════════════════════════════════════
// ── BACK BUTTON (mobile) ──
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const backBtn = document.getElementById('chat-back-btn');
  if (backBtn) backBtn.onclick = () => { closeChat(); };

  const noteInput = document.getElementById('note-input');
  if (noteInput) noteInput.addEventListener('input', updateNoteCharCount);
});

// ═══════════════════════════════════════════════════════════
// ── INPUT HANDLERS ──
// ═══════════════════════════════════════════════════════════
function initMsgInput() {
  const ta = document.getElementById('msg-input');
  if (!ta) return;
  ta.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
    updateMentionPanelForInput();
  });
  ta.addEventListener('keydown', e => {
    if (mentionPanelOpen && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mentionSelectedIndex = (mentionSelectedIndex + 1) % mentionMatches.length; renderMentionPanel(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); mentionSelectedIndex = (mentionSelectedIndex - 1 + mentionMatches.length) % mentionMatches.length; renderMentionPanel(); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectMention(mentionMatches[mentionSelectedIndex]); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeMentionPanel(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendMsg(); }
    if (e.key === 'Escape' && editingId) window.cancelEditMode();
  });
  ta.addEventListener('blur', () => { setTimeout(() => { if (mentionPanelOpen) closeMentionPanel(); }, 200); });
  ta.addEventListener('click', () => updateMentionPanelForInput());
}

// ═══════════════════════════════════════════════════════════
// ── CHAT AD DEBUG HOOKS ──
// ═══════════════════════════════════════════════════════════
window.openChatAdView = openChatAdView;
window.closeChatAdView = closeChatAdView;
window.refreshChatAds = () => {
  renderInbox();
};

// ═══════════════════════════════════════════════════════════
// ── PAGE INIT ──
// ═══════════════════════════════════════════════════════════
async function pageInit() {
  definePageSteps();
  nextLoadingStep();
  loadChatLayout();
  await loadBadWords();

  nextLoadingStep();
  nextLoadingStep();
  nextLoadingStep();

  requestNotificationPermission();
  document.addEventListener('visibilitychange', () => {
    isPageVisible = !document.hidden;
    if (isPageVisible) {
      unreadCount = 0;
      document.title = 'CESC Hub — Chat';
      if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {});
      window.updateLastSeen?.();
    }
  });

  const sess = window.session;
  if (!sess) return;

  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('username, display_name, pfp_url')
    .eq('id', window.session.user.id)
    .single();

  if (window.currentUser) {
    window.currentUser.username = profile?.username || window.currentUser.username;
    window.currentUser.display_name = profile?.display_name || profile?.username;
    window.currentUser.pfp_url = profile?.pfp_url || null;
  }

  username = window.currentUser.username || 'user';
  currentDisplayName = window.currentUser.display_name || username;
  myPfpUrl = window.currentUser.pfp_url || null;
  myUserId = window.session.user.id;

  const chipName = document.getElementById('chip-name');
  const ddName = document.getElementById('dd-name');
  const chipInitial = document.getElementById('chip-initial');
  if (chipName) chipName.textContent = currentDisplayName;
  if (ddName) ddName.textContent = currentDisplayName;
  if (chipInitial) chipInitial.textContent = (currentDisplayName[0] || '?').toUpperCase();
  if (myPfpUrl) {
    const av = document.getElementById('chip-av');
    if (av) {
      const initial = av.querySelector('span');
      const img = document.createElement('img');
      img.src = myPfpUrl;
      img.onload = () => { img.classList.add('loaded'); if (initial) initial.style.display = 'none'; };
      img.onerror = () => img.remove();
      av.appendChild(img);
    }
  }

  await loadProfilesIndex();

  nextLoadingStep();
  await loadConversations();
  renderInbox();
  setupInboxRealtime();
  setupProfilesRealtime();

  await loadNotes();
  setupNotesRealtime();

  // ── Start rotation for pseudo-DM (bottom slot is rendered by renderInbox) ──
  startChatAdRotation();

  nextLoadingStep();
  nextLoadingStep();

  initSearchInput();
  initMsgInput();

  nextLoadingStep();

  const slug = parseChatRoute();
  if (slug) {
    await openChatBySlug(slug);
  } else {
    closeChat();
  }
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  teardownRealtime();
  stopActiveStatusTicker();
  stopChatAdRotation();
  if (inboxChannel) { window.supabaseClient.removeChannel(inboxChannel); inboxChannel = null; }
  if (notesChannel) { window.supabaseClient.removeChannel(notesChannel); notesChannel = null; }
  if (profilesChannel) { window.supabaseClient.removeChannel(profilesChannel); profilesChannel = null; }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initPage(pageInit));
} else {
  initPage(pageInit);
}