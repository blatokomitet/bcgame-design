// ==UserScript==
// @name         BC.GAME — LIVE Football Cards
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.0.0
// @description  Compact, grouped live-score list with original match links and reversible native view
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

  const KEY = '__bcLiveCardsInstalledV1';
  if (window[KEY]?.restore) window[KEY].restore();

  const VERSION = '2.0.0';
  const SCORE = '.bc2-score';
  const MATCH = 'a[href*="/sports/soccer/"]';
  const PREFIX = 'bc-live-list-v2';
  const livePage = () => /^\/(?:[a-z]{2}\/)?sports\/live(?:\/|$)/i.test(location.pathname);

  let running = true;
  let root = null;
  let host = null;
  let view = null;
  let stylesheet = null;
  let lastSignature = '';
  let lastError = 'Waiting for matches';
  let renderedMatches = 0;
  let renderedLeagues = 0;
  let verifiedNames = 0;
  const nativeStyles = new Map();
  const cachedMatchNames = new Map();

  const rules = [
    '.' + PREFIX + ' {all:initial;display:block!important;color:#f3f3f3!important;',
    'font-family:system-ui,-apple-system,Arial,sans-serif!important;',
    'font-size:13px!important;line-height:1.3!important;',
    'background:transparent!important;width:100%!important;',
    'box-sizing:border-box!important;padding:8px 0 28px!important;}',
    '.' + PREFIX + ' * {box-sizing:border-box!important;}',
    '.' + PREFIX + ' .bc2v-group {background:#18191a;border:1px solid #292b2c;',
    'border-radius:13px;overflow:hidden;margin:0 0 10px;',
    'box-shadow:0 1px 3px rgba(0,0,0,.2);}',
    '.' + PREFIX + ' .bc2v-heading {height:42px;display:flex;align-items:center;',
    'justify-content:space-between;gap:8px;padding:0 13px;',
    'border-bottom:1px solid #323334;background:#1e1f20;}',
    '.' + PREFIX + ' .bc2v-league {font-weight:850;color:#e4b044;',
    'letter-spacing:.35px;text-transform:uppercase;font-size:12px;',
    'line-height:1.2;min-width:0;overflow:hidden;text-overflow:ellipsis;',
    'white-space:nowrap;}',
    '.' + PREFIX + ' .bc2v-count {flex:none;color:#898d90;font-size:12px;',
    'font-variant-numeric:tabular-nums;font-weight:650;}',
    '.' + PREFIX + ' .bc2v-match {display:grid!important;',
    'grid-template-columns:minmax(0,1fr) 43px 65px;',
    'grid-template-rows:repeat(2,30px);align-items:center;',
    'gap:0;padding:8px 8px 8px 12px;text-decoration:none!important;',
    'color:#f2f2f2!important;position:relative;',
    'background:transparent!important;min-height:76px;}',
    '.' + PREFIX + ' .bc2v-team:nth-child(1){grid-column:1;grid-row:1;}',
    '.' + PREFIX + ' .bc2v-score:nth-child(2){grid-column:2;grid-row:1;}',
    '.' + PREFIX + ' .bc2v-team:nth-child(3){grid-column:1;grid-row:2;}',
    '.' + PREFIX + ' .bc2v-score:nth-child(4){grid-column:2;grid-row:2;}',
    '.' + PREFIX + ' .bc2v-match + .bc2v-match {',
    'border-top:1px solid #303234;}',
    '.' + PREFIX + ' .bc2v-team {display:flex!important;align-items:center;',
    'gap:9px;min-width:0;overflow:hidden;height:30px;}',
    '.' + PREFIX + ' .bc2v-logo {display:block;width:19px;height:19px;',
    'object-fit:contain;flex:none;}',
    '.' + PREFIX + ' .bc2v-fallback {display:grid;place-items:center;',
    'flex:none;width:19px;height:19px;color:#7c8586;font-size:15px;}',
    '.' + PREFIX + ' .bc2v-name {font-size:13px;font-weight:650;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.' + PREFIX + ' .bc2v-score {display:flex;align-items:center;',
    'justify-content:flex-end;padding-right:9px;color:#f7f7f7;',
    'font-weight:850;font-size:22px;line-height:1;',
    'font-variant-numeric:tabular-nums;letter-spacing:-.4px;}',
    '.' + PREFIX + ' .bc2v-status {grid-column:3;grid-row:1/span 2;',
    'height:100%;border-left:1px solid #303234;',
    'display:flex;flex-flow:column;align-items:center;justify-content:center;',
    'padding-left:5px;text-align:center;font-size:11px;',
    'color:#98b868;font-weight:750;line-height:1.4;}',
    '.' + PREFIX + ' .bc2v-status[data-state="final"] {color:#a2a5a6;}',
    '.' + PREFIX + ' .bc2v-status[data-state="prematch"] {color:#b7a16c;}',
    '.' + PREFIX + ' .bc2v-match:active {background:#282929!important;}',
    '@media(max-width:380px){',
    '.' + PREFIX + ' .bc2v-match{grid-template-columns:minmax(0,1fr) 36px 56px;',
    'padding-left:9px;padding-right:6px;}',
    '.' + PREFIX + ' .bc2v-name{font-size:12px;}',
    '.' + PREFIX + ' .bc2v-score{font-size:20px;}',
    '.' + PREFIX + ' .bc2v-heading{padding-left:10px;}}'
  ].join('\n');

  function rootWithScores() {
    const queue = [document];
    while (queue.length) {
      const node = queue.shift();
      if (node instanceof ShadowRoot &&
        node.querySelector(MATCH + ' ' + SCORE)) return node;
      node.querySelectorAll?.('*').forEach(el => {
        if (el.shadowRoot) queue.push(el.shadowRoot);
      });
    }
    return null;
  }

  function sourceLinks(node) {
    return [...node.querySelectorAll(MATCH)].filter(a =>
      !a.closest('.' + PREFIX) &&
      a.querySelectorAll(SCORE).length === 2
    );
  }

  function slugName(slug) {
    return decodeURIComponent(slug || '')
      .replace(/--+/g, '-')
      .replace(/-/g, ' ')
      .replace(/\b[a-z]/g, c => c.toUpperCase());
  }

  function keyParts(link) {
    try {
      const p = new URL(link.href, location.href).pathname.split('/').filter(Boolean);
      const i = p.indexOf('soccer');
      if (i < 0 || p.length < i + 4) return null;
      const country = p[i+1];
      const league = p[i+2];
      return {
        key:country + '/' + league,
        country:slugName(country),
        title:slugName(league)
      };
    } catch (_) {return null;}
  }

  function textNodes(link) {
    const out = [];
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim().replace(/\s+/g,' ');
      if (!t || t.length > 100) continue;
      const el = n.parentElement;
      if (!el || el.closest('style,script')) continue;
      const r = el.getBoundingClientRect();
      out.push({text:t, x:r.left, y:r.top+r.height/2, w:r.width, h:r.height});
    }
    return out;
  }

  function isStatus(t) {
    return /^(?:live|prematch|ht|ft|started|ended|halftime|half.time|full.time|in progress|about to start|today|tomorrow|перерыв|завершен|завершён|сегодня|завтра|начался|ещё не начался|[12][- ]?(?:й|ый)?\s*тайм)$/i.test(t) ||
      /^\d{1,3}\s*[′'’]/.test(t) ||
      /^\d{1,2}:\d{2}$/.test(t) ||
      /^\d+(?:st|nd|rd|th)\s+half$/i.test(t);
  }

  function getStatus(nodes) {
    const matches = nodes.map(n=>n.text).filter(isStatus);
    const time = matches.find(t=>/^\d{1,3}\s*[′'’]/.test(t));
    const final = matches.find(t=>/^(?:ft|ended|full.time|заверш)/i.test(t));
    const half = matches.find(t=>/^(?:ht|half.time|перерыв)/i.test(t));
    const prematch = matches.find(t=>/^(?:today|tomorrow|сегодня|завтра|about)/i.test(t));
    if (final) return {text:final, state:'final'};
    if (half) return {text:half, state:'final'};
    if (time) return {text:time, state:'live'};
    if (prematch) return {text:prematch, state:'prematch'};
    return {text:matches[0] || 'LIVE', state:'live'};
  }

  function closestName(nodes, score, minX, used) {
    const s=score.getBoundingClientRect();
    const cy=s.top+s.height/2;
    return nodes.filter(n =>
      n.text.length >= 2 && !isStatus(n.text) &&
      !/^\d+(?:[.:]\d+)?$/.test(n.text) &&
      n.x >= minX && n.x < s.left-14 &&
      !used.has(n.text)
    ).sort((a,b)=>
      (Math.abs(a.y-cy)*3 - a.x*.02) -
      (Math.abs(b.y-cy)*3 - b.x*.02)
    )[0]?.text || '';
  }

  function getMatch(link) {
    const parsed=keyParts(link);
    if(!parsed) return null;
    const scoreEls=[...link.querySelectorAll(SCORE)];
    if(scoreEls.length!==2)return null;
    const nameCache=cachedMatchNames.get(link.href);
    const scores=scoreEls.map(el=>el.textContent.trim() || '–');
    const nodes=textNodes(link);
    const images=[...link.querySelectorAll('img')]
      .filter(img=>/competitors|\/images\/normal\//.test(img.src))
      .sort((a,b)=>a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    let names=nameCache?.names || null;
    let logos=nameCache?.logos || null;
    if(!names){
      const linkBox=link.getBoundingClientRect();
      const firstScore=scoreEls[0].getBoundingClientRect();
      const minX=images[0] ? images[0].getBoundingClientRect().right+2
        : linkBox.left + Math.min(80,Math.max(35,linkBox.width*.2));
      const used=new Set();
      const first=closestName(nodes,scoreEls[0],minX,used);
      if(first)used.add(first);
      const second=closestName(nodes,scoreEls[1],minX,used);
      names=[first,second];
      logos=images.slice(0,2).map(img=>img.currentSrc||img.src);
      if(names.every(Boolean))cachedMatchNames.set(link.href,{names,logos});
    }
    return {
      id:link.href,
      url:link.href,
      key:parsed.key,
      league:parsed.title,
      names,
      logos:logos||[],
      scores,
      status:getStatus(nodes)
    };
  }

  function commonAncestor(elements) {
    if(elements.length<2)return null;
    let node=elements[0].parentElement;
    while(node && !elements.every(el=>node.contains(el))){
      node=node.parentElement;
    }
    return node instanceof Element ? node : null;
  }

  function findHost(links) {
    const candidate=commonAncestor(links);
    if(!candidate || candidate===document.body ||
       candidate.matches('html,body') ||
       candidate.closest('.' + PREFIX))return null;
    const children=[...candidate.children].filter(el =>
      el.matches?.(MATCH) || el.querySelector?.(MATCH + ' ' + SCORE)
    );
    return children.length ? {node:candidate,children} : null;
  }

  function saveAndHide(el) {
    if(!nativeStyles.has(el)){
      nativeStyles.set(el,{
        value:el.style.getPropertyValue('display'),
        priority:el.style.getPropertyPriority('display')
      });
    }
    el.style.setProperty('display','none','important');
  }

  function restoreNative() {
    for(const [el,s] of nativeStyles){
      if(s.value)el.style.setProperty('display',s.value,s.priority);
      else el.style.removeProperty('display');
    }
    nativeStyles.clear();
  }

  function element(tag,cls,text) {
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(text!==undefined)el.textContent=String(text);
    return el;
  }

  function buildView(matches) {
    const groups=new Map();
    for(const m of matches){
      if(!groups.has(m.key))groups.set(m.key,{title:m.league,matches:[]});
      groups.get(m.key).matches.push(m);
    }
    const frag=document.createDocumentFragment();
    for(const group of groups.values()){
      const box=element('section','bc2v-group');
      const header=element('div','bc2v-heading');
      header.append(
        element('span','bc2v-league',group.title),
        element('span','bc2v-count',group.matches.length)
      );
      box.appendChild(header);
      for(const m of group.matches){
        const a=element('a','bc2v-match');
        a.href=m.url;
        for(let i=0;i<2;i++){
          const team=element('div','bc2v-team');
          if(m.logos[i]){
            const img=element('img','bc2v-logo');
            img.src=m.logos[i];
            img.alt='';
            img.loading='lazy';
            team.appendChild(img);
          }else{
            team.appendChild(element('span','bc2v-fallback','⚽'));
          }
          team.appendChild(element('span','bc2v-name',m.names[i]));
          a.appendChild(team);
          a.appendChild(element('span','bc2v-score',m.scores[i]));
        }
        const status=element('div','bc2v-status',m.status.text);
        status.dataset.state=m.status.state;
        a.appendChild(status);
        box.appendChild(a);
      }
      frag.appendChild(box);
    }
    return {frag,leagueCount:groups.size};
  }

  function sync() {
    if(!running || !livePage()){
      if(host)cleanup();
      lastError='Not on live page';
      return;
    }
    if(!root?.host?.isConnected){
      cleanup();
      root=rootWithScores();
      if(!root){lastError='Waiting for sports Shadow DOM';return;}
    }
    let links=sourceLinks(root);
    if(links.length<2){lastError='Waiting for score rows';return;}
    const placement=findHost(links);
    if(!placement){lastError='Feed container not identified; site unchanged';return;}

    // Read native links before hiding them. Existing hidden matches use
    // cached names; live scores continue to update from textContent.
    const matches=links.map(getMatch).filter(Boolean);
    const valid=matches.filter(m=>m.names.every(Boolean));
    verifiedNames=valid.length;
    if(matches.length<2 || valid.length/matches.length < .9){
      lastError='Team labels not verified ('+valid.length+'/'+matches.length+'); site unchanged';
      return;
    }

    if(host!==placement.node || !view?.isConnected){
      cleanup();
      host=placement.node;
      stylesheet=document.createElement('style');
      stylesheet.id=PREFIX+'-style';
      stylesheet.textContent=rules;
      root.appendChild(stylesheet);
      view=element('div',PREFIX);
      const first=placement.children[0];
      host.insertBefore(view,first);
      lastSignature='';
    }
    const signature=JSON.stringify(matches.map(m=>[
      m.id,m.names,m.scores,m.status.text,m.league
    ]));
    if(signature!==lastSignature){
      const result=buildView(matches);
      view.replaceChildren(result.frag);
      renderedMatches=matches.length;
      renderedLeagues=result.leagueCount;
      lastSignature=signature;
    }
    for(const child of placement.children){
      if(child!==view && !child.contains(view))saveAndHide(child);
    }
    for(const native of nativeStyles.keys()){
      if(!native.isConnected)nativeStyles.delete(native);
    }
    lastError='';
  }

  function cleanup() {
    restoreNative();
    view?.remove();
    stylesheet?.remove();
    view=null;
    stylesheet=null;
    host=null;
    lastSignature='';
    renderedMatches=0;
    renderedLeagues=0;
  }

  function status() {
    return {
      version:VERSION,
      running,
      pageMatches:livePage(),
      shadowRootReady:!!root,
      layoutActive:!!view?.isConnected,
      leagues:renderedLeagues,
      matches:renderedMatches,
      validatedTeamNames:verifiedNames,
      nativeContainersHidden:[...nativeStyles.keys()]
        .filter(el=>el.isConnected && getComputedStyle(el).display==='none').length,
      previousLayoutRestorable:true,
      message:lastError || 'Live List active'
    };
  }

  function restore() {
    running=false;
    clearInterval(interval);
    cleanup();
    if(window[KEY]===api)delete window[KEY];
    if(window.bcLiveCardRefinement===api)delete window.bcLiveCardRefinement;
    return 'BC.GAME Live List v2 disabled; original feed restored';
  }

  const api={status,restore};
  window[KEY]=api;
  window.bcLiveCardRefinement=api;
  const interval=setInterval(sync,2200);
  sync();
  console.info('[BC.GAME Live List v2]',status());
})();
