// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.0.4
// @description  Focused live-card bell removal; no experimental score or league restyling
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame-live-cards.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame-live-cards.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const KEY = '__bcLiveCardsInstalledV1';
  // Safe when re-running manually without reloading.
  if (window[KEY]?.restore) window[KEY].restore();

  const VERSION = '1.0.4';
  const MATCH = 'a[href*="/sports/soccer/"]';
  const GROUP = '.sc-1nrofdy-1';
  const BELL_PATH = 'M18 9a6 6 0 0 0-12 0';
  const ATTR = 'data-bc-hide-match-bell-v104';

  const livePage = () => /^\/(?:[a-z]{2}\/)?sports\/live(?:\/|$)/i.test(location.pathname);
  const bounds = el => el.getBoundingClientRect();
  let root = null;
  let sheet = null;
  let observer = null;
  let running = true;
  let pending = false;
  const hidden = new Set();

  function findRoot() {
    const queue = [document];
    while (queue.length) {
      const node = queue.shift();
      if (node instanceof ShadowRoot &&
          node.querySelector(GROUP + ' ' + MATCH)) return node;
      node.querySelectorAll?.('*').forEach(el => {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
    return null;
  }

  function groups() {
    return root ? [...root.querySelectorAll(GROUP)]
      .filter(g => g.querySelector(MATCH)) : [];
  }

  // Exact SVG path reported by Eruda, NOT the site's header notification bell.
  function isMatchBell(svg) {
    return svg.tagName.toLowerCase() === 'svg' &&
      [...svg.querySelectorAll('path')].some(p =>
        (p.getAttribute('d') || '').startsWith(BELL_PATH));
  }

  // Find the circular control around the matched bell icon. Never hide
  // an entire card, a match link, team emblems, or anything containing scores.
  function bellContainer(svg, group) {
    const s = bounds(svg);
    const candidates = [];
    let el = svg.parentElement;
    for (let depth = 0; el && el !== group && depth < 7; depth++, el = el.parentElement) {
      if (el.matches(MATCH) || el.querySelector('.bc2-score')) break;
      const r = bounds(el);
      if (r.width < 27 || r.width > 76 || r.height < 27 || r.height > 76 ||
          Math.abs(r.width - r.height) > 13 ||
          s.left < r.left - 2 || s.right > r.right + 2 ||
          s.top < r.top - 2 || s.bottom > r.bottom + 2) continue;
      const css = getComputedStyle(el);
      const radius = css.borderTopLeftRadius;
      const px = parseFloat(radius) || 0;
      const rounded = radius.includes('%') ? px >= 35 :
        px >= Math.min(r.width, r.height) * 0.32;
      const outlined = (parseFloat(css.borderTopWidth) || 0) > 0 ||
                       (parseFloat(css.borderLeftWidth) || 0) > 0;
      const clickable = el.matches('button,[role="button"]');
      candidates.push({el, rounded, outlined, clickable, width:r.width});
    }
    // Prefer the circular outlined control; if it is div-based, use its
    // closest square wrapper, but never any parent containing score cells.
    return candidates.find(c => c.rounded && (c.outlined || c.clickable))?.el ||
           candidates.find(c => c.rounded)?.el ||
           candidates.sort((a,b) => Math.abs(a.width-44) - Math.abs(b.width-44))[0]?.el ||
           null;
  }

  function apply() {
    if (!running || !root || !livePage()) return;
    for (const group of groups()) {
      for (const svg of group.querySelectorAll('svg')) {
        if (!isMatchBell(svg)) continue;
        const container = bellContainer(svg, group);
        if (!container || container.hasAttribute(ATTR)) continue;
        container.setAttribute(ATTR, '');
        hidden.add(container);
      }
    }
    for (const node of hidden) {
      if (!node.isConnected) hidden.delete(node);
    }
  }

  function uninstallRoot() {
    observer?.disconnect();
    observer = null;
    sheet?.remove();
    sheet = null;
    hidden.forEach(el => el.removeAttribute(ATTR));
    hidden.clear();
    root = null;
  }

  function install(candidate) {
    uninstallRoot();
    root = candidate;
    sheet = document.createElement('style');
    sheet.id = 'bc-live-bell-only-v104';
    sheet.textContent = '[' + ATTR + '] { display: none !important; }';
    root.appendChild(sheet);
    apply();
    observer = new MutationObserver(() => {
      if (!running || pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        apply();
      });
    });
    observer.observe(root, {subtree:true, childList:true});
  }

  function tick() {
    if (!running) return;
    if (!livePage()) {
      if (root) uninstallRoot();
      return;
    }
    if (root?.host?.isConnected && sheet?.isConnected) return;
    const found = findRoot();
    if (found) install(found);
  }

  function status() {
    const activeGroups = groups();
    const exactBellIcons = root ? [...root.querySelectorAll('svg')]
      .filter(svg => isMatchBell(svg) && svg.closest(GROUP)?.querySelector(MATCH)) : [];
    const liveHidden = [...hidden].filter(el => el.isConnected);
    const visibleScores = root ? [...root.querySelectorAll(MATCH + ' .bc2-score')]
      .filter(el => {
        const r = bounds(el);
        return r.width > 0 && r.height > 0;
      }) : [];
    return {
      version:VERSION,
      running, pageMatches:livePage(), shadowRootReady:!!root,
      matchGroups:activeGroups.length,
      exactBellIcons:exactBellIcons.length,
      markedBellControls:liveHidden.length,
      hiddenBellControls:liveHidden.filter(el =>
        getComputedStyle(el).display === 'none').length,
      actualScoreFont:visibleScores[0] ?
        getComputedStyle(visibleScores[0]).fontSize : null,
      actualVisibleScoreElements:visibleScores.length,
      scoreAndLeagueStylesChanged:false
    };
  }

  function restore() {
    running = false;
    clearInterval(interval);
    uninstallRoot();
    if (window[KEY] === api) delete window[KEY];
    if (window.bcLiveCardRefinement === api) delete window.bcLiveCardRefinement;
    return 'BC.GAME v1.0.4: notification control changes removed';
  }

  const interval = setInterval(tick, 1500);
  const api = {status,restore};
  window[KEY] = api;
  window.bcLiveCardRefinement = api;
  tick();
  console.info('[BC.GAME Live Cards]',status());
})();
