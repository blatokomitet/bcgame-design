// ==UserScript==
// @name         BC.GAME Design — Minimal Header v2.0
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      0.3.0
// @description  Minimal Header v2.0: автоматическое применение после загрузки страницы
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/bcgame.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Automatically apply header experiment when SPA header is ready.
// No changes to the bottom navigation, sports cards or colors.
(() => {
  'use strict';
  const tryStart = () => {
    if (window.bcMinimalHeaderRestore || !document.querySelector('.page-header')) return false;
    (() => {
  'use strict';
  window.bcMinimalHeaderRestore?.();

  const header = document.querySelector('.page-header');
  const logo = header?.querySelector('a.active');
  const deposit = header?.querySelector('button.button-brand');
  const balance = deposit?.parentElement;
  const gift = balance?.parentElement?.querySelector('button.bg-alw_white');
  const nativeButtons = header
    ? [...header.querySelectorAll('button')]
        .filter(el => el.getBoundingClientRect().width > 0)
    : [];
  const bell = nativeButtons.find(el => el !== deposit && el !== gift &&
    el.querySelector('svg') && !el.querySelector('img'));
  const avatar = nativeButtons.find(el => el.querySelector('img[alt="avatar"]'));

  if (!header || !logo || !deposit || !balance || !gift || !bell || !avatar ||
      balance.parentElement !== gift.parentElement ||
      balance.parentElement !== avatar.parentElement ||
      window.innerWidth < 390 || window.innerWidth > 430) {
    console.warn('BC Minimal Header: structure or viewport differs; no changes.');
    return;
  }

  const right = balance.parentElement;
  const saved = [];
  const put = (el, property, value) => {
    saved.push([el, property, el.style.getPropertyValue(property),
      el.style.getPropertyPriority(property)]);
    el.style.setProperty(property, value, 'important');
  };
  const menu = document.createElement('button');
  const popover = document.createElement('div');
  const giftAction = document.createElement('button');
  let listening = false;
  const close = event => {
    if (!menu.contains(event.target) && !popover.contains(event.target)) {
      popover.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
    }
  };
  const restore = () => {
    if (listening) document.removeEventListener('click', close);
    menu.remove();
    popover.remove();
    for (const [el, prop, value, priority] of saved.reverse()) {
      if (value) el.style.setProperty(prop, value, priority);
      else el.style.removeProperty(prop);
    }
    delete window.bcMinimalHeaderRestore;
  };

  try {
    menu.type = 'button';
    menu.textContent = '⋯';
    menu.setAttribute('aria-label', 'Дополнительные функции');
    menu.setAttribute('aria-expanded', 'false');
    menu.style.cssText = 'display:flex;align-items:center;justify-content:center;width:34px;min-width:34px;height:38px;padding:0;border:0;border-radius:8px;color:inherit;background:var(--bg-white-alpha5,rgba(255,255,255,.05));font-family:inherit;font-size:22px;line-height:1;cursor:pointer;flex:0 0 34px;';
    menu.addEventListener('click', event => {
      event.stopPropagation();
      popover.hidden = !popover.hidden;
      menu.setAttribute('aria-expanded', String(!popover.hidden));
    });
    popover.hidden = true;
    popover.style.cssText = 'position:fixed;top:51px;right:12px;z-index:100001;padding:8px;border-radius:12px;background:#25302e;color:white;box-shadow:0 8px 28px #0007;';
    giftAction.type = 'button';
    giftAction.textContent = '🎁 Подарки и бонусы';
    giftAction.style.cssText = 'border:0;background:transparent;color:inherit;padding:12px;font-size:14px;cursor:pointer;';
    giftAction.addEventListener('click', () => {
      popover.hidden = true;
      menu.setAttribute('aria-expanded', 'false');
      gift.click();
    });
    popover.appendChild(giftAction);
    right.insertBefore(menu, avatar);
    document.body.appendChild(popover);
    put(gift, 'display', 'none');
    put(header, 'height', '47px');
    put(balance, 'transform', 'none');
    put(balance, 'width', '222px');
    put(balance, 'max-width', '222px');
    put(balance, 'flex', '0 0 222px');
    put(balance, 'margin-left', '-22px');
    for (const button of [deposit, bell, avatar]) {
      put(button, 'margin-left', '0px');
      put(button, 'margin-right', '0px');
      put(button, 'align-self', 'center');
      put(button, 'flex-shrink', '0');
    }
    put(bell, 'width', '38px');
    put(bell, 'height', '38px');
    put(avatar, 'width', '42px');
    put(avatar, 'height', '42px');

    const l = logo.getBoundingClientRect();
    const b = balance.getBoundingClientRect();
    const d = deposit.getBoundingClientRect();
    const n = bell.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const a = avatar.getBoundingClientRect();
    const valid = Math.abs(b.left - l.right - 12) < 5 &&
      Math.abs(b.width - 222) < 5 &&
      d.left >= b.left && d.right <= b.right &&
      d.right <= n.left && n.right <= m.left && m.right <= a.left &&
      a.right <= window.innerWidth;
    if (!valid) {
      restore();
      console.warn('BC Minimal Header: geometry validation failed; restored.');
      return;
    }
    document.addEventListener('click', close);
    listening = true;
    window.bcMinimalHeaderRestore = restore;
    console.log({
      status: 'Minimal Header v2.0 EXPERIMENT ACTIVE',
      balanceX: Math.round(b.x),
      balanceWidth: Math.round(b.width),
      depositX: Math.round(d.x),
      restore: 'bcMinimalHeaderRestore()'
    });
  } catch (error) {
    restore();
    console.error('BC Minimal Header: rolled back', error);
  }
})();

    return !!window.bcMinimalHeaderRestore;
  };
  if (tryStart()) return;
  let attempts = 0;
  const timer = setInterval(() => {
    if (tryStart() || ++attempts >= 40) clearInterval(timer);
  }, 500);
})();
