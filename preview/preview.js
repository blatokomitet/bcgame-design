(() => {
  const doc = document, feedback = doc.getElementById('feedback'), host = doc.getElementById('match-host');
  let fixture = window.BCFixtures.mount(doc, host);
  const api = () => window.__bcMatchCardsV014;
  function announce(message) { feedback.textContent = message; }
  function reset() {
    // Keep the same root/list so cleanup of existing generated nodes is exercised.
    for (const card of fixture.list.querySelectorAll('[data-editor-id="eventCard"]')) card.remove();
    fixture.list.append(window.BCFixtures.card(doc), window.BCFixtures.card(doc, { id: 'beta', teams: ['Eastport Athletic', 'Westhaven City'], scores: ['2', '2'], time: '72′' }));
    doc.getElementById('empty-message').hidden = true; api()?.refresh();
  }
  doc.querySelector('.scenario-buttons').addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
    const original = fixture.list.querySelector('[data-editor-id="eventCard"]');
    if (action === 'goal') {
      const score = original?.querySelector('.sc-7l8my2-0 span');
      if (!score || !/^\d+$/.test(score.textContent)) { announce('Сначала сбросьте сценарий к LIVE-матчам.'); return; }
      score.textContent = String(Number(score.textContent) + 1); announce('Счёт изменён в исходной карточке.');
    } else if (action === 'empty') {
      for (const card of fixture.list.querySelectorAll('[data-editor-id="eventCard"]')) card.remove();
      doc.getElementById('empty-message').hidden = false; announce('Источник пуст: старая лента должна исчезнуть.');
    } else if (action === 'invalid') {
      original?.querySelector('.jss39')?.remove(); announce('Неподдерживаемая карточка возвращена к исходному виду.');
    } else if (action === 'prematch') {
      reset(); const first = fixture.list.querySelector('[data-editor-id="eventCard"]');
      first.querySelector('[data-editor-id="eventCardStatusLabel"]').textContent = 'Завтра 20:45';
      first.querySelector('.sc-7l8my2-0').replaceChildren(); announce('Прематч: время начала и прочерки вместо счёта.');
    } else if (action === 'remount') {
      const next = doc.createElement('div'); host.shadowRoot.append(next);
      const old = fixture.list; next.id = 'fixture-list';
      next.append(window.BCFixtures.card(doc, { id: 'new', league: 'Новый раздел' }));
      old.remove(); fixture.list = next; announce('Контейнер матчей заменён без перезагрузки.');
    } else { reset(); announce('Исходный сценарий восстановлен.'); }
    api()?.refresh();
  });
  doc.getElementById('design').addEventListener('change', async event => {
    const input = event.target;
    if (!input.checked) { api()?.disable(); announce('Исходные карточки показаны.'); return; }
    input.disabled = true;
    const script = doc.createElement('script'); script.src = '../bcgame-match-cards-v014.user.js';
    script.onload = () => { input.disabled = false; script.remove(); announce('Новый дизайн включён.'); };
    script.onerror = () => { input.checked = false; input.disabled = false; script.remove(); announce('Не удалось загрузить оформление.'); };
    doc.body.append(script);
  });
  host.addEventListener('click', event => {
    const link = event.composedPath().find(node => node.tagName === 'A');
    if (link) { event.preventDefault(); announce('Это демонстрационный матч. Переход на BC.GAME не выполняется.'); }
  });
  doc.querySelectorAll('.account button,.tabbar button,.brand-box a').forEach(button => button.addEventListener('click', event => {
    event.preventDefault(); announce('Демонстрационная кнопка: ' + (button.getAttribute('aria-label') || button.textContent.trim()));
  }));
  const width = () => { doc.getElementById('screen-width').textContent = window.innerWidth + ' px'; };
  width(); window.addEventListener('resize', width);
  // The development server provides this endpoint. Static hosting does not need it.
  if (doc.querySelector('meta[name="bc-dev-server"]')) {
    const events = new EventSource('/__reload'); events.onmessage = () => location.reload();
  }
})();
