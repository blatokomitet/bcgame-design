// ==UserScript==
// @name         BC.GAME Design — Calm Dark 1.0
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.2.0
// @description  Calm graphite, compact pinned gradient dock, 13px body font.
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
    header: '#24282D',
    sports: '#22252A',
    bottom: '#292C32'
  });
  const CSS = [
    'html, body { background-color: #202126 !important; }',
    'body { font-size: 13px !important; }',
    '.page-header { background-color: #24282D !important; border-top-width: 0 !important; border-bottom-width: 0 !important; box-shadow: none !important; }',
    '.tabbar { background-color: #292C32 !important; background-image: linear-gradient(160deg,#363941 0%,#2B2E35 48%,#22252B 100%) !important; box-shadow: 0 -6px 18px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.05) !important; }',
    '.tabbar [data-bc-calm-bottom-layer="1"] { background-color: transparent !important; }',
    '[data-bc-calm-sports="1"] { background-color: #22252A !important; }',
    '[data-bc-calm-nav-shadow="1"] { box-shadow: 0 8px 20px -8px rgba(0,0,0,.35) !important; }',
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
  const OVERRIDES = new Map();
  let dock = null;
  let dockObserver = null;
  let lastDockMetrics = null;
  let resizeTimer = null;

  function mark(el, attr) {
    if (!el || el.getAttribute(attr) === '1') return;
    if (!MARKS.has(el)) MARKS.set(el, new Map());
    const attrs = MARKS.get(el);
    if (!attrs.has(attr)) attrs.set(attr, el.getAttribute(attr));
    el.setAttribute(attr, '1');
  }

  // Inline !important is required: other installed scripts can override
  // ordinary stylesheet rules on BC.GAME's top and bottom panels.
  function override(el, prop, value) {
    if (!el?.style) return;
    if (!OVERRIDES.has(el)) OVERRIDES.set(el, new Map());
    const props = OVERRIDES.get(el);
    if (!props.has(prop)) {
      props.set(prop, {
        original: el.style.getPropertyValue(prop),
        priority: el.style.getPropertyPriority(prop),
        value
      });
    } else {
      props.get(prop).value = value;
    }
    if (el.style.getPropertyValue(prop) !== value ||
        el.style.getPropertyPriority(prop) !== 'important') {
      el.style.setProperty(prop, value, 'important');
    }
  }

  function resetOverrides(el, props) {
    const found = OVERRIDES.get(el);
    if (!found) return;
    for (const prop of props) {
      const entry = found.get(prop);
      if (!entry) continue;
      if (entry.original) el.style.setProperty(prop, entry.original, entry.priority);
      else el.style.removeProperty(prop);
      found.delete(prop);
    }
    if (!found.size) OVERRIDES.delete(el);
  }

  function panelTheme() {
    for (const root of ROOTS) {
      for (const h of root.querySelectorAll('.page-header')) {
        override(h, 'background-color', COLOR.header);
        override(h, 'border-top-width', '0px');
        override(h, 'border-bottom-width', '0px');
        override(h, 'box-shadow', 'none');
      }
    }
  }

  function center(r) { return (r.left + r.right) / 2; }

  function applyDock() {
    if (window.innerWidth >= 600) return;
    let bar = null;
    for (const root of ROOTS) {
      bar = root.querySelector('.tabbar');
      if (bar) break;
    }
    if (!bar) return;
    if (dock === bar && bar.isConnected) return;

    if (dockObserver) dockObserver.disconnect();
    dockObserver = null;
    dock = bar;

    const before = bar.getBoundingClientRect();
    const naturalWidth = bar.offsetWidth;
    const targetWidth = document.documentElement.clientWidth * 0.7;
    if (!naturalWidth || before.width < 160) return;
    const props = ['position','top','bottom','left','right','transform',
      'transform-origin','scale','translate','transition','animation'];
    const beforeTransform = getComputedStyle(bar).transform;

    // Keep the site's original transform as a pinned baseline, then use
    // independent scale/translate properties to size/align this dock.
    override(bar, 'position', 'fixed');
    override(bar, 'top', 'auto');
    override(bar, 'transform', beforeTransform === 'none' ? 'none' : beforeTransform);
    override(bar, 'transform-origin', 'center bottom');
    override(bar, 'transition', 'none');
    override(bar, 'animation', 'none');
    const scale = targetWidth / before.width;
    override(bar, 'scale', String(scale));
    override(bar, 'translate', '0px 0px');

    const baseline = bar.getBoundingClientRect();
    override(bar, 'translate', '10px 0px');
    const trialX = bar.getBoundingClientRect();
    override(bar, 'translate', '0px 10px');
    const trialY = bar.getBoundingClientRect();
    const gainX = (center(trialX) - center(baseline)) / 10;
    const gainY = (trialY.bottom - baseline.bottom) / 10;

    let ok = false;
    if (Math.abs(gainX) > 0.1 && Math.abs(gainY) > 0.1) {
      const dx = (document.documentElement.clientWidth / 2 - center(baseline)) / gainX;
      const dy = (window.innerHeight - 16 - baseline.bottom) / gainY;
      override(bar, 'translate', dx.toFixed(3) + 'px ' + dy.toFixed(3) + 'px');
      const after = bar.getBoundingClientRect();
      ok = Math.abs(after.width - targetWidth) <= 3 &&
        Math.abs(center(after) - document.documentElement.clientWidth / 2) <= 3 &&
        Math.abs(window.innerHeight - after.bottom - 16) <= 3;
      if (ok) {
        lastDockMetrics = { width: Math.round(after.width),
          bottomGap: Math.round(window.innerHeight - after.bottom) };
      }
    }

    if (!ok) {
      resetOverrides(bar, props);
      lastDockMetrics = { status: 'SKIPPED: geometry check failed' };
      console.warn('[BC Calm Dark] Dock geometry unchanged (safety check)');
      return;
    }

    // Only restores properties this script itself pinned, if another script
    // tries to animate the dock during scrolling. No DOM changes on matches.
    dockObserver = new MutationObserver(() => {
      const rules = OVERRIDES.get(bar);
      if (!bar.isConnected || !rules || disposed) return;
      for (const [prop, entry] of rules) {
        if (['position','top','transform','transform-origin','scale',
             'translate','transition','animation'].includes(prop)) {
          if (bar.style.getPropertyValue(prop) !== entry.value ||
              bar.style.getPropertyPriority(prop) !== 'important') {
            bar.style.setProperty(prop, entry.value, 'important');
          }
        }
      }
    });
    dockObserver.observe(bar, { attributes: true, attributeFilter: ['style'] });
  }

  function resizeDock() {
    if (disposed || resizeTimer !== null) return;
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (dock) {
        if (dockObserver) dockObserver.disconnect();
        dockObserver = null;
        resetOverrides(dock, ['position','top','bottom','left','right','transform',
          'transform-origin','scale','translate','transition','animation']);
        dock = null;
      }
      applyDock();
    }, 180);
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
            override(el, 'background-color', COLOR.sports);
            if (selector.includes('kguemJ')) mark(el, 'data-bc-calm-nav-shadow');
          }
        }
      }
    }
  }

  // An opaque full-size inner layer otherwise hides the translucent tabbar.
  // Clear only the background of such layers; leave icons and click targets alone.
  function prepareBottomLayers() {
    for (const root of ROOTS) {
      for (const nav of root.querySelectorAll('.tabbar')) {
        const bar = nav.getBoundingClientRect();
        if (bar.width < 200 || bar.height < 35) continue;
        for (const el of nav.querySelectorAll('div')) {
          const r = el.getBoundingClientRect();
          if (r.width >= bar.width * 0.90 &&
              r.height >= bar.height * 0.80 &&
              r.height <= bar.height + 4) {
            const bg = getComputedStyle(el).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              mark(el, 'data-bc-calm-bottom-layer');
            }
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
    panelTheme();
    paintNavigation();
    prepareBottomLayers();
    applyDock();
    if (!mainSurface || !mainSurface.isConnected) {
      mainSurface = findMainSurface();
      if (mainSurface) mark(mainSurface, 'data-bc-calm-surface');
    }
  }

  function restore() {
    disposed = true;
    if (dockObserver) dockObserver.disconnect();
    window.removeEventListener('resize', resizeDock);
    if (resizeTimer !== null) clearTimeout(resizeTimer);
    for (const [el, props] of OVERRIDES) resetOverrides(el, [...props.keys()]);
    OVERRIDES.clear();
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
      mainSurfaceFound: !!mainSurface?.isConnected,
      dock: lastDockMetrics
    }),
    restore
  };
  refresh();
  window.addEventListener('resize', resizeDock);
  // Covers late-loaded components without continuously rescanning live odds.
  [800, 2500, 7000].forEach(delay => {
    const id = setTimeout(() => {
      pending.delete(id);
      refresh();
    }, delay);
    pending.add(id);
  });
})();
