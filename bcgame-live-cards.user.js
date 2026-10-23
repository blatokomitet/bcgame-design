// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.0.5
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

  const VERSION = '1.0.5';
  const MATCH = 'a[href*="/sports/soccer/"]';
  const GROUP = '.sc-1nrofdy-1';
  const BELL_PATH = 'M18 9a6 6 0 0 0-12 0';
  const ATTR = 'data-bc-hide-match-bell-v105';

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

  // Directly target the confirmed bell container inside the match Shadow DOM.
  // Diagnostics show .bc2-bell is NOT nested inside .sc-1nrofdy-1.
  // The SVG path check protects against unrelated elements sharing this class.
  function matchBellContainers() {
    if (!root) return [];
    return [...root.querySelectorAll('.bc2-bell')].filter(el =>
      [...el.querySelectorAll('svg')].some(isMatchBell)
    );
  }

  function apply() {
    if (!running || !root || !livePage()) return;
    for (const bell of matchBellContainers()) {
      if (!bell.hasAttribute(ATTR)) bell.setAttribute(ATTR, '');
      hidden.add(bell);
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
    sheet.id = 'bc-live-bell-only-v105';
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
    const exactBellIcons = root ? matchBellContainers() : [];
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
    return 'BC.GAME v1.0.5: notification control changes removed';
  }

  const interval = setInterval(tick, 1500);
  const api = {status,restore};
  window[KEY] = api;
  window.bcLiveCardRefinement = api;
  tick();
  console.info('[BC.GAME Live Cards]',status());
})();
