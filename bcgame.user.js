// ==UserScript==
// @name         BC.GAME Design — Minimal Header v2.1
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      0.4.0
// @description  Mobile compact flex header with full-sized brand and aligned controls
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  const STATE = '__bcMinimalHeaderV21';
  if (window[STATE]) return;
  let attempts = 0;
  let timer = null;
  let active = null;
  let observer = null;
  let scheduled = null;
  let disposed = false;
  let logoFit = { state: 'not-checked' };

  function activate() {
    const header = document.querySelector('.page-header');
    if (!header || window.innerWidth < 360 || window.innerWidth > 599) return false;
    const logo = header.querySelector('a.active');
    const deposit = header.querySelector('button.button-brand');
    const balance = deposit?.parentElement;
    const avatar = [...header.querySelectorAll('button')]
      .find(b => b.querySelector('img[alt="avatar"]'));
    if (!logo || !deposit || !balance || !avatar) return false;

    const container = balance.parentElement;
    if (!container || !container.contains(avatar)) return false;
    const buttons = [...container.querySelectorAll('button')];
    const gift = buttons.find(b => b !== deposit && b !== avatar &&
      (b.classList.contains('bg-alw_white') || b.classList.contains('dark:bg-white_alpha5')));
    const bell = buttons.find(b => b !== gift && b !== deposit && b !== avatar &&
      b.querySelector('svg'));
    if (!gift || !bell) return false;
    const saved = [];
    const set = (el, prop, value) => {
      saved.push([el, prop, el.style.getPropertyValue(prop), el.style.getPropertyPriority(prop)]);
      el.style.setProperty(prop, value, 'important');
    };
    const menu = document.createElement('button');
    const popup = document.createElement('div');
    const action = document.createElement('button');
    let onOutside = null;
    let onKeydown = null;
    const restore = () => {
      if (onOutside) document.removeEventListener('click', onOutside);
      if (onKeydown) document.removeEventListener('keydown', onKeydown);
      menu.remove();
      popup.remove();
      for (const [el, prop, value, priority] of saved.reverse()) {
        if (value) el.style.setProperty(prop, value, priority);
        else el.style.removeProperty(prop);
      }
      active = null;
    };
    try {
      menu.type = 'button';
      menu.textContent = '⋯';
      menu.setAttribute('aria-label', 'Дополнительные функции');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-controls', 'bc-header-overflow');
      popup.id = 'bc-header-overflow';
      menu.style.cssText = 'display:flex;align-items:center;justify-content:center;width:34px;min-width:34px;height:38px;padding:0;border:0;border-radius:8px;color:inherit;background:rgba(255,255,255,.05);font:inherit;font-size:22px;line-height:1;cursor:pointer;flex:0 0 34px;';
      popup.hidden = true;
      popup.style.cssText = 'position:fixed;top:51px;right:12px;z-index:100001;padding:8px;border-radius:12px;background:#25302e;color:#fff;box-shadow:0 8px 28px #0007;';
      action.type = 'button';
      action.textContent = '🎁 Подарки и бонусы';
      action.style.cssText = 'border:0;background:transparent;color:inherit;padding:12px;font-size:14px;cursor:pointer;';
      action.addEventListener('click', () => {
        popup.hidden = true;
        menu.setAttribute('aria-expanded', 'false');
        gift.click();
      });
      popup.append(action);
      menu.addEventListener('click', event => {
        event.stopPropagation();
        popup.hidden = !popup.hidden;
        menu.setAttribute('aria-expanded', String(!popup.hidden));
        if (!popup.hidden) action.focus();
      });
      container.insertBefore(menu, avatar);
      document.body.appendChild(popup);
      set(gift, 'display', 'none');
      set(header, 'height', '47px');
      for (const b of [deposit,bell,avatar]) {
        set(b,'margin-left','0px');
        set(b,'margin-right','0px');
        set(b,'align-self','center');
        set(b,'flex-shrink','0');
      }
      set(bell,'width','38px');
      set(bell,'height','38px');
      set(avatar,'width','42px');
      set(avatar,'height','42px');
      // Compact, balanced header for mobile screens. The previous
      // 390px+ breakpoint forced the wallet to 222px and -22px margin,
      // leaving the BC.GAME logo compressed to approximately 18px.
      // Keep the logo and wallet in the flex layout, never move them
      // outside their hit-test boxes using relative positioning.
      const viewport = document.documentElement.clientWidth;
      if (viewport >= 360 && viewport <= 430) {
        const logoBox = logo.parentElement;
        const image = logo.querySelector('img');
        const row = logoBox?.parentElement;

        if (logoBox && image && row?.contains(container)) {
          const checkpoint = saved.length;
          const walletWidth = Math.min(207, Math.max(174,
            Math.round(174 + (viewport - 360) * 0.45)
          ));

          // Reclaim the unused side padding while preserving margins.
          set(row, 'padding-left', '3px');
          set(row, 'padding-right', '3px');
          set(row, 'justify-content', 'space-between');
          set(row, 'column-gap', '6px');
          set(row, 'align-items', 'center');

          set(logoBox, 'flex', '0 0 35px');
          set(logoBox, 'width', '35px');
          set(logoBox, 'min-width', '35px');
          set(logoBox, 'max-width', '35px');
          set(logoBox, 'overflow', 'visible');
          set(logo, 'display', 'block');
          set(logo, 'flex', '0 0 35px');
          set(logo, 'width', '35px');
          set(logo, 'min-width', '35px');
          set(logo, 'max-width', '35px');
          set(logo, 'position', 'static');
          set(logo, 'margin', '0px');
          set(image, 'display', 'block');
          set(image, 'width', '35px');
          set(image, 'height', '35px');
          set(image, 'max-width', 'none');
          set(image, 'object-fit', 'contain');

          set(container, 'display', 'flex');
          set(container, 'align-items', 'center');
          set(container, 'justify-content', 'flex-start');
          set(container, 'column-gap', '4px');
          set(container, 'flex', '0 0 auto');
          set(container, 'width', 'auto');
          set(container, 'position', 'static');
          set(container, 'margin-left', '0px');
          set(container, 'margin-right', '0px');

          set(balance, 'width', walletWidth + 'px');
          set(balance, 'min-width', walletWidth + 'px');
          set(balance, 'max-width', walletWidth + 'px');
          set(balance, 'flex', '0 0 ' + walletWidth + 'px');
          set(balance, 'margin-left', '0px');
          set(balance, 'margin-right', '0px');
          set(balance, 'transform', 'none');
          set(balance, 'height', '36px');
          set(balance, 'box-sizing', 'border-box');
          set(balance, 'border-width', '1px');

          set(bell, 'width', '34px');
          set(bell, 'min-width', '34px');
          set(bell, 'height', '36px');
          set(bell, 'flex', '0 0 34px');

          set(menu, 'width', '34px');
          set(menu, 'min-width', '34px');
          set(menu, 'height', '36px');
          set(menu, 'flex', '0 0 34px');

          set(avatar, 'width', '42px');
          set(avatar, 'height', '42px');
          set(avatar, 'flex', '0 0 42px');

          const l = logo.getBoundingClientRect();
          const i = image.getBoundingClientRect();
          const w = balance.getBoundingClientRect();
          const d = deposit.getBoundingClientRect();
          const n = bell.getBoundingClientRect();
          const m = menu.getBoundingClientRect();
          const a = avatar.getBoundingClientRect();
          const group = container.getBoundingClientRect();
          const gap = w.left - l.right;

          const ok = l.width >= 34 && i.width >= 28 &&
            l.left >= 5 && gap >= 3 &&
            w.width >= 170 && a.right <= viewport - 4 &&
            d.left >= w.left - 1 && d.right <= w.right + 1 &&
            d.right <= n.left + 1 && n.right <= m.left + 1 &&
            m.right <= a.left + 1 && group.right <= viewport - 4;

          logoFit = {
            state: ok ? 'FITTED' : 'ROLLED_BACK',
            layout: 'compact-flex',
            logoWidth: Math.round(l.width),
            imageWidth: Math.round(i.width),
            walletWidth: Math.round(w.width),
            groupWidth: Math.round(group.width),
            gap: Math.round(gap * 10) / 10,
            avatarRight: Math.round(a.right),
            viewport,
            ok
          };

          if (!ok) {
            for (const [el, prop, value, priority] of saved.splice(checkpoint).reverse()) {
              if (value) el.style.setProperty(prop, value, priority);
              else el.style.removeProperty(prop);
            }
            console.warn('[BC Header v2.1] compact fit rejected', logoFit);
          } else {
            console.info('[BC Header v2.1] compact fit active', logoFit);
          }
        }
      }
      const rb = balance.getBoundingClientRect();
      const rd = deposit.getBoundingClientRect();
      const rn = bell.getBoundingClientRect();
      const rm = menu.getBoundingClientRect();
      const ra = avatar.getBoundingClientRect();
      if (rd.right > rn.left + 1 || rn.right > rm.left + 1 ||
          rm.right > ra.left + 1 || ra.right > window.innerWidth + 1 ||
          rd.left < rb.left - 1 || rd.right > rb.right + 1) {
        restore();
        console.warn('[BC Header v2.1] insufficient room, restored');
        return false;
      }
      onOutside = event => {
        if (!menu.contains(event.target) && !popup.contains(event.target)) {
          popup.hidden = true;
          menu.setAttribute('aria-expanded', 'false');
        }
      };
      document.addEventListener('click',onOutside);
      onKeydown = event => {
        if (event.key === 'Escape' && !popup.hidden) {
          popup.hidden = true; menu.setAttribute('aria-expanded', 'false'); menu.focus();
        }
      };
      document.addEventListener('keydown', onKeydown);
      active = { header, restore, nodes: [logo, deposit, balance, gift, bell, avatar, menu] };
      console.info('[BC Header v2.1] ACTIVE', {scriptVersion:'0.4.0',logoWidth:Math.round(logo.getBoundingClientRect().width),balanceX:Math.round(rb.x),balanceWidth:Math.round(rb.width),depositX:Math.round(rd.x)});
      return true;
    } catch (e) {
      restore();
      console.error('[BC Header v2.1] error', e);
      return false;
    }
  }

  const start = () => {
    if (disposed) return false;
    if (active && active.header.isConnected && active.nodes.every(node => node.isConnected)) return true;
    if (active) active.restore();
    return activate();
  };
  window[STATE] = {
    status: () => ({ installed:true, version:'0.4.0', active:!!active, attempts, logoFit }),
    restore: () => {
      disposed = true; clearInterval(timer); clearTimeout(scheduled);
      observer?.disconnect(); window.removeEventListener('resize', onResize);
      active?.restore(); delete window[STATE];
    }
  };
  function schedule() {
    if (disposed || scheduled !== null) return;
    scheduled = setTimeout(() => { scheduled = null; start(); }, 200);
  }
  function onResize() {
    active?.restore(); schedule();
  }
  observer = new MutationObserver(() => {
    if (!active || !active.header.isConnected || active.nodes.some(node => !node.isConnected)) schedule();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', onResize);
  if (!start()) {
    timer = setInterval(() => {
      attempts++;
      if (start() || attempts >= 120) clearInterval(timer);
    }, 500);
  }
})();

