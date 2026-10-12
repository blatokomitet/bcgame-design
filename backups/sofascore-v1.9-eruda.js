/* BC.GAME Sofascore v1.9 — historical Eruda snapshot
 * Reconstructed from the chat test on 2026-10-12.
 * NOT an installable userscript. Do not combine with other v1.x trials.
 * Known issues: LIVE card flicker, partial restoration of previous v1.4 inline styles,
 * and sensitivity to dynamic sc-* classes. Use only after evaluating on a clean page.
 */
(() => {
  'use strict';
  const KEY = '__bcScoreV19';
  window[KEY]?.stop?.();

  const roots = [...document.querySelectorAll('*')]
    .map(el => el.shadowRoot).filter(Boolean);
  const root = roots.find(r => r.querySelector('a[href*="/sports/soccer/"]'));
  if (!root) return { error: 'Shadow DOM не найден' };

  [
    'bc-sofa-v1', 'bc-sofa-v11', 'bc-score-v12',
    'bc-sofa-v14', 'bc-sofa-v15', 'bc-sofa-v16',
    'bc-sofa-v17', 'bc-sofa-v18'
  ].forEach(id => root.getElementById(id)?.remove());

  // Historical behaviour from v1.9; the v1.4 restore can restore earlier inline values.
  window.__bcSofaV14?.restore?.();

  const style = document.createElement('style');
  style.id = 'bc-score-v19';
  style.textContent = `
    a[href*="/sports/soccer/"] .sc-7l8my2-0 {
      transform: none !important; gap: 0 !important;
    }
    a[href*="/sports/soccer/"] .sc-7l8my2-1 {
      height: 32px !important; min-height: 32px !important;
      background: transparent !important; border: 0 !important;
      box-shadow: none !important;
    }
    a[href*="/sports/soccer/"] .sc-1oeg2ad-1 {
      font-size: 21px !important; line-height: 1 !important;
      font-weight: 800 !important; color: #20d982 !important;
      font-variant-numeric: tabular-nums !important;
    }
    .sc-1nrofdy-1:has(> a.sc-1nrofdy-9) > div:nth-child(3) {
      display: none !important;
    }
    .sc-1nrofdy-1:has(> a.sc-1nrofdy-9)
    > .sc-1nrofdy-2 > .sc-1nrofdy-3:last-child {
      display: none !important;
    }
  `;
  root.appendChild(style);

  const saved = new Map();
  const selector = 'a[href*="/sports/soccer/"] .sc-1oeg2ad-1';
  function apply() {
    root.querySelectorAll(selector).forEach(el => {
      if (!saved.has(el)) saved.set(el, [
        el.style.getPropertyValue('font-size'),
        el.style.getPropertyPriority('font-size')
      ]);
      if (getComputedStyle(el).fontSize !== '21px') {
        el.style.setProperty('font-size', '21px', 'important');
      }
    });
  }

  let queued = false;
  let active = true;
  const observer = new MutationObserver(() => {
    if (queued || !active) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (active) apply();
    });
  });

  apply();
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['style']
  });

  window[KEY] = {
    stop() {
      active = false;
      observer.disconnect();
      style.remove();
      saved.forEach(([value, priority], el) => {
        if (value) el.style.setProperty('font-size', value, priority);
        else el.style.removeProperty('font-size');
      });
      saved.clear();
      delete window[KEY];
      return 'v1.9 остановлен';
    }
  };

  return {
    status: 'Sofascore v1.9',
    scoreSize: '21px',
    scores: root.querySelectorAll(selector).length,
    observer: 'active',
    restore: 'window.__bcScoreV19.stop()'
  };
})();
