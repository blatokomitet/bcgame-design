// ==UserScript==
// @name         BC.GAME Sofascore Compact v2.8 — EXPERIMENT
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.8.0
// @description  Independent compact layout test; no inline score changes
// @match        https://bcgame.st/ru/sports/*
// @match        https://*.bcgame.st/ru/sports/*
// @run-at       document-start
// @resource     sofaCSS https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.8.css
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.8.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.8.user.js
// @grant        GM_getResourceText
// ==/UserScript==
(() => {
  'use strict';
  const css=GM_getResourceText('sofaCSS');
  if (!css) {console.warn('[BC v2.8] Missing CSS');return;}
  const id='bc-sofa-v28-style';
  const managed=new Map();
  let running=true,queued=false;
  function timeValue(s) {
    const min=s.match(/\b\d{1,3}\s*[′']/);
    if(min) return min[0].replace(/\s+/g,'');
    if(/перерыв|half.?time/i.test(s)) return 'HT';
    const clock=s.match(/\b\d{1,2}:\d{2}\b/);
    if(clock)return clock[0];
    return s.trim().slice(0,12);
  }
  function applyRoot(root) {
    if(!root.querySelector('a.sc-1nrofdy-9'))return;
    if(!root.getElementById(id)){
      const style=document.createElement('style');style.id=id;style.textContent=css;
      root.appendChild(style);managed.set(root,style);
    }
    root.querySelectorAll('a.sc-1nrofdy-9').forEach(link=>{
      const source=link.querySelector('.sc-16ixfl8-0');
      if(!source)return;
      let label=link.querySelector(':scope > .bc-v28-time');
      if(!label){label=document.createElement('span');label.className='bc-v28-time';link.appendChild(label);}
      const next=timeValue(source.textContent||'');
      if(label.textContent!==next)label.textContent=next;
    });
  }
  function scan() {
    if(!running)return;
    for(const host of document.querySelectorAll('*')){
      const root=host.shadowRoot;
      if(root&&root.querySelector('a.sc-1nrofdy-9'))applyRoot(root);
    }
    for(const root of managed.keys())applyRoot(root);
  }
  function schedule(){
    if(queued||!running)return;queued=true;
    requestAnimationFrame(()=>{queued=false;scan();});
  }
  const pageObserver=new MutationObserver(schedule);
  const rootObservers=new Map();
  function attachObservers(){
    for(const root of managed.keys()){
      if(rootObservers.has(root))continue;
      const o=new MutationObserver(schedule);
      o.observe(root,{subtree:true,childList:true,characterData:true});
      rootObservers.set(root,o);
    }
  }
  function run(){scan();attachObservers();}
  function start(){
    run();
    pageObserver.observe(document,{childList:true,subtree:true});
    // Root mutations do not cross the Shadow DOM boundary.
    const refresh=()=>{if(!running)return;run();};
    for(const root of managed.keys()){
      if(!rootObservers.has(root)){
        const o=new MutationObserver(()=>{schedule();});
        o.observe(root,{childList:true,subtree:true,characterData:true});
        rootObservers.set(root,o);
      }
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  // Keep observers attached when a new root is discovered.
  const originalScan=scan;
  // Detach safely via disabling the userscript and reloading.
  console.info('[BC v2.8] Loaded. Test only with v2.2 disabled.');
})();
