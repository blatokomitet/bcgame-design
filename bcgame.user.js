// ==UserScript==
// @name         BC.GAME Design — Minimal Header v2.1
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      0.3.3
// @description  Minimal Header: compact balance, gift overflow, 360px logo-fit guard
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

  function activate() {
    const header = document.querySelector('.page-header');
    if (!header || window.innerWidth < 360) return false;
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
    const restore = () => {
      if (onOutside) document.removeEventListener('click', onOutside);
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
      // Prefer a regular flex adjustment, without translating the deposit button.
      // Preserve the live layout if the device has less room.
      const before = balance.getBoundingClientRect();
      if (window.innerWidth >= 390 && before.width <= 205) {
        set(balance,'transform','none');
        set(balance,'width','222px');
        set(balance,'max-width','222px');
        set(balance,'flex','0 0 222px');
        set(balance,'margin-left','-22px');
      }
      // At 360-389px the original outer padding (10px per side) can
      // squeeze the BC.GAME logo to 18px. Reclaim side padding and
      // the row gap rather than reducing the wallet or covering actions.
      // This applies only to the compact layout; the 390px+ layout
      // continues to use its previously approved sizing.
      if (window.innerWidth >= 360 && window.innerWidth < 390) {
        const logoGroup = logo.parentElement;
        const row = logoGroup?.parentElement;
        const image = logo.querySelector('img');
        if (row && row.contains(container) && image) {
          const checkpoint = saved.length;
          const rightWidth = Math.ceil(container.getBoundingClientRect().width);
          // The row's space-between was redistributing reclaimed space
          // back into a wide gap; pin a small 2px gap explicitly.
          set(row, 'padding-left', '0px');
          set(row, 'padding-right', '0px');
          set(row, 'justify-content', 'flex-start');
          set(row, 'column-gap', '2px');
          set(logoGroup, 'flex', '0 0 35px');
          set(logoGroup, 'width', '35px');
          set(logoGroup, 'min-width', '35px');
          set(logo, 'flex', '0 0 35px');
          set(logo, 'width', '35px');
          set(logo, 'min-width', '35px');
          set(logo, 'flex-shrink', '0');
          set(image, 'width', '35px');
          set(image, 'height', '35px');
          set(image, 'min-width', '35px');
          set(image, 'max-width', 'none');
          set(image, 'object-fit', 'contain');
          set(container, 'flex', '0 0 ' + rightWidth + 'px');

          const l = logo.getBoundingClientRect();
          const i = image.getBoundingClientRect();
          const b = balance.getBoundingClientRect();
          const a = avatar.getBoundingClientRect();
          const fit = l.width >= 34 && i.width >= 34 &&
            b.left >= l.right + 1 && a.right <= window.innerWidth - 1 &&
            b.width >= 165;
          if (!fit) {
            for (const [el, prop, value, priority] of saved.splice(checkpoint).reverse()) {
              if (value) el.style.setProperty(prop, value, priority);
              else el.style.removeProperty(prop);
            }
            console.warn('[BC Header v2.1] compact logo fit unavailable; preserved original layout');
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
      active = { header, restore };
      console.info('[BC Header v2.1] ACTIVE', {scriptVersion:'0.3.3',logoWidth:Math.round(logo.getBoundingClientRect().width),balanceX:Math.round(rb.x),balanceWidth:Math.round(rb.width),depositX:Math.round(rd.x)});
      return true;
    } catch (e) {
      restore();
      console.error('[BC Header v2.1] error', e);
      return false;
    }
  }

  const start = () => {
    if (active && active.header.isConnected) return true;
    if (active) active.restore();
    return activate();
  };
  window[STATE] = {
    status: () => ({ installed:true, version:'0.3.3', active:!!active, attempts }),
    restore: () => { if (timer) clearInterval(timer); active?.restore(); delete window[STATE]; }
  };
  if (!start()) {
    timer = setInterval(() => {
      attempts++;
      if (start() || attempts >= 120) clearInterval(timer);
    }, 500);
  }
})();
