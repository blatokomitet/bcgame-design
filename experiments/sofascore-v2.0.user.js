// ==UserScript==
// @name         BC.GAME Sofascore v2.0 — EXPERIMENT
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.0.0
// @description  Отдельный тест: CSS в Shadow DOM без изменения inline-стилей счёта
// @match        https://bcgame.st/ru/sports/*
// @match        https://*.bcgame.st/ru/sports/*
// @run-at       document-start
// @resource     sofaCSS https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.0.css
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.0.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.0.user.js
// @grant        GM_getResourceText
// ==/UserScript==

(() => {
  'use strict';
  // Do not enable alongside the older Sofascore experiments.
  const STYLE_ID = 'bc-sofa-v20-experiment';
  const css = GM_getResourceText('sofaCSS');
  if (!css) {
    console.warn('[BC Sofa v2.0] CSS resource unavailable');
    return;
  }

  const styledRoots = new Set();
  let running = true;
  let queued = false;

  function scan() {
    if (!running) return;
    const hosts = [document.documentElement, ...document.querySelectorAll('*')];
    for (const host of hosts) {
      const root = host?.shadowRoot;
      if (!root || !root.querySelector('a[href*="/sports/soccer/"]')) continue;
      if (!root.getElementById(STYLE_ID)) {
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        root.appendChild(style);
        styledRoots.add(root);
      }
    }
  }

  function queueScan() {
    if (queued || !running) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }

  const observer = new MutationObserver(queueScan);
  function start() {
    scan();
    observer.observe(document, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }

  // Diagnostics without mutating score elements.
  const diagnostics = () => {
    const root = [...styledRoots].find(r => r.isConnected && r.querySelector('a[href*="/sports/soccer/"]'));
    const scores = root ? [...root.querySelectorAll('a[href*="/sports/soccer/"] span.sc-1oeg2ad-1')] : [];
    return {
      version: '2.0.0',
      rootsStyled: [...styledRoots].filter(r => r.isConnected && !!r.getElementById(STYLE_ID)).length,
      scoreCount: scores.length,
      computedSizes: scores.slice(0, 6).map(el => getComputedStyle(el).fontSize),
      note: 'If computedSizes remain 11px, cascade conflict is unresolved.'
    };
  };
  // Accessible in the userscript sandbox console; no site data is changed.
  window.bcSofaV20Diagnostics = diagnostics;
  window.bcSofaV20Stop = () => {
    running = false;
    observer.disconnect();
    for (const root of styledRoots) root.getElementById(STYLE_ID)?.remove();
    styledRoots.clear();
    return 'BC Sofa v2.0 stopped';
  };
  console.info('[BC Sofa v2.0] Experimental CSS loader started; use bcSofaV20Diagnostics()');
})();
