// ==UserScript==
// @name         BC.GAME Match Cards — Shadow DOM v0.1.4
// @namespace    https://github.com/blatokomitet/bcgame-design
// @version      0.1.4
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
[data-editor-id="eventCard"].bc-m-v014 {background:#1b2023!important;border:1px solid #2b3437!important;border-radius:22px!important;overflow:hidden!important;margin-bottom:14px!important;box-shadow:0 7px 20px #0002!important}
[data-editor-id="eventCard"].bc-m-v014 > :not(.bc-m-shell) {display:none!important}
.bc-m-shell{display:block!important;color:#f1f3f3!important;text-decoration:none!important;padding:18px 14px 16px!important;min-height:147px!important;box-sizing:border-box!important}
.bc-m-header{display:flex!important;align-items:center!important;gap:12px!important;margin-bottom:18px!important;min-width:0!important}
.bc-m-league-icon{flex:0 0 38px!important;width:38px!important;height:38px!important;display:grid!important;place-items:center!important}
.bc-m-league-icon img,.bc-m-league-icon svg{width:34px!important;height:34px!important;object-fit:contain!important}
.bc-m-labels{min-width:0!important;flex:1!important}
.bc-m-league{font-size:15px!important;font-weight:700!important;line-height:1.3!important;color:#f3f5f5!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.bc-m-country{font-size:12px!important;color:#98a4a7!important;margin-top:4px!important}
.bc-m-body{display:grid!important;grid-template-columns:46px minmax(0,1fr) 25px 36px!important;gap:8px!important;align-items:center!important}
.bc-m-time{display:flex!important;flex-direction:column!important;align-items:center!important;gap:15px!important}
.bc-m-minute{font-size:12px!important;font-weight:600!important;color:#ff606d!important;white-space:nowrap!important}
.bc-m-minute.live::before{content:"";display:inline-block;width:5px;height:5px;border-radius:50%;background:#ff5966;margin-right:5px;vertical-align:2px;animation:bc-m-pulse 1.9s infinite}
.bc-m-phase{font-size:10px!important;line-height:1.1!important;text-align:center!important;color:#97a3a7!important}
.bc-m-teams{display:flex!important;flex-direction:column!important;gap:13px!important;min-width:0!important}
.bc-m-team{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important;min-height:28px!important}
.bc-m-team-logo{width:26px!important;height:26px!important;flex:0 0 26px!important;display:grid!important;place-items:center!important;overflow:hidden!important}
.bc-m-team-logo img,.bc-m-team-logo svg{width:25px!important;height:25px!important;object-fit:contain!important}
.bc-m-name{font-size:14px!important;font-weight:600!important;line-height:1.25!important;color:#edf0f1!important;min-width:0!important;overflow-wrap:anywhere!important}
.bc-m-scores{display:flex!important;flex-direction:column!important;align-items:center!important;gap:13px!important}
.bc-m-score{font-size:20px!important;font-weight:800!important;line-height:28px!important;color:#fc5966!important;text-align:center!important}
.bc-m-bell{width:32px!important;height:32px!important;border:1px solid #435054!important;border-radius:50%!important;display:grid!important;place-items:center!important;pointer-events:none!important}
.bc-m-bell svg{width:17px!important;height:17px!important;fill:none!important;stroke:#a1acaf!important;stroke-width:1.7!important}
@keyframes bc-m-pulse{50%{opacity:.2;transform:scale(.65)}}
@media(prefers-reduced-motion:reduce){.bc-m-minute.live::before{animation:none!important}}
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
    const texts=directLeaves(cat).map(e=>norm(e.textContent)).filter(Boolean);
    const icon=cat.querySelector('img,svg');
    const country=texts[0]||'';
    const league=texts.slice(1).find(s=>s!==country)||texts[0]||'';
    return {country,league,icon:icon?.outerHTML||''};
  }
  function getStatus(link){
    const n=link.querySelector('[data-editor-id="eventCardStatusLabel"]');
    const value=norm(n?.textContent);
    const m=value.match(/^(\d{1,3}[′']|\d{1,2}:\d{2}|HT|FT)(.*)$/i);
    return {minute:m?m[1]:value,phase:m?norm(m[2]):'',live:/\d[′']/.test(value)};
  }
  function update(card) {
    const link=card.querySelector('a[data-editor-id="eventCardContent"]');
    const league=getLeague(card),teams=link&&getTeams(link),scores=link&&getScores(link);
    if(!link||!league||teams.length!==2||teams.some(t=>!t.name)||!scores)return false;
    const status=getStatus(link);
    const href=link.getAttribute('href');
    if(!href||href==='#')return false;
    const signature=JSON.stringify({href,league,teams,scores,status});
    if(card.dataset.bcMatchV014Signature===signature)return true;
    let shell=[...card.children].find(c=>c.classList?.contains('bc-m-shell'));
    if(!shell){shell=document.createElement('a');shell.className='bc-m-shell';card.appendChild(shell);}
    shell.setAttribute('href',href);
    shell.innerHTML='<div class="bc-m-header"><span class="bc-m-league-icon">'+league.icon+'</span><span class="bc-m-labels"><div class="bc-m-league">'+esc(league.league)+'</div><div class="bc-m-country">'+esc(league.country)+'</div></span></div>'+
    '<div class="bc-m-body"><div class="bc-m-time"><span class="bc-m-minute '+(status.live?'live':'')+'">'+esc(status.minute)+'</span><span class="bc-m-phase">'+esc(status.phase)+'</span></div>'+
    '<div class="bc-m-teams">'+teams.map(t=>'<div class="bc-m-team"><span class="bc-m-team-logo">'+t.logo+'</span><span class="bc-m-name">'+esc(t.name)+'</span></div>').join('')+'</div>'+
    '<div class="bc-m-scores">'+scores.map(s=>'<span class="bc-m-score">'+esc(s)+'</span>').join('')+'</div><span class="bc-m-bell">'+bell+'</span></div>';
    card.classList.add('bc-m-v014');card.dataset.bcMatchV014Signature=signature;owned.add(card);
    return true;
  }
  function refresh(){
    if(stopped)return {status:'disabled'};
    let found=0,rendered=0;
    for(const root of roots()){
      const cards=root.querySelectorAll('[data-editor-id="eventCard"]');
      if(!cards.length)continue;
      if(!root.querySelector('#'+STYLE_ID)){
        const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;
        (root===document?(document.head||document.documentElement):root).appendChild(style);styles.add(style);
      }
      cards.forEach(card=>{found++;try{if(update(card))rendered++;}catch(e){console.warn('[BC Match v0.1.4] skip card',e);}});
    }
    return {status:'active',version:'0.1.4',found,rendered};
  }
  function disable(){
    stopped=true;clearInterval(timer);
    for(const card of owned){card.classList.remove('bc-m-v014');delete card.dataset.bcMatchV014Signature;[...card.children].filter(e=>e.classList?.contains('bc-m-shell')).forEach(e=>e.remove());}
    owned.clear();for(const s of styles)s.remove();styles.clear();
    delete window[KEY];return {status:'disabled'};
  }
  const api={refresh,audit:refresh,disable};window[KEY]=api;
  timer=setInterval(refresh,2000);
  console.info('[BC.GAME Match Cards v0.1.4]',refresh());
})();
