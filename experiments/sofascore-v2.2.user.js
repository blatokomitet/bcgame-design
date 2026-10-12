// ==UserScript==
// @name         BC.GAME Sofascore Compact v2.2 — EXPERIMENT
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.2.0
// @description  Isolated 110–125px compact-card experiment; keeps v2.1 score transform
// @match        https://bcgame.st/ru/sports/*
// @match        https://*.bcgame.st/ru/sports/*
// @run-at       document-start
// @resource     sofaCSS https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.2.css
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.2.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.2.user.js
// @grant        GM_getResourceText
// ==/UserScript==
(() => {
  'use strict';
  const ID = 'bc-sofa-compact-v22';
  const css = GM_getResourceText('sofaCSS');
  if (!css) { console.warn('[BC v2.2] CSS resource not available'); return; }
  let enabled = true, queued = false;
  const roots = new Set();
  function scan() {
    if (!enabled) return;
    for (const host of document.querySelectorAll('*')) {
      const root = host.shadowRoot;
      if (!root || !root.querySelector('a[href*="/sports/soccer/"]')) continue;
      if (root.getElementById(ID)) continue;
      const style = document.createElement('style');
      style.id = ID;
      style.textContent = css;
      root.appendChild(style);
      roots.add(root);
    }
  }
  function schedule() {
    if (queued || !enabled) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  }
  const observer = new MutationObserver(schedule);
  function start() {
    scan();
    observer.observe(document, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else start();
  // Diagnostic function may be visible only in the userscript context.
  window.bcSofaV22 = {
    inspect() {
      const root = [...roots].find(r => r.querySelector('a.sc-1nrofdy-9'));
      if (!root) return { active: enabled, cards: 0 };
      const cards = [...root.querySelectorAll('.sc-1nrofdy-1')]
        .filter(c => c.querySelector(':scope > a.sc-1nrofdy-9'));
      return {
        active: enabled,
        cards: cards.length,
        heights: cards.slice(0, 8).map(c => Math.round(c.getBoundingClientRect().height)),
        scores: [...root.querySelectorAll('a.sc-1nrofdy-9 span.sc-1oeg2ad-1')]
          .slice(0, 4).map(e => ({ size: getComputedStyle(e).fontSize, transform: getComputedStyle(e).transform }))
      };
    },
    stop() {
      enabled = false;
      observer.disconnect();
      for (const root of roots) root.getElementById(ID)?.remove();
      roots.clear();
      return 'Sofascore Compact v2.2 stopped';
    }
  };
})();
