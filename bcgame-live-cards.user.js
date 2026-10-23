// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.0.6
// @description  Hide verified match bell controls without changing scores, league icons, or layout
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
  if (window[KEY]?.restore) window[KEY].restore();

  const VERSION = '1.0.6';
  const MATCH = 'a[href*="/sports/soccer/"]';
  const GROUP = '.sc-1nrofdy-1';
  const BELL_PATH = 'M18 9a6 6 0 0 0-12 0';
  const MARK = 'data-bc-match-bell-hidden-v106';

  const livePage = () => /^\/(?:[a-z]{2}\/)?sports\/live(?:\/|$)/i.test(location.pathname);
  const bounds = el => el.getBoundingClientRect();
  let root = null;
  let observer = null;
  let running = true;
  let pending = false;
  const priorDisplay = new Map();

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
      .filter(group => !!group.querySelector(MATCH)) : [];
  }

  function isMatchBell(svg) {
    return svg.tagName.toLowerCase() === 'svg' &&
      [...svg.querySelectorAll('path')].some(path =>
        (path.getAttribute('d') || '').startsWith(BELL_PATH));
  }

  // The actual bell is .bc2-bell, outside .sc-1nrofdy-1 groups.
  // Verify the icon's exact path so we do not target the site header bell.
  function matchBellContainers() {
    return root ? [...root.querySelectorAll('.bc2-bell')].filter(el =>
      [...el.querySelectorAll('svg')].some(isMatchBell)
    ) : [];
  }

  function apply() {
    if (!running || !root || !livePage()) return;
    const current = new Set(matchBellContainers());
    for (const bell of current) {
      if (!priorDisplay.has(bell)) {
        priorDisplay.set(bell, {
          value:bell.style.getPropertyValue('display'),
          priority:bell.style.getPropertyPriority('display')
        });
      }
      // Inline !important takes precedence over the BC.GAME styles that
      // defeated the previous injected stylesheet's display:none rule.
      if (bell.style.getPropertyValue('display') !== 'none' ||
          bell.style.getPropertyPriority('display') !== 'important') {
        bell.style.setProperty('display', 'none', 'important');
      }
      if (!bell.hasAttribute(MARK)) bell.setAttribute(MARK, '');
    }
    for (const [bell, previous] of priorDisplay) {
      if (!bell.isConnected) {
        priorDisplay.delete(bell);
      } else if (!current.has(bell)) {
        // Restore if an element stopped being a match bell.
        if (previous.value) bell.style.setProperty('display', previous.value, previous.priority);
        else bell.style.removeProperty('display');
        bell.removeAttribute(MARK);
        priorDisplay.delete(bell);
      }
    }
  }

  function uninstallRoot() {
    observer?.disconnect();
    observer = null;
    for (const [bell, previous] of priorDisplay) {
      if (previous.value) {
        bell.style.setProperty('display', previous.value, previous.priority);
      } else {
        bell.style.removeProperty('display');
      }
      bell.removeAttribute(MARK);
    }
    priorDisplay.clear();
    root = null;
  }

  function install(candidate) {
    uninstallRoot();
    root = candidate;
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
    if (root?.host?.isConnected) {
      apply();
      return;
    }
    const nextRoot = findRoot();
    if (nextRoot) install(nextRoot);
  }

  function status() {
    const bells = matchBellContainers();
    const visibleScores = root ? [...root.querySelectorAll(MATCH + ' .bc2-score')]
      .filter(el => {
        const r = bounds(el);
        return r.width > 0 && r.height > 0;
      }) : [];
    return {
      version:VERSION,
      running,
      pageMatches:livePage(),
      shadowRootReady:!!root,
      matchGroups:groups().length,
      exactBellIcons:bells.length,
      markedBellControls:bells.filter(el => el.hasAttribute(MARK)).length,
      hiddenBellControls:bells.filter(el => getComputedStyle(el).display === 'none').length,
      actualScoreFont:visibleScores[0] ? getComputedStyle(visibleScores[0]).fontSize : null,
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
    return 'BC.GAME v1.0.6: match bell styles restored';
  }

  const interval = setInterval(tick, 1500);
  const api = {status,restore};
  window[KEY] = api;
  window.bcLiveCardRefinement = api;
  tick();
  console.info('[BC.GAME LIVE Cards]',status());
})();
