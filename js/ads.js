/* ═══════════════════════════════════════════════════════════
   CESC HUB — AD ENGINE
   Central ad system: fetch, render, click, impression, rotate, pulse
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // ── CONSTANTS ──
  // ═══════════════════════════════════════════════════════════
  const DISMISS_KEY = 'cesc_ad_dismissed';        // { [adId]: expiresAtMs }
  const SEEN_CHAT_KEY = 'cesc_ad_chat_seen';       // { adId: lastSeenMs }
  const CLICKED_KEY = 'cesc_ad_clicked';           // { adId: true } — session-scoped
  const ROTATE_MS = 10 * 60 * 1000;                // 10 min rotation (chat ads only)
  const DISMISS_MS = 24 * 60 * 60 * 1000;          // 24h dismiss
  const FEED_MIN_GAP = 5;
  const FEED_MAX_GAP = 10;

  // Pulse timing
  const PULSE_1_MS = 8 * 1000;                     // 8s after visible
  const PULSE_2_MS = 30 * 1000;                    // 30s after visible
  const PULSE_1_DURATION = 1500;                   // CSS animation length
  const PULSE_2_DURATION = 1500;

  // ═══════════════════════════════════════════════════════════
  // ── STATE ──
  // ═══════════════════════════════════════════════════════════
  let adsCache = [];
  let adsLoaded = false;
  let adsLoading = false;
  let adsRealtimeChannel = null;
  let rotateTimer = null;

  const impressionsLoggedThisSession = new Set();

  // ═══════════════════════════════════════════════════════════
  // ── UTILITIES ──
  // ═══════════════════════════════════════════════════════════

  function getClient() {
    return window.supabaseClient || null;
  }

  function getSession() {
    return window.session || null;
  }

  function isLoggedIn() {
    return !!getSession();
  }

  function escapeHTML(s) {
    if (window.escapeHTML) return window.escapeHTML(s);
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  function log(...args) {
    if (window.CESC_AD_DEBUG) console.log('[Ads]', ...args);
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch { return false; }
  }

  function loadDismissMap() {
    try {
      const map = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
      // One-time cleanup: since we no longer have dismiss buttons on
      // non-chat placements, purge any stale dismissals so ads show up
      // for users who dismissed them in an earlier version.
      if (Object.keys(map).length > 0) {
        try { localStorage.removeItem(DISMISS_KEY); } catch {}
        return {};
      }
      return map;
    } catch { return {}; }
  }
  function saveDismissMap(map) {
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(map)); } catch {}
  }
  function isDismissed(adId) {
    const map = loadDismissMap();
    const exp = map[adId];
    if (!exp) return false;
    if (Date.now() > exp) {
      delete map[adId];
      saveDismissMap(map);
      return false;
    }
    return true;
  }
  function dismissAd(adId) {
    const map = loadDismissMap();
    map[adId] = Date.now() + DISMISS_MS;
    saveDismissMap(map);
  }

  // ── Chat pseudo-DM seen map (30 min throttle) ──
  function loadChatSeenMap() {
    try { return JSON.parse(localStorage.getItem(SEEN_CHAT_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveChatSeenMap(map) {
    try { localStorage.setItem(SEEN_CHAT_KEY, JSON.stringify(map)); } catch {}
  }
  function canShowChatAd(adId) {
    const map = loadChatSeenMap();
    // Global cooldown: if ANY ad was seen recently, no ads show
    if (map['_global'] && Date.now() - map['_global'] < ROTATE_MS) return false;
    const last = map[adId] || 0;
    return Date.now() - last > ROTATE_MS;
  }
  function markChatAdSeen(adId) {
    const map = loadChatSeenMap();
    map[adId] = Date.now();
    // Also set a global cooldown timestamp so no other chat ad
    // sneaks in right after the user closed one
    map['_global'] = Date.now();
    saveChatSeenMap(map);
  }

  // ── Session-scoped "user clicked this ad" map — stop pulsing after click ──
  function loadClickedMap() {
    try { return JSON.parse(sessionStorage.getItem(CLICKED_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveClickedMap(map) {
    try { sessionStorage.setItem(CLICKED_KEY, JSON.stringify(map)); } catch {}
  }
  function hasClickedThisSession(adId) {
    return !!loadClickedMap()[adId];
  }
  function markClicked(adId) {
    const map = loadClickedMap();
    map[adId] = true;
    saveClickedMap(map);
  }

  // ═══════════════════════════════════════════════════════════
  // ── FETCH ──
  // ═══════════════════════════════════════════════════════════

  async function fetchAds() {
    if (adsLoading) return adsCache;
    adsLoading = true;

    const client = getClient();
    if (!client) {
      adsLoading = false;
      return [];
    }

    try {
      const { data, error } = await client
        .from('ads')
        .select('id, advertiser_username, advertiser_display_name, advertiser_pfp_url, title, description, image_wide_url, image_square_url, link_url, cta_text, badge_text, weight, placements')
        .eq('active', true)
        .order('weight', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        log('fetch error:', error.message);
        adsLoading = false;
        return [];
      }

      adsCache = (data || []).filter(a => {
        if (!a.image_wide_url) return false;
        if (!a.weight || a.weight < 1) return false;
        return true;
      });

      adsLoaded = true;
      log('fetched', adsCache.length, 'active ads');
      adsLoading = false;
      return adsCache;
    } catch (e) {
      log('fetch exception:', e);
      adsLoading = false;
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ── WEIGHTED RANDOM PICK ──
  // ═══════════════════════════════════════════════════════════

  function pickWeightedAd(ads, { excludeIds = [], placement = null } = {}) {
    let pool = ads.filter(a => {
      if (excludeIds.includes(a.id)) return false;
      // NOTE: dismissal is no longer enforced for non-chat placements
      // because we removed the dismiss ✕ buttons from feed/sidebar/etc.
      // Chat pseudo-DM uses canShowChatAd() separately.
      if (placement) {
        const p = a.placements || [];
        if (!Array.isArray(p) || !p.includes(placement)) return false;
      }
      return true;
    });

    if (pool.length === 0) return null;

    const totalWeight = pool.reduce((sum, a) => sum + (a.weight || 1), 0);
    let r = Math.random() * totalWeight;
    for (const ad of pool) {
      r -= (ad.weight || 1);
      if (r <= 0) return ad;
    }
    return pool[pool.length - 1];
  }

  // ═══════════════════════════════════════════════════════════
  // ── RENDERING HELPERS ──
  // ═══════════════════════════════════════════════════════════

  function pickImage(ad, prefer = 'wide') {
    if (prefer === 'square' && ad.image_square_url) return ad.image_square_url;
    if (prefer === 'square' && ad.image_wide_url) return ad.image_wide_url;
    return ad.image_wide_url || ad.image_square_url || '';
  }

  function createAdBadge(ad) {
    const badge = document.createElement('span');
    badge.className = 'ad-badge';
    badge.textContent = ad.badge_text || 'Sponsored';
    return badge;
  }

  function createDismissBtn(adId, onDismiss) {
    const btn = document.createElement('button');
    btn.className = 'ad-dismiss-btn';
    btn.title = 'Hide this ad for 24h';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      dismissAd(adId);
      if (typeof onDismiss === 'function') onDismiss();
    };
    return btn;
  }

  // ═══════════════════════════════════════════════════════════
  // ── CLICK + IMPRESSION LOGGING ──
  // ═══════════════════════════════════════════════════════════

  async function logClick(adId, placement) {
    markClicked(adId);

    const client = getClient();
    if (!client || !isLoggedIn()) return;

    try {
      const { data, error } = await client.rpc('bump_ad_click', {
        p_ad_id: adId,
        p_placement: placement
      });
      if (error) { log('click RPC error:', error.message); return; }
      log('click logged:', data);
    } catch (e) {
      log('click exception:', e);
    }
  }

  async function logImpression(adId) {
    if (!adId) return;
    if (impressionsLoggedThisSession.has(adId)) return;
    impressionsLoggedThisSession.add(adId);

    const client = getClient();
    if (!client || !isLoggedIn()) return;

    try {
      const { data, error } = await client.rpc('bump_ad_impression', {
        p_ad_id: adId
      });
      if (error) { log('impression RPC error:', error.message); return; }
      log('impression logged:', data);
    } catch (e) {
      log('impression exception:', e);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ── OBSERVER: impression + pulse timers ──
  // ═══════════════════════════════════════════════════════════

  /**
   * Attaches IntersectionObserver to an ad element.
   * Fires:
   *   - impression (once per session)
   *   - pulse 1 at 8s visible (once per session, unless already clicked)
   *   - pulse 2 at 30s visible (once per session, unless already clicked)
   *
   * Pulses can re-trigger if the ad scrolls away and back after >2 min
   * (handled by clearing & restarting timers via a lastHiddenAt timestamp).
   */
  function observeImpression(el, adId, opts = {}) {
    if (!el || !adId) return;

    const enablePulse1 = opts.pulse1 !== false;
    const enablePulse2 = opts.pulse2 !== false;

    // Skip pulses entirely if user already clicked this ad this session
    const alreadyClicked = hasClickedThisSession(adId);
    const skipPulse = alreadyClicked || prefersReducedMotion();

    let pulse1Timer = null;
    let pulse2Timer = null;
    let impressionDone = false;
    let lastHiddenAt = 0;
    const RETRIGGER_COOLDOWN_MS = 2 * 60 * 1000; // 2 min

    const clearTimers = () => {
      if (pulse1Timer) { clearTimeout(pulse1Timer); pulse1Timer = null; }
      if (pulse2Timer) { clearTimeout(pulse2Timer); pulse2Timer = null; }
    };

    const firePulse = (n) => {
      const cls = 'ad-pulse-' + n;
      el.classList.remove(cls);
      void el.offsetWidth; // restart animation
      el.classList.add(cls);
      const dur = n === 1 ? PULSE_1_DURATION : PULSE_2_DURATION;
      setTimeout(() => el.classList.remove(cls), dur);
    };

    const schedulePulses = () => {
      if (skipPulse) return;

      // Was this ad clicked since we last scheduled? Bail out.
      if (hasClickedThisSession(adId)) return;

      if (enablePulse1 && !pulse1Timer && !el.dataset.pulse1Done) {
        pulse1Timer = setTimeout(() => {
          pulse1Timer = null;
          if (hasClickedThisSession(adId)) return;
          el.dataset.pulse1Done = '1';
          firePulse(1);
        }, PULSE_1_MS);
      }

      if (enablePulse2 && !pulse2Timer && !el.dataset.pulse2Done) {
        pulse2Timer = setTimeout(() => {
          pulse2Timer = null;
          if (hasClickedThisSession(adId)) return;
          el.dataset.pulse2Done = '1';
          firePulse(2);
        }, PULSE_2_MS);
      }
    };

    const onVisible = () => {
      // Impression
      if (!impressionDone) {
        impressionDone = true;
        logImpression(adId);
      }

      // Reset pulses if re-entered after cooldown
      if (lastHiddenAt && Date.now() - lastHiddenAt > RETRIGGER_COOLDOWN_MS) {
        delete el.dataset.pulse1Done;
        delete el.dataset.pulse2Done;
      }

      schedulePulses();
    };

    const onHidden = () => {
      lastHiddenAt = Date.now();
      clearTimers();
    };

    if (!('IntersectionObserver' in window)) {
      // Fallback: impression only, no pulses
      if (!impressionDone) {
        impressionDone = true;
        logImpression(adId);
      }
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const rect = entry.target.getBoundingClientRect();
          if (rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight) {
            onVisible();
          }
        } else {
          onHidden();
        }
      });
    }, { threshold: 0.5 });

    obs.observe(el);
  }

  // Open ad link in new tab + log click
  function handleAdLinkClick(ad, placement, onAfterClick) {
    logClick(ad.id, placement);
    try {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      log('open error:', e);
    }
    if (typeof onAfterClick === 'function') onAfterClick();
  }

  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — FEED INJECTION ──
  // ═══════════════════════════════════════════════════════════

  function mountFeedInjection(feedEl, opts = {}) {
    if (!feedEl) return;
    if (!adsCache.length) return;

    feedEl.querySelectorAll('.ad-card-feed').forEach(el => el.remove());

    const ad = pickWeightedAd(adsCache, { placement: 'feed' });
    if (!ad) return;

    const posts = Array.from(feedEl.children).filter(el => !el.classList.contains('ad-card-feed'));
    if (posts.length < 3) return;

    const gap = Math.floor(Math.random() * (FEED_MAX_GAP - FEED_MIN_GAP + 1)) + FEED_MIN_GAP;
    const insertAfter = Math.min(gap, posts.length - 1);
    const target = posts[insertAfter];

    const card = buildFeedAdCard(ad);
    if (target && target.nextSibling) {
      feedEl.insertBefore(card, target.nextSibling);
    } else {
      feedEl.appendChild(card);
    }

    observeImpression(card, ad.id);
  }

  function buildFeedAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'ad-card-feed';

    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const wide = pickImage(ad, 'wide');

    card.innerHTML = `
      <div class="ad-card-top">
        <div class="ad-card-avatar">
          ${ad.advertiser_pfp_url
            ? `<img src="${escapeHTML(ad.advertiser_pfp_url)}" alt="${escapeHTML(displayName)}" onerror="this.remove()"/>`
            : `<span>${escapeHTML((displayName[0] || '?').toUpperCase())}</span>`}
        </div>
        <div class="ad-card-meta">
          <div class="ad-card-name">${escapeHTML(displayName)}</div>
          <div class="ad-card-badge-row"></div>
        </div>
      </div>
      <div class="ad-card-body">
        <img class="ad-card-img" src="${escapeHTML(wide)}" alt="${escapeHTML(ad.title)}" loading="lazy" onerror="this.parentElement.remove()"/>
        <div class="ad-card-title">${escapeHTML(ad.title)}</div>
        ${ad.description ? `<div class="ad-card-desc">${escapeHTML(ad.description)}</div>` : ''}
      </div>
      <div class="ad-card-foot">
        <button class="ad-card-cta" type="button">
          <i class="fas fa-external-link-alt"></i> ${escapeHTML(ad.cta_text || 'Learn more')}
        </button>
      </div>
    `;

        const badgeRow = card.querySelector('.ad-card-badge-row');
    if (badgeRow) badgeRow.appendChild(createAdBadge(ad));

    const clickTarget = card.querySelector('.ad-card-body');
    const ctaBtn = card.querySelector('.ad-card-cta');

    const fireClick = () => handleAdLinkClick(ad, 'feed');

    clickTarget?.addEventListener('click', (e) => {
      if (e.target.closest('.ad-dismiss-btn')) return;
      fireClick();
    });
    ctaBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      fireClick();
    });

    return card;
  }

  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — INBOX BOTTOM SLOT ──
  // ═══════════════════════════════════════════════════════════

  function mountInboxSlot(slotEl) {
    if (!slotEl) return;
    if (!adsCache.length) return;

    renderInboxSlot(slotEl);

    if (!rotateTimer) {
      rotateTimer = setInterval(() => {
        const slots = document.querySelectorAll('.inbox-ad-slot, .sidebar-ad-slot');
        slots.forEach(s => renderSlotForElement(s));
      }, ROTATE_MS);
    }
  }

  function renderSlotForElement(slotEl) {
    if (slotEl.classList.contains('inbox-ad-slot')) renderInboxSlot(slotEl);
    else if (slotEl.classList.contains('sidebar-ad-slot')) renderSidebarSlot(slotEl);
  }

  function renderInboxSlot(slotEl) {
    slotEl.innerHTML = '';

    const ad = pickWeightedAd(adsCache, { placement: 'inbox' });
    if (!ad) {
      slotEl.style.display = 'none';
      return;
    }
    slotEl.style.display = '';

    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const img = pickImage(ad, 'square');

    const card = document.createElement('div');
    card.className = 'ad-card-inbox';
    card.innerHTML = `
      <div class="ad-inbox-img-wrap">
        <img src="${escapeHTML(img)}" alt="${escapeHTML(ad.title)}" loading="lazy"/>
      </div>
      <div class="ad-inbox-body">
        <div class="ad-inbox-head">
          <div class="ad-inbox-name">${escapeHTML(displayName)}</div>
        </div>
        <div class="ad-inbox-title">${escapeHTML(ad.title)}</div>
        ${ad.description ? `<div class="ad-inbox-desc">${escapeHTML(ad.description)}</div>` : ''}
        <button class="ad-inbox-cta" type="button">
          ${escapeHTML(ad.cta_text || 'Learn more')} <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    `;

    card.querySelector('.ad-inbox-head').appendChild(createAdBadge(ad));

    card.addEventListener('click', (e) => {
      if (e.target.closest('.ad-dismiss-btn')) return;
      handleAdLinkClick(ad, 'inbox');
    });

    slotEl.appendChild(card);
    observeImpression(card, ad.id);
  }

  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — SIDEBAR SLOT (expanded) ──
  // ═══════════════════════════════════════════════════════════

  function mountSidebarSlot(slotEl) {
    if (!slotEl) return;
    if (!adsCache.length) return;
    renderSidebarSlot(slotEl);
  }

    function renderSidebarSlot(slotEl) {
    slotEl.innerHTML = '';

    const ad = pickWeightedAd(adsCache, { placement: 'sidebar' });
    if (!ad) {
      slotEl.style.display = 'none';
      return;
    }
    slotEl.style.display = '';

    const img = pickImage(ad, 'square');
    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';

    const card = document.createElement('div');
    card.className = 'ad-card-sidebar';
    card.innerHTML = `
      <div class="ad-sidebar-img">
        <img src="${escapeHTML(img)}" alt="${escapeHTML(ad.title)}" loading="lazy"/>
      </div>
      <div class="ad-sidebar-text">
        <div class="ad-sidebar-name">${escapeHTML(displayName)}</div>
        <div class="ad-sidebar-title">${escapeHTML(ad.title)}</div>
      </div>
      <div class="ad-sidebar-badge">Ad</div>
    `;

    card.addEventListener('click', () => {
      handleAdLinkClick(ad, 'sidebar');
    });

    slotEl.appendChild(card);
    observeImpression(card, ad.id, { pulse1: false, pulse2: false });
  }

    // ═══════════════════════════════════════════════════════════
  // ── MOUNT — DOWNBAR MORE DRAWER SLOT (mobile expanded) ──
  // ═══════════════════════════════════════════════════════════

  function mountDownbarSlot(slotEl) {
    if (!slotEl) return;
    if (!adsCache.length) return;
    renderDownbarSlot(slotEl);
  }

  function renderDownbarSlot(slotEl) {
    slotEl.innerHTML = '';

    const ad = pickWeightedAd(adsCache, { placement: 'downbar' });
    if (!ad) {
      slotEl.style.display = 'none';
      return;
    }
    slotEl.style.display = '';

    const img = pickImage(ad, 'square');
    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';

    const card = document.createElement('div');
    card.className = 'ad-card-drawer';
    card.innerHTML = `
      <div class="ad-drawer-img">
        <img src="${escapeHTML(img)}" alt="${escapeHTML(ad.title)}" loading="lazy"/>
      </div>
      <div class="ad-drawer-body">
        <div class="ad-drawer-name">${escapeHTML(displayName)}</div>
        <div class="ad-drawer-title">${escapeHTML(ad.title)}</div>
      </div>
      <div class="ad-drawer-arrow"><i class="fas fa-chevron-right"></i></div>
    `;

    card.addEventListener('click', () => {
      handleAdLinkClick(ad, 'downbar');
    });

    slotEl.appendChild(card);
    observeImpression(card, ad.id, { pulse1: false, pulse2: false });
  }


  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — LOADING SLOT ──
  // ═══════════════════════════════════════════════════════════

  function mountLoadingSlot(slotEl) {
    if (!slotEl) return;
    if (!adsCache.length) return;
    renderLoadingSlot(slotEl);
  }

  function renderLoadingSlot(slotEl) {
    slotEl.innerHTML = '';

    const ad = pickWeightedAd(adsCache, { placement: 'loading' });
    if (!ad) {
      slotEl.style.display = 'none';
      return;
    }
    slotEl.style.display = '';

    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const sq = pickImage(ad, 'square');

    const el = document.createElement('div');
    el.className = 'ad-loading';
    el.innerHTML = `
      <div class="ad-loading-badge">${escapeHTML(ad.badge_text || 'Sponsored')}</div>
      <img class="ad-loading-img" src="${escapeHTML(sq)}" alt="${escapeHTML(ad.title)}"/>
      <div class="ad-loading-text">
        <div class="ad-loading-name">${escapeHTML(displayName)}</div>
        <div class="ad-loading-title">${escapeHTML(ad.title)}</div>
      </div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAdLinkClick(ad, 'loading');
    });

    slotEl.appendChild(el);
    logImpression(ad.id);
  }

  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — PROFILES TILE ──
  // ═══════════════════════════════════════════════════════════

  function mountProfilesSlot(gridEl) {
    if (!gridEl) return;
    if (!adsCache.length) return;

    gridEl.querySelectorAll('.profile-ad-tile').forEach(el => el.remove());

    const ad = pickWeightedAd(adsCache, { placement: 'profiles' });
    if (!ad) return;

    const tile = buildProfilesAdTile(ad);
    const children = Array.from(gridEl.children);
    const insertAfter = children[Math.min(3, children.length - 1)];
    if (insertAfter && insertAfter.nextSibling) {
      gridEl.insertBefore(tile, insertAfter.nextSibling);
    } else {
      gridEl.appendChild(tile);
    }
    observeImpression(tile, ad.id);
  }

  function buildProfilesAdTile(ad) {
    const tile = document.createElement('div');
    tile.className = 'profile-ad-tile';

    const wide = pickImage(ad, 'wide');
    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';

    tile.innerHTML = `
      <div class="ad-tile-badge"></div>
      <div class="ad-tile-img">
        <img src="${escapeHTML(wide)}" alt="${escapeHTML(ad.title)}" loading="lazy"/>
      </div>
      <div class="ad-tile-name">${escapeHTML(displayName)}</div>
      <div class="ad-tile-title">${escapeHTML(ad.title)}</div>
      <button class="ad-tile-cta" type="button">
        ${escapeHTML(ad.cta_text || 'Learn more')}
      </button>
    `;

    tile.querySelector('.ad-tile-badge').appendChild(createAdBadge(ad));

    tile.addEventListener('click', (e) => {
      if (e.target.closest('.ad-dismiss-btn')) return;
      handleAdLinkClick(ad, 'profiles');
    });

    return tile;
  }

  // ═══════════════════════════════════════════════════════════
  // ── MOUNT — NOTIFICATIONS BANNER ──
  // ═══════════════════════════════════════════════════════════

  function mountNotificationsBanner(slotEl) {
    if (!slotEl) return;
    if (!adsCache.length) return;
    renderNotificationsBanner(slotEl);
  }

  function renderNotificationsBanner(slotEl) {
    slotEl.innerHTML = '';

    const ad = pickWeightedAd(adsCache, { placement: 'notifications' });
    if (!ad) {
      slotEl.style.display = 'none';
      return;
    }
    slotEl.style.display = '';

    const img = pickImage(ad, 'square');
    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';

    const banner = document.createElement('div');
    banner.className = 'notif-ad-banner';
    banner.innerHTML = `
      <div class="notif-ad-img">
        <img src="${escapeHTML(img)}" alt="${escapeHTML(ad.title)}" loading="lazy"/>
      </div>
      <div class="notif-ad-body">
        <div class="notif-ad-name">${escapeHTML(displayName)}</div>
        <div class="notif-ad-title">${escapeHTML(ad.title)}</div>
      </div>
      <div class="notif-ad-arrow"><i class="fas fa-chevron-right"></i></div>
    `;

        banner.appendChild(createAdBadge(ad));
    banner.addEventListener('click', () => {
      handleAdLinkClick(ad, 'notifications');
    });

    slotEl.appendChild(banner);
    observeImpression(banner, ad.id);
  }

  // ═══════════════════════════════════════════════════════════
  // ── CHAT — PSEUDO-DM ──
  // ═══════════════════════════════════════════════════════════

  function pickChatAdForInbox(opts = {}) {
    if (!adsCache.length) return null;
    const excludeIds = Array.isArray(opts.excludeIds) ? opts.excludeIds : [];

    const baseFilter = (a) => {
      const p = a.placements || [];
      if (!Array.isArray(p) || !p.includes('chat')) return false;
      if (isDismissed(a.id)) return false;
      if (!canShowChatAd(a.id)) return false;
      return true;
    };

    // Preferred pool: exclude the passed-in ad IDs (avoid duplicates)
    let pool = adsCache.filter(a => baseFilter(a) && !excludeIds.includes(a.id));

    // Fallback: allow duplicates if that's the only option
    if (pool.length === 0) {
      pool = adsCache.filter(baseFilter);
    }

    if (pool.length === 0) return null;

    const total = pool.reduce((s, a) => s + (a.weight || 1), 0);
    let r = Math.random() * total;
    for (const ad of pool) {
      r -= (ad.weight || 1);
      if (r <= 0) return ad;
    }
    return pool[pool.length - 1];
  }

  function buildInboxChatAdRow(ad, onClick) {
    const row = document.createElement('div');
    row.className = 'inbox-row inbox-row-ad';
    row.dataset.adId = ad.id;

    // For the inbox row we prefer the SQUARE ad image (1:1) as the avatar
    // and the ad TITLE as the name — so the advertiser doesn't appear twice
    // (once as a "person", once as the ad content).
    const rowTitle = ad.title || ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const rowAvatarUrl =
      ad.image_square_url ||
      ad.advertiser_pfp_url ||
      ad.image_wide_url ||
      null;

    const initial = (rowTitle[0] || '?').toUpperCase();

    row.innerHTML = `
      <div class="inbox-row-avatar">
        <span>${escapeHTML(initial)}</span>
        ${rowAvatarUrl
          ? `<img src="${escapeHTML(rowAvatarUrl)}" alt="${escapeHTML(rowTitle)}"
              onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'"
              onerror="this.remove()"/>`
          : ''}
      </div>
      <div class="inbox-row-body">
        <div class="inbox-row-name">${escapeHTML(rowTitle)}</div>
        <div class="inbox-row-preview">Sponsored · Tap to view</div>
      </div>
      <div class="inbox-row-meta">
        <div class="ad-badge-inline">Ad</div>
      </div>
    `;

    row.addEventListener('click', () => {
      if (typeof onClick === 'function') onClick(ad);
    });

    observeImpression(row, ad.id, { pulse1: false, pulse2: false });
    return { el: row, ad };
  }

  function renderAdChatView(ad, container, headerEl, bodyEl) {
    if (!ad || !container || !headerEl || !bodyEl) return;

    const displayName = ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const wide = pickImage(ad, 'wide');

    // Match the inbox row: use the SQUARE ad image as the avatar and the
    // ad TITLE as the name so the header stays consistent with the row
    // the user tapped.
    const headerTitle = ad.title || ad.advertiser_display_name || ad.advertiser_username || 'Sponsored';
    const headerAvatarUrl =
      ad.image_square_url ||
      ad.advertiser_pfp_url ||
      ad.image_wide_url ||
      null;
    const headerInitial = (headerTitle[0] || '?').toUpperCase();

    headerEl.innerHTML = `
      <button class="chat-back-btn" title="Back">
        <i class="fas fa-arrow-left"></i>
      </button>
      <div class="chat-head-avatar">
        <span>${escapeHTML(headerInitial)}</span>
        ${headerAvatarUrl
          ? `<img src="${escapeHTML(headerAvatarUrl)}" alt="${escapeHTML(headerTitle)}"
              onload="this.classList.add('loaded');this.previousElementSibling.style.display='none'"
              onerror="this.remove()"/>`
          : ''}
      </div>
      <div class="chat-head-info">
        <div class="chat-head-name">${escapeHTML(headerTitle)}</div>
        <div class="chat-head-sub">Sponsored</div>
      </div>
      <div class="chat-head-actions">
        <button class="chat-head-btn" type="button" title="Close" data-ad-close>
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    bodyEl.innerHTML = `
      <div class="ad-chat-body-inner">
        <div class="ad-chat-img-wrap">
          <img src="${escapeHTML(wide)}" alt="${escapeHTML(ad.title)}"/>
        </div>
        <div class="ad-chat-info">
          <div class="ad-chat-title">${escapeHTML(ad.title)}</div>
          ${ad.description ? `<div class="ad-chat-desc">${escapeHTML(ad.description)}</div>` : ''}
          <button class="ad-chat-cta" type="button">
            <i class="fas fa-external-link-alt"></i> ${escapeHTML(ad.cta_text || 'Learn more')}
          </button>
        </div>
      </div>
    `;

    const imgWrap = bodyEl.querySelector('.ad-chat-img-wrap');
    const ctaBtn = bodyEl.querySelector('.ad-chat-cta');

    const closeView = () => {
      container.style.display = 'none';
      const empty = document.getElementById('chat-empty');
      if (empty) empty.style.display = 'flex';
    };

    const fireClick = () => {
      handleAdLinkClick(ad, 'chat', () => {
        document.querySelector(`.inbox-row-ad[data-ad-id="${ad.id}"]`)?.remove();
        closeView();
        markChatAdSeen(ad.id);
      });
    };

    imgWrap?.addEventListener('click', fireClick);
    ctaBtn?.addEventListener('click', (e) => { e.stopPropagation(); fireClick(); });

    headerEl.querySelector('[data-ad-close]')?.addEventListener('click', closeView);
    headerEl.querySelector('.chat-back-btn')?.addEventListener('click', closeView);

    container.style.display = 'flex';

    // Chat ad pulses (image wrap)
    observeImpression(container, ad.id);
  }

  // ═══════════════════════════════════════════════════════════
  // ── REALTIME ──
  // ═══════════════════════════════════════════════════════════

  function setupRealtime() {
    if (adsRealtimeChannel) return;
    const client = getClient();
    if (!client) return;

    adsRealtimeChannel = client.channel('ads-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, () => {
        fetchAds().then(() => reRenderAll());
      })
      .subscribe();
  }

  function reRenderAll() {
    const feed = document.getElementById('feed');
    if (feed) mountFeedInjection(feed);

    const inboxSlot = document.getElementById('inbox-ad-slot');
    if (inboxSlot) renderInboxSlot(inboxSlot);

    const sidebarSlot = document.getElementById('sidebar-ad-slot');
    if (sidebarSlot) renderSidebarSlot(sidebarSlot);

    const loadingSlot = document.getElementById('loading-ad-slot');
    if (loadingSlot) renderLoadingSlot(loadingSlot);

    const profileGrid = document.getElementById('profile-grid');
    if (profileGrid) mountProfilesSlot(profileGrid);

    const notifSlot = document.getElementById('notifications-ad-slot');
    if (notifSlot) renderNotificationsBanner(notifSlot);
  }

  // ═══════════════════════════════════════════════════════════
  // ── INIT ──
  // ═══════════════════════════════════════════════════════════

  async function init() {
    if (adsLoaded) return adsCache;
    await fetchAds();
    setupRealtime();
    return adsCache;
  }

  // ═══════════════════════════════════════════════════════════
  // ── PUBLIC API ──
  // ═══════════════════════════════════════════════════════════

  window.Ads = {
    init,
    refresh: async () => { await fetchAds(); reRenderAll(); },

    getCached: () => adsCache,
    isLoaded: () => adsLoaded,
    pickWeighted: (placement) => pickWeightedAd(adsCache, { placement }),
    pickChatAdForInbox,

    mountFeedInjection,
    mountInboxSlot,
    mountSidebarSlot,
    mountLoadingSlot,
    mountDownbarSlot,
    mountProfilesSlot,
    mountNotificationsBanner,

    buildInboxChatAdRow,
    renderAdChatView,
    markChatAdSeen,

    logClick,
    logImpression,

    dismissAd,
    isDismissed,
    reRenderAll
  };

  log('ads.js loaded');

})();