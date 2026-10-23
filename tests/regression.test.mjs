import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [cards, fixtures, header, calm, chrome, v28, v29] = await Promise.all([
  'bcgame-match-cards-v014.user.js', 'preview/fixtures.js', 'bcgame.user.js',
  'bcgame-calm-dark.user.js', 'BCGAME_Chrome_Design_v1.9.user.js',
  'experiments/sofascore-v2.8.user.js', 'experiments/sofascore-v2.9.user.js'
].map(read));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function setup(t) {
  const w = new Window({ url: 'https://bcgame.st/ru/sports/live', width: 390, height: 844,
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true } });
  t.after(async () => { w.__bcMatchCardsV014?.disable(); w.__bcMinimalHeaderV21?.restore(); w.__bcCalmDarkFourColorsV100?.restore(); w.bcChromeV19CheckpointDestroy?.(); await w.happyDOM.close(); });
  w.eval(fixtures); const host = w.document.createElement('div'); w.document.body.append(host);
  const fixture = w.BCFixtures.mount(w.document, host);
  w.eval(cards);
  return { w, host, ...fixture, api: w.__bcMatchCardsV014 };
}
test('empty source removes stale feed and releases hidden originals', t => {
  const { list, root, api } = setup(t);
  const originals = [...list.querySelectorAll('[data-editor-id="eventCard"]')];
  assert.equal(root.querySelectorAll('.bc2-event').length, 2);
  originals.forEach(card => card.remove()); api.refresh();
  assert.equal(root.querySelectorAll('.bc2-feed').length, 0);
  assert.equal(api.audit().feeds, 0);
  originals.forEach(card => assert.equal(card.classList.contains('bc-m-v014'), false));
});
test('invalid source restores only the unsupported original', t => {
  const { list, root, api } = setup(t);
  const first = list.querySelector('[data-editor-id="eventCard"]');
  first.querySelector('.jss39').remove(); api.refresh();
  assert.equal(first.classList.contains('bc-m-v014'), false);
  assert.equal(root.querySelectorAll('.bc2-event').length, 1);
  list.querySelectorAll('.jss39').forEach(node => node.remove()); api.refresh();
  assert.equal(root.querySelectorAll('.bc2-feed').length, 0);
});
test('live update retains event identity and keyboard focus', t => {
  const { list, root, api } = setup(t);
  const event = root.querySelector('.bc2-event'); event.focus();
  const second = root.querySelectorAll('.bc2-event')[1];
  list.querySelector('.sc-7l8my2-0 span').textContent = '2'; api.refresh();
  assert.equal(root.querySelector('.bc2-event'), event);
  assert.equal(root.querySelectorAll('.bc2-event')[1], second);
  assert.equal(root.activeElement, event);
  assert.equal(event.querySelector('.bc2-score').textContent, '2');
});
test('observer updates a score without explicit refresh', async t => {
  const { list, root } = setup(t);
  list.querySelector('.sc-7l8my2-0 span').textContent = '3';
  await pause(220);
  assert.equal(root.querySelector('.bc2-score').textContent, '3');
});
test('prematch supports missing scores without pretending they are zero', t => {
  const { list, root, api } = setup(t);
  const first = list.querySelector('[data-editor-id="eventCard"]');
  first.querySelector('[data-editor-id="eventCardStatusLabel"]').textContent = 'Завтра 20:45';
  first.querySelector('.sc-7l8my2-0').replaceChildren(); api.refresh();
  assert.equal(root.querySelector('.bc2-minute').textContent, 'Завтра 20:45');
  assert.equal(root.querySelector('.bc2-score').textContent, '—');
});
test('extra score columns fail safely and original is restored', t => {
  const { w, list, api } = setup(t);
  const first = list.querySelector('[data-editor-id="eventCard"]');
  first.querySelector('.sc-7l8my2-0').append(w.document.createElement('span'));
  first.querySelector('.sc-7l8my2-0').lastChild.textContent = '9'; api.refresh();
  assert.equal(first.classList.contains('bc-m-v014'), false);
});
test('other sports and unsafe match URLs remain untouched', t => {
  const { list, root, api } = setup(t);
  const links = list.querySelectorAll('a[data-editor-id="eventCardContent"]');
  links[0].href = '/ru/sports/basketball/test'; links[1].href = 'javascript:alert(1)'; api.refresh();
  assert.equal(root.querySelectorAll('.bc2-feed').length, 0);
  assert.equal(list.querySelectorAll('.bc-m-v014').length, 0);
});
test('names are text and unsafe logos never become executable markup', t => {
  const { w, list, root, api } = setup(t);
  const row = list.querySelector('.sc-1gh6pgx-2');
  row.querySelector('.jss39').textContent = '<img src=x onerror=alert(1)>';
  const img = w.document.createElement('img'); img.setAttribute('src', 'javascript:alert(1)'); img.setAttribute('onerror', 'alert(1)'); row.append(img);
  api.refresh();
  const feed = root.querySelector('.bc2-feed');
  assert.equal(feed.querySelector('.bc2-name').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(feed.querySelectorAll('img,[onerror],script').length, 0);
});
test('separate source containers stay separate and removed roots are released', t => {
  const { w, host, list, root, api } = setup(t);
  const other = w.document.createElement('div'); root.append(other);
  other.append(w.BCFixtures.card(w.document, { id: 'third' })); api.refresh();
  assert.equal(list.querySelectorAll('.bc2-event').length, 2);
  assert.equal(other.querySelectorAll('.bc2-event').length, 1);
  host.remove(); api.refresh(); assert.equal(api.audit().feeds, 0); assert.equal(api.audit().roots, 1);
});
test('nested shadow roots are supported', t => {
  const { w, root, api } = setup(t);
  const nested = w.document.createElement('section'); root.append(nested);
  const next = w.BCFixtures.mount(w.document, nested); api.refresh();
  assert.equal(next.root.querySelectorAll('.bc2-event').length, 2);
});
test('disable restores all originals and supports clean re-enable', t => {
  const { w, root, api } = setup(t);
  api.disable(); assert.equal(root.querySelectorAll('.bc2-feed,.bc-m-v014,[data-bc-match-style]').length, 0);
  assert.equal(w.__bcMatchCardsV014, undefined); w.eval(cards);
  assert.equal(root.querySelectorAll('.bc2-event').length, 2);
});
test('goal indicator expires even without animationend (reduced motion)', async t => {
  const { list, root, api } = setup(t);
  list.querySelector('.sc-7l8my2-0 span').textContent = '2'; api.refresh();
  assert.equal(root.querySelectorAll('.bc-goal-flash').length, 1);
  await pause(1400); assert.equal(root.querySelectorAll('.bc-goal-flash').length, 0);
});
test('added time remains complete in both experimental parsers', () => {
  for (const source of [v28, v29]) {
    const start = source.indexOf('  function timeValue(');
    const end = source.indexOf('\n  function ', start + 3);
    const fn = new Function(source.slice(start, end) + ';return timeValue;')();
    for (const input of ['45+2′', "90+5'", '45′ +2']) assert.equal(fn(input), input.replace(/\s+/g, ''));
    assert.equal(fn('Перерыв'), 'HT'); assert.equal(fn('12:30'), '12:30');
  }
});
test('dock scripts refuse to take over each other in either load order', t => {
  const { w } = setup(t);
  w.eval(calm); w.eval(chrome);
  assert.ok(w.__bcCalmDarkFourColorsV100); assert.equal(w.__bcChromeV19CheckpointInstalled, undefined);
  w.__bcCalmDarkFourColorsV100.restore(); w.eval(chrome); w.eval(calm);
  assert.equal(w.__bcChromeV19CheckpointInstalled, true); assert.equal(w.__bcCalmDarkFourColorsV100, undefined);
});
test('dock geometry is restored across desktop breakpoint (mocked layout)', async t => {
  const { w } = setup(t); const bar = w.document.createElement('nav'); bar.className = 'tabbar';
  w.document.body.append(bar);
  Object.defineProperty(bar, 'offsetWidth', { value: 390 });
  let width = 390; Object.defineProperty(w.document.documentElement, 'clientWidth', { get: () => width });
  w.eval(calm); assert.equal(bar.style.position, 'fixed');
  width = 800; w.dispatchEvent(new w.Event('resize')); await pause(260);
  assert.equal(bar.style.position, ''); assert.equal(bar.style.transform, '');
  assert.equal(w.__bcCalmDarkFourColorsV100.status().dock.status, 'DESKTOP');
});
test('header remount and Escape menu handling (mocked layout)', async t => {
  const { w } = setup(t); w.happyDOM.setWindowSize({ width: 500, height: 844 });
  const makeHeader = () => {
    const h = w.document.createElement('header'); h.className = 'page-header';
    h.innerHTML = '<a class="active"><img></a><div><div class="wallet"><button class="button-brand">+</button></div><button class="bg-alw_white">gift</button><button class="bell"><svg></svg></button><button class="avatar"><img alt="avatar"></button></div>';
    return h;
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    const left = this.classList.contains('wallet') ? 80 : this.classList.contains('button-brand') ? 100 : this.classList.contains('bell') ? 160 : this.classList.contains('avatar') ? 240 : this.textContent === '⋯' ? 200 : 0;
    const width = this.classList.contains('wallet') ? 70 : 30;
    return { left, right: left + width, x: left, width, top: 0, bottom: 40, height: 40, y: 0 };
  };
  let h = makeHeader(); w.document.body.append(h); w.eval(header);
  assert.equal(w.__bcMinimalHeaderV21.status().active, true);
  const menu = h.querySelector('[aria-controls]'); menu.click();
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(menu.getAttribute('aria-expanded'), 'false'); assert.equal(w.document.activeElement, menu);
  const next = makeHeader(); h.replaceWith(next); h = next; await pause(260);
  assert.ok(h.querySelector('[aria-controls]')); assert.equal(w.document.querySelectorAll('#bc-header-overflow').length, 1);
  w.happyDOM.setWindowSize({ width: 800, height: 844 }); w.dispatchEvent(new w.Event('resize')); await pause(260);
  assert.equal(h.querySelector('[aria-controls]'), null);
});
