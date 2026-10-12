// ==UserScript==
// @name         BC.GAME Sofascore v2.1 — EXPERIMENT
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.1.0
// @description  Test score scaling without modifying inline font-size
// @match        https://bcgame.st/ru/sports/*
// @match        https://*.bcgame.st/ru/sports/*
// @run-at       document-start
// @resource     sofaCSS https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.1.css
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.1.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.1.user.js
// @grant        GM_getResourceText
// ==/UserScript==
(() => {
  'use strict';
  const CSS_ID = 'bc-sofa-v21-experiment';
  const css = GM_getResourceText('sofaCSS');
  if (!css) { console.warn('[BC Sofa v2.1] CSS resource missing'); return; }
  const roots = new Set();
  let active = true;
  let queued = false;
  function scan() {
    if (!active) return;
    for (const host of document.querySelectorAll('*')) {
      const root = host.shadowRoot;
      if (!root || !root.querySelector('a[href*="/sports/soccer/"]')) continue;
      if (root.getElementById(CSS_ID)) continue;
      const el = document.createElement('style');
      el.id = CSS_ID;
      el.textContent = css;
      root.appendChild(el);
      roots.add(root);
    }
  }
  function schedule() {
    if (queued || !active) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  }
  const observer = new MutationObserver(schedule);
  function start() {
    scan();
    observer.observe(document, { subtree:true, childList:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
  const state = {
    status() {
      const root = [...roots].find(r => r.querySelector('a[href*="/sports/soccer/"]'));
      const spans = root ? [...root.querySelectorAll('a[href*="/sports/soccer/"] span.sc-1oeg2ad-1')] : [];
      return {
        active, roots:roots.size, scores:spans.length,
        samples:spans.slice(0,4).map(el=>({
          value:el.textContent.trim(),
          fontSize:getComputedStyle(el).fontSize,
          transform:getComputedStyle(el).transform
        }))
      };
    },
    stop() {
      active=false;
      observer.disconnect();
      for (const root of roots) root.getElementById(CSS_ID)?.remove();
      roots.clear();
      return 'v2.1 stopped';
    }
  };
  // Call through the userscript execution context for diagnostics if isolated sandbox.
  window.bcSofaV21 = state;
})();
