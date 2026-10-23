// ==UserScript==
// @name         BC.GAME Match Cards — Live Bridge
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      0.1.2
// @description  Safe live match-card styling test, with audit and reversible changes.
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function(){
'use strict';
if(window.__bcMatchCardsLiveBridgeV31) return;
const STYLE_ID='bc-match-cards-bridge-v31-style';
const CSS=`
/* Lightweight live-only enhancements; original match DOM, links and scores remain untouched. */
body .bc-live-bridge-highlight{transition:background-color .25s,border-color .25s,box-shadow .25s!important;}
body .bc-live-bridge-highlight:active{background-color:rgba(20,229,141,.045)!important;}
@media(prefers-reduced-motion:reduce){body .bc-live-bridge-highlight{transition:none!important;}}
`;
let enabled=true;
let observer=null;
const touched=new Set();
const st=document.createElement('style');st.id=STYLE_ID;st.textContent=CSS;document.documentElement.appendChild(st);
function scan(){
 if(!enabled)return;
 const candidates=[...document.querySelectorAll('a[href*="/sports/"],[role="link"]')];
 let count=0;
 for(const el of candidates){
  if(el.closest('nav,header,footer'))continue;
  if(el.querySelectorAll('img').length<2)continue;
  if(el.getBoundingClientRect().width<150)continue;
  el.classList.add('bc-live-bridge-highlight');touched.add(el);count++;
 }
 return count;
}
function audit(){
 const leafs=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&e.textContent&&/^(?:\d{1,2}['′]|HT|FT|\d{1,2}:\d{2})$/.test(e.textContent.trim())).slice(0,25);
 const describe=e=>({tag:e.tagName,cls:String(e.className||'').slice(0,140),role:e.getAttribute('role'),href:e.getAttribute('href'),text:(e.innerText||'').trim().slice(0,145),html:e.outerHTML.slice(0,280)});
 const samples=leafs.slice(0,8).map(e=>({marker:e.textContent.trim(),self:describe(e),parent: e.parentElement?describe(e.parentElement):null,grandparent:e.parentElement?.parentElement?describe(e.parentElement.parentElement):null}));
 const anchors=[...document.querySelectorAll('a[href]')];
 const imgs=[...document.querySelectorAll('img')];
 return {version:'0.1.2',status:enabled?'active':'disabled',url:location.href,counts:{anchors:anchors.length,images:imgs.length,buttons:document.querySelectorAll('button').length,shadowHosts:[...document.querySelectorAll('*')].filter(e=>e.shadowRoot).length,matchTimeNodes:leafs.length},timeSamples:samples,linkSamples:anchors.slice(0,8).map(e=>({href:e.getAttribute('href'),text:e.innerText?.slice(0,70)})),shadowHosts:[...document.querySelectorAll('*')].filter(e=>e.shadowRoot).slice(0,8).map(e=>({tag:e.tagName,cls:e.className}))};
}
function disable(){enabled=false;observer?.disconnect();for(const x of touched)x.classList.remove('bc-live-bridge-highlight');touched.clear();st.remove();}
observer=new MutationObserver(()=>{if(enabled){clearTimeout(window.__bcBridgeTimer);window.__bcBridgeTimer=setTimeout(scan,350);}});
observer.observe(document.body||document.documentElement,{subtree:true,childList:true});
scan();
const api={audit,scan,disable};window.__bcMatchCardsLiveBridgeV31=api;
console.info('[BC.GAME Match Cards Live Bridge]',audit());
})();