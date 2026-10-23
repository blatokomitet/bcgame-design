/* BC.GAME Live cards refinement v1.0 — temporary Eruda test.
   Scope: live football cards inside the existing open Shadow DOM.
   DOES NOT edit the site's permanent script or the top navigation bell.
   Rollback: window.bcLiveCardRefinement.restore()
*/
(() => {
  'use strict';
  const KEY = '__bcLiveCardRefinementV10';
  window[KEY]?.restore?.();

  // Keep the experiment on the intended live page only.
  if (!location.pathname.includes('/sports/live')) {
    console.warn('[BC Live Cards v1.0] Откройте страницу /sports/live');
    return;
  }

  function rootsIn(node, result = []) {
    if (node.querySelector?.('.sc-1oeg2ad-1')) result.push(node);
    node.querySelectorAll?.('*').forEach(el => {
      if (el.shadowRoot) rootsIn(el.shadowRoot, result);
    });
    return result.filter(root => root !== document);
  }

  const roots = rootsIn(document);
  const root = roots.find(r =>
    r.querySelector('a[href*="/sports/soccer/"] .sc-1oeg2ad-1')
  );
  if (!root) {
    console.warn('[BC Live Cards v1.0] Shadow DOM со счётом матчей не найден. Ничего не изменено.');
    return;
  }

  const groupSelector = '.sc-1nrofdy-1:has(> a.sc-1nrofdy-9)';
  const groups = () => [...root.querySelectorAll(groupSelector)]
    .filter(g => !!g.querySelector('a[href*="/sports/soccer/"]'));

  const initialGroups = groups();
  if (!initialGroups.length) {
    console.warn('[BC Live Cards v1.0] Структура карточек изменилась. Ничего не изменено.');
    return;
  }

  const css = document.createElement('style');
  css.id = 'bc-live-card-refinement-v10';
  css.textContent = [
    /* Larger, high-contrast scores; unchanged red accent and alignment. */
    groupSelector + ' a[href*="/sports/soccer/"] .sc-1oeg2ad-1 {',
    'font-size:36px!important;',
    'font-weight:850!important;',
    'line-height:1!important;',
    'font-variant-numeric:tabular-nums!important;',
    'letter-spacing:-.5px!important;',
    '}',

    /* Only explicitly identified LEAGUE symbols are muted and reduced. */
    '[data-bc-league-icon-v10="1"] {',
    'transform:scale(.70)!important;',
    'transform-origin:center center!important;',
    'opacity:.48!important;',
    'filter:grayscale(1) brightness(.9)!important;',
    '}',

    /* Only bell controls inside the MATCH CARDS are removed. */
    '[data-bc-match-bell-v10="1"] {display:none!important;}'
  ].join('\n');
  root.appendChild(css);

  const taggedIcons = new Set();
  const taggedBells = new Set();
  const rect = el => el.getBoundingClientRect();
  const validRect = r => r.width > 0 && r.height > 0;

  function markLeagueIcon(group) {
    const g = rect(group);
    if (!validRect(g)) return;
    const choices = [...group.querySelectorAll('img,svg,[role="img"]')]
      .filter(el => {
        const r = rect(el);
        return validRect(r) && r.width >= 16 && r.height >= 16 &&
          r.width <= 76 && r.height <= 76 &&
          r.left - g.left >= 6 && r.left - g.left <= 80 &&
          r.top - g.top >= 5 && r.top - g.top <= 74;
      })
      .sort((a, b) => {
        const ar = rect(a), br = rect(b);
        return (ar.top - g.top) + (ar.left - g.left) * .4 -
               ((br.top - g.top) + (br.left - g.left) * .4);
      });
    const icon = choices[0];
    if (icon && !icon.hasAttribute('data-bc-league-icon-v10')) {
      icon.setAttribute('data-bc-league-icon-v10', '1');
      taggedIcons.add(icon);
    }
  }

  function isRightBellArea(r, g) {
    return validRect(r) && r.width >= 24 && r.width <= 66 &&
      r.height >= 24 && r.height <= 66 &&
      r.right >= g.right - 79 && r.right <= g.right + 4 &&
      r.top >= g.top + 53 && r.bottom <= g.bottom - 4;
  }

  function markMatchBell(group) {
    const g = rect(group);
    if (!validRect(g)) return;

    // First look for actual button controls, not logos or score text.
    let bell = [...group.querySelectorAll('button,[role="button"]')]
      .filter(el => isRightBellArea(rect(el), g) && el.querySelector('svg'))
      .sort((a, b) => rect(b).right - rect(a).right)[0];

    // Some BC.GAME variants render the control with div + svg.
    if (!bell) {
      const icons = [...group.querySelectorAll('svg')]
        .filter(svg => {
          const s = rect(svg);
          return validRect(s) && s.width >= 12 && s.width <= 36 &&
            s.height >= 12 && s.height <= 36 &&
            s.right > g.right - 75 && s.right <= g.right + 1 &&
            s.top > g.top + 55 && s.bottom < g.bottom - 8;
        });
      for (const svg of icons) {
        let el = svg;
        while (el.parentElement && el.parentElement !== group &&
          isRightBellArea(rect(el.parentElement), g)) {
          el = el.parentElement;
        }
        if (isRightBellArea(rect(el), g)) {
          bell = el;
          break;
        }
      }
    }
    if (bell && !bell.hasAttribute('data-bc-match-bell-v10')) {
      bell.setAttribute('data-bc-match-bell-v10', '1');
      taggedBells.add(bell);
    }
  }

  function apply() {
    groups().forEach(g => {
      markLeagueIcon(g);
      markMatchBell(g);
    });
  }

  let active = true;
  let queued = false;
  const observer = new MutationObserver(() => {
    if (!active || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (active) apply();
    });
  });
  apply();
  observer.observe(root, {subtree:true, childList:true});

  function status() {
    return {
      active,
      groups:groups().length,
      enlargedScores:root.querySelectorAll(
        groupSelector + ' a[href*="/sports/soccer/"] .sc-1oeg2ad-1'
      ).length,
      mutedLeagueIcons:[...taggedIcons].filter(el => el.isConnected).length,
      hiddenMatchBells:[...taggedBells].filter(el => el.isConnected).length,
      scoreSize:'36px',
      rollback:'window.bcLiveCardRefinement.restore()'
    };
  }

  function restore() {
    active = false;
    observer.disconnect();
    css.remove();
    taggedIcons.forEach(el => el.removeAttribute('data-bc-league-icon-v10'));
    taggedBells.forEach(el => el.removeAttribute('data-bc-match-bell-v10'));
    taggedIcons.clear();
    taggedBells.clear();
    delete window[KEY];
    delete window.bcLiveCardRefinement;
    return 'BC Live Cards v1.0 отключён; исходный вид восстановлен';
  }

  window[KEY] = {status,restore};
  window.bcLiveCardRefinement = window[KEY];
  console.info('[BC Live Cards v1.0]', status());
})();
