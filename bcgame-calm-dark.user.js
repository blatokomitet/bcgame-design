// ==UserScript==
// @name         BC.GAME Design — Calm Dark 1.0
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.0.0
// @description  Approved four background colors and 13px body font; no other changes.
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame-calm-dark.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame-calm-dark.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  const KEY = '__bcCalmDarkFourColorsV100';
  if (window[KEY]) return;
  const COLOR = Object.freeze({
    page: '#202126',
    header: '#1C1C21',
    sports: '#19191E',
    bottom: '#222228'
  });
  const CSS = [
    'html, body { background-color: #202126 !important; }',
    'body { font-size: 13px !important; }',
    '.page-header { background-color: #1C1C21 !important; }',
    '.tabbar { background-color: #222228 !important; }',
    '[data-bc-calm-sports="1"] { background-color: #19191E !important; }',
    '[data-bc-calm-surface="1"] { background-color: #202126 !important; }'
  ].join('\n');
  const NAV = [
    'div.sc-kr14wy-0.ctyDjn.sc-s5b340-0.fDRvqw',
    'div.sc-kr14wy-0.kguemJ'
  ];
  const ROOTS = new Set();
  const STYLES = new Set();
  const OBSERVERS = new Set();
  const MARKS = new Map();
  let mainSurface = null;
  let timer = null;
  const pending = new Set();
  let disposed = false;

  function mark(el, attr) {
    if (!el || el.getAttribute(attr) === '1') return;
    if (!MARKS.has(el)) MARKS.set(el, new Map());
    const attrs = MARKS.get(el);
    if (!attrs.has(attr)) attrs.set(attr, el.getAttribute(attr));
    el.setAttribute(attr, '1');
  }

  function schedule() {
    if (disposed || timer !== null) return;
    timer = setTimeout(() => {
      pending.delete(timer);
      timer = null;
      refresh();
    }, 350);
    pending.add(timer);
  }

  function addRoot(root) {
    if (ROOTS.has(root)) return;
    ROOTS.add(root);
    const style = document.createElement('style');
    style.setAttribute('data-bc-calm-style', '1');
    style.textContent = CSS;
    (root.nodeType === 9 ? (document.head || document.documentElement) : root)
      .appendChild(style);
    STYLES.add(style);
    const observer = new MutationObserver(changes => {
      const relevant = '.page-header, .tabbar, main, #root, #app, #__next, ' + NAV.join(', ');
      if (changes.some(change => [...change.addedNodes].some(n =>
        n.nodeType === 1 && (
          n.matches?.(relevant) || n.querySelector?.(relevant) ||
          n.shadowRoot || (n.parentElement === document.body && n.tagName === 'DIV')
        )
      ))) schedule();
    });
    observer.observe(root, { childList: true, subtree: true });
    OBSERVERS.add(observer);
  }

  function discoverRoots() {
    const queue = [document];
    const traversed = new Set();
    while (queue.length) {
      const root = queue.shift();
      if (traversed.has(root)) continue;
      traversed.add(root);
      if (!ROOTS.has(root)) addRoot(root);
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      }
    }
  }

  function paintNavigation() {
    const width = document.documentElement.clientWidth;
    for (const root of ROOTS) {
      for (const selector of NAV) {
        for (const el of root.querySelectorAll(selector)) {
          const r = el.getBoundingClientRect();
          if (Math.abs(r.top - 46) <= 16 &&
              Math.abs(r.height - 64) <= 16 &&
              r.width >= width * 0.75) {
            mark(el, 'data-bc-calm-sports');
          }
        }
      }
    }
  }

  function neutralDark(color) {
    const m = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) return false;
    const c = m.slice(1, 4).map(Number);
    const avg = (c[0] + c[1] + c[2]) / 3;
    return avg >= 14 && avg <= 73 &&
      Math.max(...c) - Math.min(...c) <= 24;
  }

  function findMainSurface() {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    let best = null;
    let bestScore = -Infinity;
    for (const root of ROOTS) {
      for (const el of root.querySelectorAll('div, main, section')) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.closest('.eruda-container, .eruda-dev-tools, .page-header, .tabbar')) continue;
        const r = el.getBoundingClientRect();
        // Page-sized wrappers only, never individual match/odds cards.
        if (r.width < width * 0.95 || r.height < height * 0.85 ||
            r.top > 140 || r.bottom < height * 0.65) continue;
        const css = getComputedStyle(el);
        if (css.position === 'fixed' || css.position === 'sticky' ||
            !neutralDark(css.backgroundColor)) continue;
        let depth = 0, p = el;
        while (p && depth < 25) {
          depth++;
          p = p.parentElement || p.getRootNode()?.host || null;
        }
        const score = depth * 10 - Math.abs(r.width - width) / 10 -
          Math.min(Math.abs(r.top), 1000) / 100;
        if (score > bestScore) { best = el; bestScore = score; }
      }
    }
    return best;
  }

  function refresh() {
    if (disposed) return;
    discoverRoots();
    paintNavigation();
    if (!mainSurface || !mainSurface.isConnected) {
      mainSurface = findMainSurface();
      if (mainSurface) mark(mainSurface, 'data-bc-calm-surface');
    }
  }

  function restore() {
    disposed = true;
    for (const id of pending) clearTimeout(id);
    pending.clear();
    timer = null;
    for (const observer of OBSERVERS) observer.disconnect();
    for (const style of STYLES) style.remove();
    for (const [el, attrs] of MARKS) {
      for (const [name, original] of attrs) {
        if (original === null) el.removeAttribute(name);
        else el.setAttribute(name, original);
      }
    }
    OBSERVERS.clear();
    STYLES.clear();
    ROOTS.clear();
    MARKS.clear();
    delete window[KEY];
  }

  window[KEY] = {
    status: () => ({
      active: true,
      colors: COLOR,
      bodyFont: getComputedStyle(document.body).fontSize,
      topNavigationLayers: [...MARKS].filter(([el, a]) =>
        el.isConnected && a.has('data-bc-calm-sports')).length,
      mainSurfaceFound: !!mainSurface?.isConnected
    }),
    restore
  };
  refresh();
  // Covers late-loaded components without continuously rescanning live odds.
  [800, 2500, 7000].forEach(delay => {
    const id = setTimeout(() => {
      pending.delete(id);
      refresh();
    }, delay);
    pending.add(id);
  });
})();
