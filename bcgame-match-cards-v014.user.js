// ==UserScript==
// @name         BC.GAME Match Cards — Shadow DOM v2.2
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      2.2.0
// @description  Beta: match cards using original BC.GAME data, logos, links and live scores. No popups.
// @match        https://bcgame.st/*
// @match        https://*.bcgame.st/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  if (window.__bcMatchCardsV014) return;
  const KEY = '__bcMatchCardsV014';
  const STYLE_ID = 'bc-match-v014-css';
  const owned = new Set();
  const styles = new Set();
  let stopped = false;
  let timer;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s ?? '').replace(/\s+/g,' ').trim();
  const leafText = node => [...node.querySelectorAll('*')].filter(e => !e.children.length && norm(e.textContent)).map(e=>norm(e.textContent));
  const roots = () => {
    const out = [document];
    for (let i=0;i<out.length;i++) {
      for (const n of out[i].querySelectorAll('*')) if(n.shadowRoot && !out.includes(n.shadowRoot))out.push(n.shadowRoot);
    }
    return out;
  };
  const css = `
[data-editor-id="eventCard"].bc-m-v014{display:none!important}
.bc2-feed{display:flex!important;flex-direction:column!important;gap:12px!important;margin:12px 0 20px!important;width:100%!important;box-sizing:border-box!important}
.bc2-group{border-radius:22px!important;background:#1b2023!important;border:1px solid #2c3537!important;overflow:hidden!important;color:#f3f5f5!important}
.bc2-head{display:flex!important;gap:12px!important;align-items:center!important;padding:17px 15px 12px!important}
.bc2-logo{width:38px!important;height:38px!important;flex:0 0 38px!important;display:grid!important;place-items:center!important}
.bc2-logo img,.bc2-logo svg{width:36px!important;height:36px!important;object-fit:contain!important}
.bc2-title{font-size:16px!important;font-weight:700!important;line-height:1.3!important;color:#fff!important}
.bc2-country{font-size:12px!important;color:#9ca7a9!important;margin-top:4px!important}
.bc2-event{display:grid!important;grid-template-columns:53px minmax(0,1fr) 25px 35px!important;gap:8px!important;align-items:center!important;padding:12px 13px 13px!important;box-sizing:border-box!important;text-decoration:none!important;color:inherit!important}
.bc2-event+.bc2-event{border-top:1px solid #343c3e!important}
.bc2-time,.bc2-teams,.bc2-scores{display:flex!important;flex-direction:column!important;justify-content:center!important;gap:13px!important;min-width:0!important}
.bc2-minute{font-size:14px!important;font-weight:700!important;color:#ff5966!important;white-space:nowrap!important}
.bc2-minute.live:before{content:''!important;width:6px!important;height:6px!important;margin:0 5px 2px 0!important;display:inline-block!important;border-radius:50%!important;background:#ff5966!important;animation:bc2pulse 1.7s infinite!important}
.bc2-period{color:#9eaaac!important;font-size:11px!important;line-height:1.2!important}
.bc2-team{display:flex!important;gap:8px!important;align-items:center!important;min-height:28px!important;min-width:0!important}
.bc2-teamlogo{display:grid!important;place-items:center!important;flex:0 0 26px!important;width:26px!important;height:26px!important}
.bc2-teamlogo img,.bc2-teamlogo svg{width:26px!important;height:26px!important;object-fit:contain!important}
.bc2-name{font-size:14px!important;font-weight:600!important;line-height:1.3!important;color:#f0f3f3!important;overflow-wrap:anywhere!important}
.bc2-scores{align-items:center!important}
.bc2-score{font-size:21px!important;line-height:28px!important;color:#fc5966!important;font-weight:800!important}
.bc2-bell{width:32px!important;height:32px!important;border:1px solid #425154!important;border-radius:50%!important;display:grid!important;place-items:center!important;pointer-events:none!important}
.bc2-bell svg{width:18px!important;height:18px!important;stroke:#a5b0b2!important;fill:none!important;stroke-width:1.7!important}

/* Compact layout: counter inherited BC.GAME styles from the original card system */
.bc2-feed .bc2-group{height:auto!important;min-height:0!important;max-height:none!important;padding:0!important;display:block!important}
.bc2-feed .bc2-head{height:auto!important;min-height:0!important;max-height:none!important;margin:0!important;padding:12px 14px 9px!important;display:flex!important;align-items:center!important}
.bc2-feed .bc2-logo{height:33px!important;width:33px!important;flex:0 0 33px!important}
.bc2-feed .bc2-logo img,.bc2-feed .bc2-logo svg{height:30px!important;width:30px!important}
.bc2-feed .bc2-event{height:auto!important;min-height:80px!important;max-height:none!important;margin:0!important;padding:8px 12px 12px!important;display:grid!important;grid-template-columns:48px minmax(0,1fr) 27px 34px!important;gap:8px!important;align-items:center!important;line-height:normal!important}
.bc2-feed .bc2-time,.bc2-feed .bc2-teams,.bc2-feed .bc2-scores{height:auto!important;min-height:0!important;margin:0!important;padding:0!important;gap:8px!important}
.bc2-feed .bc2-team{height:auto!important;min-height:28px!important;max-height:none!important;margin:0!important;padding:0!important;gap:8px!important}
.bc2-feed .bc2-name{font-size:15px!important;line-height:1.25!important}
.bc2-feed .bc2-score{font-size:23px!important;line-height:28px!important}
.bc2-feed .bc2-minute{font-size:13px!important}
.bc2-feed .bc2-period{font-size:11px!important}
.bc2-feed .bc2-bell{height:32px!important;width:32px!important}

/* Explicit compact sizing overrides leaked site selectors. */
.bc2-feed .bc2-group{display:block!important;height:auto!important;min-height:0!important}
.bc2-feed .bc2-head{box-sizing:border-box!important;height:62px!important;min-height:62px!important;max-height:62px!important;flex:0 0 62px!important;padding:10px 13px!important;margin:0!important}
.bc2-feed .bc2-event{box-sizing:border-box!important;display:grid!important;height:100px!important;min-height:100px!important;max-height:100px!important;grid-template-columns:51px minmax(0,1fr) 29px 34px!important;grid-template-rows:1fr!important;align-items:center!important;align-content:center!important;padding:8px 12px 11px!important;margin:0!important}
.bc2-feed .bc2-time,.bc2-feed .bc2-teams,.bc2-feed .bc2-scores{height:auto!important;min-height:0!important;max-height:none!important;gap:8px!important;align-self:center!important;justify-content:center!important}
.bc2-feed .bc2-team{min-height:29px!important;height:auto!important;max-height:none!important}
.bc2-feed .bc2-name{font-size:15px!important;line-height:1.23!important}
.bc2-feed .bc2-score{font-size:23px!important;line-height:29px!important}
.bc2-feed .bc2-bell{align-self:center!important;justify-self:center!important}
@media(max-width:365px){.bc2-feed .bc2-event{grid-template-columns:44px minmax(0,1fr) 24px 30px!important;gap:6px!important;padding-inline:9px!important}.bc2-feed .bc2-name{font-size:13px!important}}
@keyframes bc2pulse{50%{opacity:.3;transform:scale(.75)}}@media(prefers-reduced-motion:reduce){.bc2-minute.live:before{animation:none!important}}
`;
  const bell = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 6-3 7-3 9h18c0-2-3-3-3-9M10 21h4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function directLeaves(node) {
    return [...node.querySelectorAll('*')].filter(e => e.childElementCount===0 && norm(e.textContent));
  }
  function getTeams(link){
    const group=link.querySelector('[class*="sc-1gh6pgx-1"]');
    if(!group)return [];
    return [...group.children].filter(e=>e.matches('[class*="sc-1gh6pgx-2"]')).slice(0,2).map(row=>{
      const nameNode=row.querySelector('.jss39')||row.querySelector('[class*="sc-1gh6pgx-3"] .jss39')||directLeaves(row).find(e=>!/^\d+$/.test(norm(e.textContent)));
      const logo=row.querySelector('img,[data-editor-id="fallbackCompetitorIcon"]');
      return {name:norm(nameNode?.textContent),logo:logo?.outerHTML||''};
    });
  }
  function getScores(link){
    const area=link.querySelector('[class*="sc-1gh6pgx-0"]');
    if(!area)return null;
    // Ignore team labels: score nodes are numeric leaves outside the team-name column.
    const nums=directLeaves(area).filter(e=>/^\d{1,2}$/.test(norm(e.textContent)) && !e.closest('[class*="sc-1gh6pgx-1"]')).map(e=>norm(e.textContent));
    return nums.length>=2 ? nums.slice(0,2) : null;
  }
  function getLeague(card){
    const cat=card.querySelector('[data-editor-id="eventCardCategory"]');
    if(!cat)return null;
    const texts=[...new Set([...(function(){const arr=[];const walker=document.createTreeWalker(cat,NodeFilter.SHOW_TEXT);let t;while(t=walker.nextNode()){const v=norm(t.nodeValue);if(v)arr.push(v);}return arr;})()])].filter(Boolean);
    const icon=cat.querySelector('img,svg');
    const country=texts.length>1?texts[0]:'';
    const league=texts.slice(1).find(s=>s!==country)||(texts.length===1?texts[0]:'');
    return {country,league,icon:icon?.outerHTML||''};
  }
  function getStatus(link){
    const n=link.querySelector('[data-editor-id="eventCardStatusLabel"]');
    const value=norm(n?.textContent);
    const m=value.match(/^(\d{1,3}[′']|\d{1,2}:\d{2}|HT|FT)(.*)$/i);
    return {minute:m?m[1]:value,phase:m?norm(m[2]):'',live:/\d[′']/.test(value)};
  }
  const feeds=new Map();
  const seen=new Set();
  let failures=0;
  function categoryText(node){
    if(!node)return [];
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),items=[];let t;
    while((t=walker.nextNode())){const value=norm(t.nodeValue);if(value)items.push(value)}
    return items;
  }
  function extract(card){
    const link=card.querySelector('a[data-editor-id="eventCardContent"][href]');
    const category=card.querySelector('[data-editor-id="eventCardCategory"]');
    if(!link||!category)return null;
    const teams=getTeams(link),scores=getScores(link);
    if(teams.length!==2||teams.some(t=>!t.name)||!scores)return null;
    const parts=categoryText(category),country=parts.length>1?parts[0]:'';
    const league=parts.length>1?parts.slice(1).join(' · '):(parts[0]||'Матч');
    const icon=category.querySelector('img,svg');
    const status=getStatus(link);
    const href=link.getAttribute('href');
    if(!href||href==='#')return null;
    return {href,teams,scores,status,country,league,icon:icon?.outerHTML||''};
  }
  function getHost(cards){
    let n=cards[0].parentElement;
    for(let i=0;i<8&&n;i++,n=n.parentElement){
      if(n.querySelectorAll('[data-editor-id="eventCard"]').length>=2 && n.parentElement)return n;
    }
    return cards[0].parentElement;
  }
  function paintEvent(d){
    const a=document.createElement('a');a.className='bc2-event';a.href=d.href;
    a.innerHTML='<div class="bc2-time"><div class="bc2-minute '+(d.status.live?'live':'')+'">'+esc(d.status.minute)+'</div><div class="bc2-period">'+esc(d.status.phase)+'</div></div>'+
    '<div class="bc2-teams">'+d.teams.map(t=>'<div class="bc2-team"><div class="bc2-teamlogo">'+t.logo+'</div><div class="bc2-name">'+esc(t.name)+'</div></div>').join('')+'</div>'+
    '<div class="bc2-scores">'+d.scores.map(x=>'<div class="bc2-score">'+esc(x)+'</div>').join('')+'</div><div class="bc2-bell">'+bell+'</div>';
    return a;
  }
  function refresh(){
    if(stopped)return {status:'disabled'};
    let events=0,groups=0;
    for(const root of roots()){
      const cards=[...root.querySelectorAll('[data-editor-id="eventCard"]')].filter(c=>!c.closest('.bc2-feed'));
      if(!cards.length)continue;
      const matched=cards.map(c=>({card:c,data:extract(c)})).filter(x=>x.data);
      if(!matched.length)continue;
      const host=getHost(cards),mount=host?.parentElement;
      if(!mount)continue;
      const signature=JSON.stringify(matched.map(x=>x.data));
      const old=feeds.get(root);
      if(old?.signature===signature && old.el.isConnected)continue;
      if(!root.querySelector('#'+STYLE_ID)){
        const st=document.createElement('style');st.id=STYLE_ID;st.textContent=css;
        (root===document?(document.head||document.documentElement):root).appendChild(st);styles.add(st);
      }
      const feed=document.createElement('div');feed.className='bc2-feed';
      const byLeague=new Map();
      for(const {data:d} of matched){
        const key=d.country+'|'+d.league;
        let group=byLeague.get(key);
        if(!group){
          group=document.createElement('section');group.className='bc2-group';
          group.innerHTML='<div class="bc2-head"><div class="bc2-logo">'+d.icon+'</div><div><div class="bc2-title">'+esc(d.league)+'</div><div class="bc2-country">'+esc(d.country)+'</div></div></div>';
          byLeague.set(key,group);feed.appendChild(group);
        }
        group.appendChild(paintEvent(d));
      }
      try{mount.insertBefore(feed,host)}catch(e){failures++;continue;}
      old?.el.remove();
      feeds.set(root,{el:feed,signature});
      for(const {card} of matched){card.classList.add('bc-m-v014');seen.add(card);}
      events+=matched.length;groups+=byLeague.size;
    }
    return {status:'active',version:'2.2.0',events,groups,feeds:feeds.size,failures};
  }
  function disable(){
    stopped=true;clearInterval(timer);
    for(const {el} of feeds.values())el.remove();feeds.clear();
    for(const card of seen)card.classList.remove('bc-m-v014');seen.clear();
    for(const st of styles)st.remove();styles.clear();
    delete window[KEY];return {status:'disabled'};
  }
  const api={refresh,audit:()=>({version:'2.2.0',...refresh(),visibleEvents:[...feeds.values()].reduce((n,v)=>n+v.el.querySelectorAll('.bc2-event').length,0),visibleGroups:[...feeds.values()].reduce((n,v)=>n+v.el.querySelectorAll('.bc2-group').length,0)}),disable};window[KEY]=api;
  timer=setInterval(refresh,1800);
  console.info('[BC.GAME Match Cards v2.1]',refresh());
})();
