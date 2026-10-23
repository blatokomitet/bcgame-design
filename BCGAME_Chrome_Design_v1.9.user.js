// ==UserScript==
// @name         BC.GAME Design - Chrome Dock v1.9 (Checkpoint)
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.9.1
// @description  Saved checkpoint: full-size graphite dock, original betting slip button, curved tab, soft scroll sinking, upper sports nav without shadow.
// @author       BC.GAME Design
// @match        https://bcgame.st/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
 * Saved checkpoint, 12 October 2026.
 * Separate from existing header script (Minimal Header v2.1) and Calm Dark.
 * IMPORTANT: The original coupon click after the v1.9 relocation has not yet
 * been confirmed by the user. No synthetic proxy click is used.
 * To reverse in the console: window.bcChromeV19CheckpointDestroy()
 */
(() => {
  'use strict';
  if (window.__bcChromeV19CheckpointInstalled) return;
  if (window.__bcCalmDarkFourColorsV100) {
    console.warn('[BC Chrome Dock] Calm Dark is already active. Enable only one dock script.');
    return;
  }
  window.__bcChromeV19CheckpointInstalled = true;

  const saved = new Map();
  const touched = new Set();
  const roots = [document];
  let bar = null;
  let coupon = null;
  let nativeButton = null;
  let bridge = null;
  let down = false;
  let sink = 0;
  let checkTimer = null;
  let scheduled = null;
  let observer = null;
  let destroyed = false;
  const previous = new WeakMap();
  let travel = 0;
  let lastDirection = 0;

  const SC = 1.05; // 70% x 1.5: original 105%; fit to viewport
  const DURATION = '850ms cubic-bezier(.22,1,.36,1)';
  const NAV_SELECTOR = '.sc-kr14wy-0.kguemJ';
  const INNER_NAV_SELECTOR = '.sc-kr14wy-0.ctyDjn.sc-s5b340-0.fDRvqw';

  function set(el, prop, value) {
    if (!el?.style) return;
    if (!saved.has(el)) saved.set(el, new Map());
    const props = saved.get(el);
    if (!props.has(prop)) {
      props.set(prop, [
        el.style.getPropertyValue(prop),
        el.style.getPropertyPriority(prop)
      ]);
    }
    if (el.style.getPropertyValue(prop) !== value ||
        el.style.getPropertyPriority(prop) !== 'important') {
      el.style.setProperty(prop, value, 'important');
    }
    touched.add(el);
  }

  function restoreElement(el) {
    const props = saved.get(el);
    if (!props) return;
    for (const [prop, [value, priority]] of props) {
      if (value) el.style.setProperty(prop, value, priority);
      else el.style.removeProperty(prop);
    }
    saved.delete(el);
    touched.delete(el);
  }

  function restoreAll() {
    for (const el of [...touched]) restoreElement(el);
  }

  function find(selector) {
    return roots.map(root => root.querySelector(selector)).find(Boolean);
  }

  function seekShadowRoots() {
    // Normal BC.GAME elements are in document; shadow roots are fallback.
    if (document.querySelector('.tabbar')) return;
    for (let i = 0; i < roots.length; i++) {
      for (const el of roots[i].querySelectorAll('*')) {
        if (el.shadowRoot && !roots.includes(el.shadowRoot)) {
          roots.push(el.shadowRoot);
        }
      }
    }
  }

  function findOriginalCoupon() {
    const center = document.documentElement.clientWidth / 2;
    const matches = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll('.jss34')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 25 && rect.width < 140 &&
            rect.height > 25 && rect.height < 140 &&
            Math.abs(rect.left + rect.width / 2 - center) < 70) {
          matches.push({
            el,
            distance: Math.abs(rect.left + rect.width / 2 - center)
          });
        }
      }
    }
    matches.sort((a, b) => a.distance - b.distance);
    const candidate = matches[0]?.el;
    const owner = candidate?.closest('.jss26.jss31');
    return owner ? { coupon: candidate, owner } : null;
  }

  function styleSportsNav() {
    const nav = find(NAV_SELECTOR);
    if (nav) {
      set(nav, 'box-shadow', 'none');
      set(nav, 'filter', 'none');
      set(nav, 'background-color', '#19191E');
      set(nav, 'background-image',
        'linear-gradient(to bottom, rgba(25,25,30,1) 0%, rgba(25,25,30,.95) 100%)');
    }
    const innerNav = find(INNER_NAV_SELECTOR);
    if (innerNav) {
      set(innerNav, 'box-shadow', 'none');
      set(innerNav, 'background-color', 'transparent');
    }
  }

  function buildBridge() {
    bridge?.remove();
    bridge = document.createElement('div');
    bridge.setAttribute('data-bc-chrome-v19-bridge', '');
    bridge.style.cssText = [
      'position:absolute', 'left:50%', 'top:-53px',
      'width:176px', 'height:69px', 'transform:translateX(-50%)',
      'pointer-events:none', 'z-index:50'
    ].join(';');
    bridge.innerHTML = `<svg viewBox="0 0 176 69" width="176" height="69"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M0 69V64C20 64 30 60 34 42L38 20Q41 4 55 4H121Q135 4 138 20L142 42C146 60 156 64 176 64V69Z" fill="#19191E"/>
      <path d="M34 42L38 20Q41 4 55 4H121Q135 4 138 20L142 42"
        fill="none" stroke="rgba(255,255,255,.055)" stroke-width="1"/>
    </svg>`;
    bar.appendChild(bridge);
  }

  function styleBar() {
    set(bar, 'position', 'fixed');
    set(bar, 'width', `${100 / SC}%`);
    set(bar, 'max-width', 'none');
    set(bar, 'left', '50%');
    set(bar, 'bottom', '5px');
    set(bar, 'background-color', '#19191E');
    set(bar, 'background-image', 'none');
    set(bar, 'opacity', '1');
    set(bar, 'overflow', 'visible');
    set(bar, 'transform-origin', 'center bottom');
    set(bar, 'transition', `transform ${DURATION}`);
    set(bar, 'transform', `translateX(-50%) translateY(0px) scale(${SC})`);
    sink = Math.round(bar.getBoundingClientRect().height * .45);
  }

  function styleOriginalCoupon() {
    if (!nativeButton || !coupon) return false;
    const bottomGap = 5 + bar.getBoundingClientRect().height - 14;
    set(nativeButton, 'position', 'fixed');
    set(nativeButton, 'left', '50%');
    set(nativeButton, 'right', 'auto');
    set(nativeButton, 'top', 'auto');
    set(nativeButton, 'bottom', `${bottomGap}px`);
    set(nativeButton, 'width', '112px');
    set(nativeButton, 'height', '64px');
    set(nativeButton, 'margin', '0');
    set(nativeButton, 'z-index', '11000');
    set(nativeButton, 'visibility', 'visible');
    set(nativeButton, 'opacity', '1');
    set(nativeButton, 'pointer-events', 'auto');
    set(nativeButton, 'transform', 'translateX(-50%) translateY(0px)');
    set(nativeButton, 'transition', `transform ${DURATION}`);
    set(nativeButton, 'display', 'flex');
    set(nativeButton, 'align-items', 'center');
    set(nativeButton, 'justify-content', 'center');
    set(nativeButton, 'cursor', 'pointer');

    for (const el of [coupon.parentElement, coupon]) {
      if (!el) continue;
      set(el, 'width', '100%');
      set(el, 'height', '100%');
      set(el, 'border-radius', '12px 12px 8px 8px');
      set(el, 'display', 'flex');
      set(el, 'align-items', 'center');
      set(el, 'justify-content', 'center');
      set(el, 'visibility', 'visible');
    }
    set(coupon, 'background-color', '#1BE981');

    // Original React element keeps its own event listeners; no proxy click.
    function hittable() {
      const r = coupon.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === nativeButton || !!hit && nativeButton.contains(hit);
    }
    let isHittable = hittable();
    const clip = nativeButton.closest('.jss21.jss27');
    if (!isHittable && clip && getComputedStyle(clip).overflow === 'hidden') {
      set(clip, 'overflow', 'visible');
      isHittable = hittable();
    }
    console.info('BC_CHROME_V19 checkpoint: original coupon hit test', isHittable);
    return isHittable;
  }

  function render() {
    if (!bar?.isConnected) return;
    const dy = down ? sink : 0;
    set(bar, 'transform',
      `translateX(-50%) translateY(${dy}px) scale(${SC})`);
    if (nativeButton?.isConnected) {
      set(nativeButton, 'transform',
        `translateX(-50%) translateY(${dy}px)`);
    }
  }

  function init() {
    if (destroyed) return;
    seekShadowRoots();
    const newBar = find('.tabbar');
    styleSportsNav();
    if (!newBar) return;

    const ticketResult = findOriginalCoupon();
    if (bar === newBar && (
      (nativeButton?.isConnected && bridge?.isConnected) ||
      (!ticketResult && !nativeButton && !bridge)
    )) return;

    bridge?.remove();
    restoreAll();
    bar = newBar;
    coupon = ticketResult?.coupon || null;
    nativeButton = ticketResult?.owner || null;
    styleSportsNav();
    styleBar();
    if (nativeButton && styleOriginalCoupon()) {
      buildBridge();
    } else if (nativeButton) {
      // Do not leave a misplaced/non-clickable coupon.
      for (const e of [nativeButton, coupon, coupon?.parentElement,
        nativeButton.closest('.jss21.jss27')]) {
        if (e) restoreElement(e);
      }
      nativeButton = null;
      coupon = null;
      console.warn('BC_CHROME_V19: coupon not moved; retained original placement.');
    }
    render();
  }

  function onScroll(event) {
    if (destroyed || !bar?.isConnected) return;
    const t = event.target;
    if (!t || typeof t !== 'object') return;
    const page = t === window || t === document || t === document.documentElement;
    if (!page && (!Number.isFinite(t.scrollHeight) ||
                  t.scrollHeight <= t.clientHeight + 20)) return;
    const y = page ? window.scrollY : t.scrollTop;
    if (!Number.isFinite(y)) return;
    const last = previous.get(t);
    previous.set(t, y);
    if (last === undefined || Math.abs(y - last) < .5) return;
    const delta = y - last;
    if (Math.sign(delta) !== lastDirection) travel = 0;
    lastDirection = Math.sign(delta);
    travel += delta;
    if (travel >= 18 && !down) {
      down = true;
      travel = 0;
      render();
    } else if (travel <= -18 && down) {
      down = false;
      travel = 0;
      render();
    }
  }

  function destroy() {
    destroyed = true;
    window.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('scroll', onScroll, true);
    for (const root of roots) {
      if (root !== document) root.removeEventListener('scroll', onScroll, true);
    }
    if (checkTimer) clearInterval(checkTimer);
    if (scheduled) clearTimeout(scheduled);
    observer?.disconnect();
    bridge?.remove();
    restoreAll();
    delete window.bcChromeV19CheckpointDestroy;
    delete window.__bcChromeV19CheckpointInstalled;
    console.info('BC_CHROME_V19 CHECKPOINT RESTORED');
  }

  window.bcChromeV19CheckpointDestroy = destroy;
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  for (const root of roots) {
    if (root !== document) root.addEventListener('scroll', onScroll,
      { capture: true, passive: true });
  }

  init();
  checkTimer = setInterval(init, 1500);
  console.info('BC_CHROME_V19 checkpoint installed. Original coupon click requires testing.');
})();
