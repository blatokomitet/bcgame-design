// ==UserScript==
// @name         BC.GAME Sofascore Compact v2.9 — Compact
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.9.1
// @description  Published consolidated console design: red time, white score, 1px green divider
// @match        https://bcgame.st/ru/sports/*
// @match        https://*.bcgame.st/ru/sports/*
// @run-at       document-start
// @resource     sofaCSS https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.9.css?v=2.9.1
// @updateURL    https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.9.user.js
// @downloadURL  https://raw.githubusercontent.com/blatokomitet/bcgame-design/main/experiments/sofascore-v2.9.user.js
// @grant        GM_getResourceText
// ==/UserScript==
(() => {
  'use strict';
  const css = GM_getResourceText('sofaCSS');
  if (!css) return console.warn('[BC v2.9] CSS missing');
  const id='bc-sofa-v29-style';
  const observers=new Map();
  let active=true, queued=false;
  function timeValue(s) {
    const minute=s.match(/\d{1,3}\s*[′']/);
    if(minute)return minute[0].replace(/\s+/g,'');
    if(/перерыв|half.?time/i.test(s))return 'HT';
    const clock=s.match(/\b\d{1,2}:\d{2}\b/);
    return clock ? clock[0] : s.trim().slice(0,12);
  }
  function updateRoot(root) {
    if(!root.querySelector('a.sc-1nrofdy-9'))return;
    if(!root.getElementById(id)){
      const style=document.createElement('style');
      style.id=id;style.textContent=css;root.appendChild(style);
    }
    root.querySelectorAll('a.sc-1nrofdy-9').forEach(link=>{
      const source=link.querySelector('.sc-16ixfl8-0');
      if(!source)return;
      let label=link.querySelector(':scope > .bc-v28-time');
      if(!label){
        label=document.createElement('span');
        label.className='bc-v28-time';
        link.appendChild(label);
      }
      const value=timeValue(source.textContent||'');
      if(label.textContent!==value)label.textContent=value;
    });
    if(!observers.has(root)){
      const obs=new MutationObserver(queue);
      obs.observe(root,{subtree:true,childList:true,characterData:true});
      observers.set(root,obs);
    }
  }
  function scan() {
    if(!active)return;
    for(const host of document.querySelectorAll('*')){
      if(host.shadowRoot)updateRoot(host.shadowRoot);
    }
    for(const root of observers.keys())updateRoot(root);
  }
  function queue(){
    if(queued||!active)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;scan();});
  }
  const documentObserver=new MutationObserver(queue);
  function start(){
    scan();
    documentObserver.observe(document,{subtree:true,childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  console.info('[BC Sofa v2.9] Consolidated layout loaded');
})();
