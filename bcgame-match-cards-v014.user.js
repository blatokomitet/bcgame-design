// ==UserScript==
// @name         BC.GAME Match Cards — Stable DOM
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.6.0
// @description  Soccer cards with reversible updates, safe fallback and stable match elements.
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const KEY = '__bcMatchCardsV014';
  if (window[KEY]) return;
  const STYLE_ID = 'bc-match-v014-css';
  const CARD = '[data-editor-id="eventCard"]';
  const OWN = '.bc2-feed,[data-bc-match-style]';
  const feeds = new Map();
  const roots = new Map();
  const hidden = new Set();
  const timers = new Set();
  let stopped = false, pending = null, discoveryTimer = null, failures = 0;
  const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const css = `
${CARD}.bc-m-v014{display:none!important}
.bc2-feed{display:flex!important;flex-direction:column!important;gap:16px!important;width:100%!important;margin:12px 0 24px!important;box-sizing:border-box!important;grid-column:1/-1!important}
.bc2-feed .bc2-group{display:block!important;box-sizing:border-box!important;margin:0!important;padding:14px!important;height:auto!important;min-height:0!important;border:1px solid #303b3d!important;border-radius:26px!important;background:#1b2023!important;color:#f3f5f5!important}
.bc2-feed .bc2-head{display:grid!important;grid-template-columns:44px minmax(0,1fr)!important;gap:13px!important;align-items:center!important;margin:0 0 8px!important;padding:0!important}
.bc2-feed .bc2-logo{width:44px!important;height:44px!important;display:grid!important;place-items:center!important;color:#9ca7a9!important;font-size:20px!important}
.bc2-feed .bc2-logo img{width:44px!important;height:44px!important;object-fit:contain!important}
.bc2-feed .bc2-title{font-size:17px!important;font-weight:700!important;line-height:1.2!important;overflow-wrap:anywhere!important}
.bc2-feed .bc2-country{font-size:13px!important;color:#9ca7a9!important;margin-top:5px!important}
.bc2-feed .bc2-event{display:grid!important;grid-template-columns:65px minmax(0,1fr) 32px!important;gap:10px!important;align-items:center!important;box-sizing:border-box!important;position:relative!important;min-height:76px!important;height:auto!important;margin:0!important;padding:8px 0!important;color:inherit!important;text-decoration:none!important;border-radius:8px!important}
.bc2-feed .bc2-event+.bc2-event{border-top:1px solid #353d40!important}
.bc2-feed .bc2-event:focus-visible{outline:2px solid #11e58d!important;outline-offset:3px!important}
.bc2-feed .bc2-time{display:grid!important;gap:8px!important;min-width:0!important;text-align:center!important}
.bc2-feed .bc2-minute{font-size:12px!important;line-height:1.3!important;color:#aeb9bc!important;overflow-wrap:anywhere!important}
.bc2-feed .bc2-minute.live{font-size:15px!important;font-weight:700!important;color:#ff5966!important}
.bc2-feed .bc2-period{font-size:12px!important;color:#aeb9bc!important}
.bc2-feed .bc2-teams,.bc2-feed .bc2-scores{display:grid!important;gap:9px!important;min-width:0!important}
.bc2-feed .bc2-team{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important;height:27px!important}
.bc2-feed .bc2-teamlogo{display:grid!important;place-items:center!important;width:24px!important;height:24px!important;flex:0 0 24px!important;font-size:13px!important;color:#aeb9bc!important}
.bc2-feed .bc2-teamlogo img{width:24px!important;height:24px!important;object-fit:contain!important}
.bc2-feed .bc2-name{font-size:16px!important;font-weight:550!important;line-height:1.25!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;min-width:0!important}
.bc2-feed .bc2-score{font-size:22px!important;font-weight:750!important;line-height:27px!important;text-align:center!important;color:#ff5966!important;font-variant-numeric:tabular-nums!important}
.bc2-feed .bc2-score.bc-goal-flash{animation:bcGoalGreen 1.2s ease-out!important}
@keyframes bcGoalGreen{20%,65%{transform:scale(1.3);color:#11e58d}}
@media(max-width:350px){.bc2-feed .bc2-event{grid-template-columns:56px minmax(0,1fr) 28px!important;gap:7px!important}.bc2-feed .bc2-name{font-size:14px!important}}
@media(prefers-reduced-motion:reduce){.bc2-feed .bc2-score.bc-goal-flash{animation:none!important;color:#11e58d!important}}
`;
  function safeURL(value, match = false) {
    if (!value) return '';
    try {
      const url = new URL(value, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) return '';
      if (match && (url.origin !== location.origin || !/\/sports\/soccer\//.test(url.pathname))) return '';
      return url.href;
    } catch { return ''; }
  }
  function status(value) {
    const text = norm(value);
    const minute = text.match(/^(\d{1,3}(?:\s*\+\s*\d{1,2})?\s*[′'](?:\s*\+\s*\d{1,2})?)(.*)$/);
    return { text: minute ? minute[1].replace(/\s+/g, '') : text,
      phase: minute ? norm(minute[2]) : '', live: !!minute };
  }
  function imageURL(node) {
    const img = node?.querySelector('img');
    return safeURL(img?.currentSrc || img?.getAttribute('src'));
  }
  function extract(card) {
    const link = card.querySelector('a[data-editor-id="eventCardContent"][href]');
    const category = card.querySelector('[data-editor-id="eventCardCategory"]');
    const href = safeURL(link?.getAttribute('href'), true);
    if (!link || !category || !href) return null;
    const group = link.querySelector('[class*="sc-1gh6pgx-1"]');
    if (!group) return null;
    const rows = [...group.children].filter(e => e.matches('[class*="sc-1gh6pgx-2"]'));
    if (rows.length !== 2) return null;
    const teams = rows.map(row => {
      const name = row.querySelector('[data-editor-id="competitorName"],.jss39,.jss52') ||
        [...row.querySelectorAll('*')].find(e => !e.children.length && norm(e.textContent) && !/^\d+$/.test(norm(e.textContent)));
      return { name: norm(name?.textContent), logo: imageURL(row) };
    });
    if (teams.some(team => !team.name)) return null;
    const state = status(link.querySelector('[data-editor-id="eventCardStatusLabel"]')?.textContent);
    const scoreArea = link.querySelector('[data-editor-id="eventCardScore"],[class*="sc-7l8my2-0"]');
    let scores = null;
    if (scoreArea) {
      const values = [...scoreArea.querySelectorAll('*')]
        .filter(e => !e.children.length && norm(e.textContent)).map(e => norm(e.textContent));
      if (values.length === 2 && values.every(v => /^\d{1,3}$/.test(v))) scores = values;
      else if (values.some(v => !/^[-–—]$/.test(v))) return null;
    }
    if (!scores && (state.live || !/\d{1,2}:\d{2}/.test(state.text))) return null;
    const walker = document.createTreeWalker(category, NodeFilter.SHOW_TEXT);
    const parts = []; let node;
    while ((node = walker.nextNode())) if (norm(node.nodeValue)) parts.push(norm(node.nodeValue));
    if (!parts.length) return null;
    return { href, teams, scores: scores || ['—', '—'], status: state,
      country: parts.length > 1 ? parts[0] : '', league: parts.length > 1 ? parts.slice(1).join(' · ') : parts[0], icon: imageURL(category) };
  }
  function el(tag, cls, value) {
    const node = document.createElement(tag); node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function setText(node, value) { if (node.textContent !== value) node.textContent = value; }
  function setLogo(node, url, fallback) {
    if (node.dataset.logo === url && node.dataset.fallback === fallback) return;
    node.dataset.logo = url; node.dataset.fallback = fallback;
    node.replaceChildren(); node.setAttribute('aria-hidden', 'true');
    if (url) {
      const img = document.createElement('img'); img.alt = ''; img.src = url;
      img.addEventListener('error', () => node.replaceChildren(document.createTextNode(fallback)), { once: true });
      node.append(img);
    } else node.textContent = fallback;
  }
  function makeEvent() {
    const a = el('a', 'bc2-event');
    const time = el('div', 'bc2-time'), minute = el('div', 'bc2-minute'), phase = el('div', 'bc2-period');
    time.append(minute, phase);
    const teams = el('div', 'bc2-teams'), scores = el('div', 'bc2-scores');
    const items = [0, 1].map(() => {
      const row = el('div', 'bc2-team'), logo = el('span', 'bc2-teamlogo'), name = el('span', 'bc2-name'), score = el('span', 'bc2-score');
      row.append(logo, name); teams.append(row); scores.append(score);
      return { logo, name, score, flashTimer: null };
    });
    a.append(time, teams, scores); return { a, minute, phase, items, data: null };
  }
  function clearFlash(item) {
    if (item.flashTimer !== null) { clearTimeout(item.flashTimer); timers.delete(item.flashTimer); item.flashTimer = null; }
    item.score.classList.remove('bc-goal-flash');
  }
  function updateEvent(record, data) {
    record.a.href = data.href;
    setText(record.minute, data.status.text); record.minute.classList.toggle('live', data.status.live);
    setText(record.phase, data.status.phase);
    data.teams.forEach((team, i) => {
      const item = record.items[i];
      setLogo(item.logo, team.logo, team.name.slice(0, 1));
      setText(item.name, team.name); item.name.title = team.name;
      setText(item.score, data.scores[i]);
      const previous = record.data?.scores[i];
      if (/^\d+$/.test(previous ?? '') && /^\d+$/.test(data.scores[i]) && Number(data.scores[i]) > Number(previous)) {
        clearFlash(item); item.score.classList.add('bc-goal-flash');
        item.flashTimer = setTimeout(() => clearFlash(item), 1300); timers.add(item.flashTimer);
      }
    });
    record.data = data;
  }
  function removeFeed(host) {
    const feed = feeds.get(host); if (!feed) return;
    for (const event of feed.events.values()) event.items.forEach(clearFlash);
    feed.el.remove(); feeds.delete(host);
  }
  // Move only when order actually changed: live updates preserve focused nodes.
  function order(parent, nodes) {
    nodes.forEach((node, index) => { if (parent.children[index] !== node) parent.insertBefore(node, parent.children[index] || null); });
  }
  function syncFeed(host, records) {
    let feed = feeds.get(host);
    if (!feed || !feed.el.isConnected) {
      removeFeed(host);
      feed = { el: el('div', 'bc2-feed'), events: new Map(), groups: new Map() };
      host.insertBefore(feed.el, records[0].card); feeds.set(host, feed);
    }
    const wanted = new Set(), leagues = new Map();
    for (const { data } of records) {
      wanted.add(data.href);
      const key = JSON.stringify([data.country, data.league]);
      if (!leagues.has(key)) leagues.set(key, { data, events: [] });
      let event = feed.events.get(data.href);
      if (!event) { event = makeEvent(); feed.events.set(data.href, event); }
      updateEvent(event, data); leagues.get(key).events.push(event.a);
    }
    for (const [key, event] of feed.events) if (!wanted.has(key)) {
      event.items.forEach(clearFlash); event.a.remove(); feed.events.delete(key);
    }
    for (const [key, group] of feed.groups) if (!leagues.has(key)) { group.el.remove(); feed.groups.delete(key); }
    const groups = [];
    for (const [key, { data, events }] of leagues) {
      let group = feed.groups.get(key);
      if (!group) {
        const box = el('section', 'bc2-group'), head = el('div', 'bc2-head'), logo = el('div', 'bc2-logo');
        const labels = el('div', 'bc2-labels'), title = el('div', 'bc2-title', data.league), country = el('div', 'bc2-country', data.country);
        labels.append(title, country); head.append(logo, labels); box.append(head);
        group = { el: box, head, logo }; feed.groups.set(key, group);
      }
      setLogo(group.logo, data.icon, '◇'); order(group.el, [group.head, ...events]); groups.push(group.el);
    }
    order(feed.el, groups);
  }
  function snapshot() {
    return { status: stopped ? 'disabled' : 'active', version: '2.6.0', roots: roots.size,
      feeds: feeds.size, visibleEvents: [...feeds.values()].reduce((n, f) => n + f.events.size, 0), failures };
  }
  function refresh() {
    if (stopped) return snapshot();
    const batches = new Map(), accepted = new Set();
    for (const [root, state] of roots) {
      if (root !== document && !root.host.isConnected) {
        state.observer.disconnect(); state.style.remove(); roots.delete(root); continue;
      }
      for (const card of root.querySelectorAll(CARD)) {
        if (card.closest('.bc2-feed')) continue;
        try {
          const data = extract(card); if (!data || !card.parentElement) continue;
          const host = card.parentElement;
          if (!batches.has(host)) batches.set(host, []);
          const records = batches.get(host);
          if (!records.some(x => x.data.href === data.href)) records.push({ card, data });
        } catch { failures++; }
      }
    }
    for (const host of feeds.keys()) if (!batches.has(host) || !host.isConnected) removeFeed(host);
    for (const [host, records] of batches) {
      try { syncFeed(host, records); records.forEach(({ card }) => accepted.add(card)); }
      catch { failures++; removeFeed(host); }
    }
    for (const card of hidden) if (!accepted.has(card)) { card.classList.remove('bc-m-v014'); hidden.delete(card); }
    for (const card of accepted) { card.classList.add('bc-m-v014'); hidden.add(card); }
    return snapshot();
  }
  function schedule() {
    if (stopped || pending !== null) return;
    pending = setTimeout(() => { pending = null; discover(); refresh(); }, 100);
  }
  function discover() {
    const queue = [document];
    for (let i = 0; i < queue.length; i++) {
      const root = queue[i];
      if (!roots.has(root)) {
        const style = document.createElement('style'); style.id = STYLE_ID;
        style.dataset.bcMatchStyle = ''; style.textContent = css;
        (root === document ? document.head || document.documentElement : root).append(style);
        const observer = new MutationObserver(changes => {
          if (changes.some(change => {
            const target = change.target.nodeType === 1 ? change.target : change.target.parentElement;
            if (target?.closest(OWN)) return false;
            if (change.type === 'childList' && [...change.addedNodes, ...change.removedNodes].every(n => n.nodeType === 1 && n.matches(OWN))) return false;
            return true;
          })) schedule();
        });
        observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'src'] });
        roots.set(root, { style, observer });
      }
      for (const node of root.querySelectorAll('*')) if (node.shadowRoot) queue.push(node.shadowRoot);
    }
  }
  function disable() {
    stopped = true; clearTimeout(pending); clearInterval(discoveryTimer);
    for (const state of roots.values()) { state.observer.disconnect(); state.style.remove(); }
    roots.clear(); for (const host of feeds.keys()) removeFeed(host);
    for (const card of hidden) card.classList.remove('bc-m-v014'); hidden.clear();
    for (const timer of timers) clearTimeout(timer); timers.clear();
    delete window[KEY]; return snapshot();
  }
  window[KEY] = { refresh: () => { discover(); return refresh(); }, audit: snapshot, disable };
  discover(); refresh();
  // attachShadow itself produces no document mutation; low-frequency discovery is the fallback.
  discoveryTimer = setInterval(() => { if (!document.hidden) { discover(); refresh(); } }, 5000);
})();
