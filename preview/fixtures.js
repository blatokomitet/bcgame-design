/* Explicit synthetic DOM contract, never scraped account data. Shared by preview and regression tests. */
(() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function card(doc, { id = 'alpha', teams = ['Northbridge FC', 'Riverside United'], scores = ['1', '0'], time = '45+2′', country = 'Демо-лига', league = 'Вечерний турнир', sport = 'soccer' } = {}) {
    const box = doc.createElement('article'); box.dataset.editorId = 'eventCard'; box.dataset.fixture = id;
    box.innerHTML = `<div data-editor-id="eventCardCategory"><span>${esc(country)}</span><span>${esc(league)}</span></div>
      <a data-editor-id="eventCardContent" href="/ru/sports/${esc(sport)}/demo-${esc(id)}">
      <span data-editor-id="eventCardStatusLabel">${esc(time)}</span>
      <div class="sc-1gh6pgx-0"><div class="sc-1gh6pgx-1">${teams.map(name => `<div class="sc-1gh6pgx-2"><span class="jss39">${esc(name)}</span></div>`).join('')}</div>
      <div class="sc-7l8my2-0">${scores ? scores.map(score => `<span class="sc-1oeg2ad-1">${esc(score)}</span>`).join('') : ''}</div></div></a>`;
    return box;
  }
  function mount(doc, host) {
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = `:host{display:block}*{box-sizing:border-box}article{background:#2b3035;border:1px solid #46504d;border-radius:12px;margin:12px 0;padding:14px;font:14px system-ui;color:#eff4f0}article [data-editor-id="eventCardCategory"]{display:flex;gap:8px;color:#a9b9b1;font-size:12px;margin-bottom:12px}article a{display:block;color:inherit;text-decoration:none}article .sc-1gh6pgx-0{display:flex;justify-content:space-between;margin-top:12px}article .sc-1gh6pgx-1,article .sc-7l8my2-0{display:grid;gap:9px}a:focus-visible{outline:2px solid #b5f5d2}`;
    const list = doc.createElement('div'); list.id = 'fixture-list'; root.append(style, list);
    list.append(card(doc), card(doc, { id: 'beta', teams: ['Eastport Athletic', 'Westhaven City'], scores: ['2', '2'], time: '72′' }));
    return { root, list };
  }
  window.BCFixtures = { card, mount };
})();
