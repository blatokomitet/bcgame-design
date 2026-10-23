// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.0.1
// @description  React-safe compact grouped Live List, reversible styles on original match elements
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
const KEY='__bcLiveCardsInstalledV1';
try{window[KEY]?.restore?.()}catch(err){console.warn('[BC Live List] cleanup',err)}
const VERSION='2.0.1';
const STYLE_ID='bc-live-list-v201-css';
const MATCH='a.bc2-event[href*="/sports/soccer/"]';
const BELL_PATH='M18 9a6 6 0 0 0-12 0';
const livePage=()=>/^\/(?:[a-z]{2}\/)?sports\/live(?:\/|$)/i.test(location.pathname);
const CSS="\n@media (max-width:768px) {\n.bc2-feed {\n  display:flex!important;flex-direction:column!important;gap:9px!important;\n  align-items:stretch!important;background:transparent!important;\n}\n.bc2-feed>.bc2-group {\n  display:flex!important;flex-direction:column!important;gap:0!important;\n  width:100%!important;height:auto!important;min-height:0!important;\n  margin:0!important;padding:0!important;overflow:hidden!important;\n  background:#191a1b!important;border:1px solid #2c2e2f!important;\n  border-radius:13px!important;box-shadow:none!important;\n}\n.bc2-feed>.bc2-group>:first-child:not(.bc2-event) {\n  display:flex!important;align-items:center!important;\n  min-height:38px!important;height:auto!important;\n  padding:7px 12px!important;margin:0!important;gap:8px!important;\n  background:#1d1e1f!important;border-bottom:1px solid #303234!important;\n  color:#e2b047!important;font-size:12px!important;\n  font-weight:800!important;letter-spacing:.25px!important;\n}\n.bc2-feed>.bc2-group>:first-child:not(.bc2-event) svg[data-cy=\"sport-soccer\"] {\n  width:20px!important;height:20px!important;min-width:20px!important;\n  min-height:20px!important;max-width:20px!important;max-height:20px!important;\n  opacity:.5!important;filter:grayscale(1)!important;flex-shrink:0!important;\n}\n.bc2-feed .bc2-group>a.bc2-event {\n  box-sizing:border-box!important;display:grid!important;\n  width:100%!important;max-width:none!important;height:70px!important;\n  min-height:70px!important;margin:0!important;padding:6px 11px!important;\n  border:0!important;border-radius:0!important;\n  background:transparent!important;color:#f4f4f4!important;\n  text-decoration:none!important;box-shadow:none!important;\n}\n.bc2-feed .bc2-group>a.bc2-event+a.bc2-event {\n  border-top:1px solid #303234!important;\n}\n.bc2-feed .bc2-event img {\n  width:21px!important;height:21px!important;\n  max-width:21px!important;max-height:21px!important;\n  object-fit:contain!important;\n}\n.bc2-feed .bc2-event svg[data-cy=\"sport-soccer\"] {\n  width:21px!important;height:21px!important;\n  max-width:21px!important;max-height:21px!important;\n}\n.bc2-feed .bc2-event .bc2-score {\n  display:block!important;font-size:23px!important;font-weight:850!important;\n  line-height:1!important;letter-spacing:-.4px!important;\n  font-variant-numeric:tabular-nums!important;color:#f5f6f5!important;\n  background:transparent!important;text-shadow:none!important;\n}\n.bc2-feed .bc2-event [class*=\"time\"],\n.bc2-feed .bc2-event [class*=\"minute\"],\n.bc2-feed .bc2-event [class*=\"status\"] {\n  color:#a2b66d!important;font-size:12px!important;font-weight:700!important;\n}\n.bc2-feed .bc2-bell {display:none!important;}\n}\n";
let active=true,root=null,style=null,timer=null,message='Waiting for sports DOM';
const bellStyles=new Map();

function findRoot(){
  const queue=[document];
  while(queue.length){
    const node=queue.shift();
    if(node instanceof ShadowRoot && node.querySelector('.bc2-feed '+MATCH+' .bc2-score'))return node;
    node.querySelectorAll?.('*').forEach(el=>{if(el.shadowRoot)queue.push(el.shadowRoot)});
  }
  return null;
}
function isBell(bell){
  return [...bell.querySelectorAll('svg path')].some(path=>
    (path.getAttribute('d')||'').startsWith(BELL_PATH));
}
function hideBells(){
  if(!root)return;
  for(const bell of root.querySelectorAll('.bc2-feed .bc2-bell')){
    if(!isBell(bell))continue;
    if(!bellStyles.has(bell)){
      bellStyles.set(bell,{
        value:bell.style.getPropertyValue('display'),
        priority:bell.style.getPropertyPriority('display')
      });
    }
    if(bell.style.getPropertyValue('display')!=='none' ||
       bell.style.getPropertyPriority('display')!=='important'){
      bell.style.setProperty('display','none','important');
    }
  }
  for(const bell of bellStyles.keys())if(!bell.isConnected)bellStyles.delete(bell);
}
function detach(){
  for(const [bell,old] of bellStyles){
    if(old.value)bell.style.setProperty('display',old.value,old.priority);
    else bell.style.removeProperty('display');
  }
  bellStyles.clear();
  style?.remove();
  style=null;
  root=null;
}
function tick(){
  if(!active)return;
  if(!livePage()){
    if(root)detach();
    message='Not on live page';
    return;
  }
  if(!root?.host?.isConnected){
    detach();
    root=findRoot();
    if(!root){message='Waiting for bc2-feed Shadow DOM';return;}
  }
  if(!root.querySelector('.bc2-feed')){
    message='Waiting for league groups';return;
  }
  if(!style?.isConnected){
    style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=CSS;
    root.appendChild(style);
  }
  hideBells();
  message='';
}
function status(){
  const feed=root?.querySelector('.bc2-feed');
  const group=feed?.querySelector('.bc2-group');
  const event=feed?.querySelector(MATCH);
  const score=event?.querySelector('.bc2-score');
  const bellEls=root?[...root.querySelectorAll('.bc2-feed .bc2-bell')].filter(isBell):[];
  return {
    version:VERSION,running:active,pageMatches:livePage(),
    shadowRootReady:!!root,
    layoutActive:!!style?.isConnected && !!feed && !!group && !!event,
    layoutMode:'CSS on original bc2-feed',
    leagues:feed?.querySelectorAll('.bc2-group').length||0,
    matches:feed?.querySelectorAll(MATCH).length||0,
    firstMatchHeight:event?Math.round(event.getBoundingClientRect().height):null,
    actualScoreFont:score?getComputedStyle(score).fontSize:null,
    leagueBackground:group?getComputedStyle(group).backgroundColor:null,
    exactBellIcons:bellEls.length,
    hiddenBellControls:bellEls.filter(el=>getComputedStyle(el).display==='none').length,
    previousLayoutRestorable:true,message:message||'Compact CSS active'
  };
}
function restore(){
  active=false;
  if(timer!==null)clearInterval(timer);
  detach();
  if(window[KEY]===api)delete window[KEY];
  if(window.bcLiveCardRefinement===api)delete window.bcLiveCardRefinement;
  return 'BC.GAME Live List v2.0.1 disabled; original elements restored';
}
const api={status,restore};
window[KEY]=api;
window.bcLiveCardRefinement=api;
timer=setInterval(tick,1800);
tick();
console.info('[BC.GAME Live List]',status());
})();
