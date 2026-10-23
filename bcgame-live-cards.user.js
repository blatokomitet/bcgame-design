// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      1.0.0
// @description  Refine existing BC.GAME football live cards: smaller muted league logos, larger red score, no in-card bells
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

  // Independent live-card enhancement. Never modify the installed header userscript.
  const KEY = '__bcLiveCardsInstalledV1';
  if (window[KEY]) return;

  // Only activate on the live sports page.
  const isLivePage = () => /^\/([a-z]{2}\/)?sports\/live(?:\/|$)/.test(location.pathname);
  const GROUP = '.sc-1nrofdy-1:has(> a.sc-1nrofdy-9)';
  const MATCH_LINK = 'a[href*="/sports/soccer/"]';
  const SCORE = '.sc-1oeg2ad-1';

  let root = null;
  let observer = null;
  let style = null;
  let active = true;
  let scheduled = false;
  const leagueIcons = new Set();
  const bells = new Set();

  const rect = element => element.getBoundingClientRect();
  const visible = r => r.width > 0 && r.height > 0;

  // Search across open Shadow DOM boundaries. Do not query or change closed roots.
  function findRoot() {
    const queue = [document];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      if (node instanceof ShadowRoot && node.querySelector(MATCH_LINK + ' ' + SCORE)) {
        return node;
      }
      node.querySelectorAll?.('*').forEach(el => {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
    return null;
  }

  function matchGroups() {
    if (!root) return [];
    return [...root.querySelectorAll(GROUP)]
      .filter(el => !!el.querySelector(MATCH_LINK));
  }

  function markLeagueLogo(group) {
    const gr = rect(group);
    if (!visible(gr)) return;

    // League icons sit in the upper-left header of the match card.
    // Never touch team crests lower in the card.
    const logo = [...group.querySelectorAll('img,svg,[role="img"]')]
      .filter(el => {
        const r = rect(el);
        const x = r.left - gr.left, y = r.top - gr.top;
        return visible(r) &&
          r.width >= 16 && r.width <= 76 &&
          r.height >= 16 && r.height <= 76 &&
          x >= 6 && x <= 80 && y >= 5 && y <= 74;
      })
      .sort((a, b) => {
        const ar = rect(a), br = rect(b);
        return (ar.top - gr.top) + .4 * (ar.left - gr.left) -
          (br.top - gr.top) - .4 * (br.left - gr.left);
      })[0];

    if (logo && !logo.hasAttribute('data-bc-live-league-v1')) {
      logo.setAttribute('data-bc-live-league-v1', '');
      leagueIcons.add(logo);
    }
  }

  function inBellArea(r, gr) {
    return visible(r) &&
      r.width >= 24 && r.width <= 66 &&
      r.height >= 24 && r.height <= 66 &&
      r.right >= gr.right - 79 && r.right <= gr.right + 4 &&
      r.top >= gr.top + 53 && r.bottom <= gr.bottom - 4;
  }

  function markInCardBell(group) {
    const gr = rect(group);
    if (!visible(gr)) return;

    // Prefer a real button. The global header is outside this group.
    let bell = [...group.querySelectorAll('button,[role="button"]')]
      .filter(el => inBellArea(rect(el), gr) && !!el.querySelector('svg'))
      .sort((a, b) => rect(b).right - rect(a).right)[0];

    // Fallback: div-based circular icon control on the card's right edge.
    if (!bell) {
      const icons = [...group.querySelectorAll('svg')]
        .filter(el => {
          const r = rect(el);
          return visible(r) &&
            r.width >= 12 && r.width <= 36 &&
            r.height >= 12 && r.height <= 36 &&
            r.right >= gr.right - 75 && r.right <= gr.right + 1 &&
            r.top > gr.top + 55 && r.bottom < gr.bottom - 8;
        });
      for (const svg of icons) {
        let candidate = svg;
        while (candidate.parentElement &&
               candidate.parentElement !== group &&
               inBellArea(rect(candidate.parentElement), gr)) {
          candidate = candidate.parentElement;
        }
        if (inBellArea(rect(candidate), gr)) {
          bell = candidate;
          break;
        }
      }
    }
    if (bell && !bell.hasAttribute('data-bc-live-bell-v1')) {
      bell.setAttribute('data-bc-live-bell-v1', '');
      bells.add(bell);
    }
  }

  function apply() {
    if (!active || !root || !isLivePage()) return;
    matchGroups().forEach(group => {
      markLeagueLogo(group);
      markInCardBell(group);
    });
  }

  function installOnRoot(candidate) {
    if (observer) observer.disconnect();
    if (style) style.remove();
    root = candidate;

    // Small isolated overrides; preserve card structure, typography and layout.
    style = document.createElement('style');
    style.id = 'bc-live-cards-installed-v1';
    style.textContent = `
      ${GROUP} ${MATCH_LINK} ${SCORE} {
        font-size: 36px !important;
        line-height: 1 !important;
        font-weight: 850 !important;
        font-variant-numeric: tabular-nums !important;
        letter-spacing: -.5px !important;
        color: #f04f68 !important;
        overflow: visible !important;
      }
      [data-bc-live-league-v1] {
        transform: scale(.70) !important;
        transform-origin: center center !important;
        opacity: .48 !important;
        filter: grayscale(1) brightness(.9) !important;
      }
      [data-bc-live-bell-v1] { display: none !important; }
    `;
    root.appendChild(style);

    observer = new MutationObserver(() => {
      if (scheduled || !active) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        apply();
      });
    });
    observer.observe(root, {subtree: true, childList: true});
    apply();
    console.info('[BC.GAME LIVE Cards v1] Activated', status());
  }

  function tick() {
    if (!active) return;
    if (!isLivePage()) {
      if (observer) { observer.disconnect(); observer = null; }
      if (style) { style.remove(); style = null; }
      root = null;
      return;
    }
    if (root?.host?.isConnected && style?.isConnected) return;
    const candidate = findRoot();
    if (candidate && matchGroupsIn(candidate).length) installOnRoot(candidate);
  }

  function matchGroupsIn(candidate) {
    return [...candidate.querySelectorAll(GROUP)].filter(el => !!el.querySelector(MATCH_LINK));
  }

  function status() {
    return {
      running: active,
      pageMatches: isLivePage(),
      shadowRootReady: !!root,
      liveCards: matchGroups().length,
      bigScores: root ? root.querySelectorAll(GROUP + ' ' + MATCH_LINK + ' ' + SCORE).length : 0,
      mutedLeagueIcons: [...leagueIcons].filter(el => el.isConnected).length,
      hiddenCardBells: [...bells].filter(el => el.isConnected).length,
      scoreFontSize: '36px',
      otherScriptsChanged: false
    };
  }

  function restore() {
    active = false;
    clearInterval(interval);
    observer?.disconnect();
    style?.remove();
    leagueIcons.forEach(el => el.removeAttribute('data-bc-live-league-v1'));
    bells.forEach(el => el.removeAttribute('data-bc-live-bell-v1'));
    leagueIcons.clear();
    bells.clear();
    delete window[KEY];
    return 'BC.GAME LIVE Cards: стили отключены, исходные элементы восстановлены.';
  }

  // If an earlier temporary Eruda version is active, avoid double styling.
  try { window.bcLiveCardRefinement?.restore?.(); } catch (e) {}
  const interval = setInterval(tick, 1500);
  window[KEY] = {status, restore};
  tick();
})();
