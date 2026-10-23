import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const port = process.env.TEST_PORT || '4276';
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/dev-server.mjs'], { env: { ...process.env, PORT: port }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start')), 10000);
    server.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
  });
  browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
    args: JSON.parse(process.env.CHROMIUM_ARGS || '[]') });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base); await page.waitForSelector('.bc2-event');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.bc2-event').count(), 2);
  assert.equal(await page.evaluate(() => window.__bcMinimalHeaderV21.status().active), true);
  for (const width of [320, 360, 390, 430, 800, 390]) {
    await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(450);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    if (width === 800) assert.equal(await page.locator('.tabbar').evaluate(el => el.style.transform), '');
    console.log(`PASS viewport ${width}px`);
  }
  const menu = page.locator('[aria-controls="bc-header-overflow"]');
  await menu.click(); assert.equal(await menu.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('aria-expanded'), 'false');
  const event = await page.locator('.bc2-event').first().elementHandle();
  await page.getByRole('button', { name: '+ Гол хозяев', exact: true }).click();
  assert.equal(await page.locator('.bc2-score').first().textContent(), '2');
  assert.equal(await event.evaluate(el => el.isConnected), true);
  await page.waitForTimeout(1400); assert.equal(await page.locator('.bc-goal-flash').count(), 0);
  await page.getByRole('button', { name: 'Нет матчей', exact: true }).click();
  assert.equal(await page.locator('.bc2-event').count(), 0);
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await page.getByRole('button', { name: 'Ошибка данных', exact: true }).click();
  assert.equal(await page.locator('.bc2-event').count(), 1);
  assert.equal(await page.locator('[data-editor-id="eventCard"]:not(.bc-m-v014)').count(), 1);
  await page.getByRole('button', { name: 'Прематч', exact: true }).click();
  assert.equal(await page.locator('.bc2-score').first().textContent(), '—');
  await page.getByRole('button', { name: 'Новый раздел', exact: true }).click();
  assert.equal(await page.locator('.bc2-event').count(), 1);
  assert.equal(await page.locator('.bc2-title').textContent(), 'Новый раздел');
  await page.getByLabel('Новый дизайн', { exact: true }).uncheck();
  assert.equal(await page.locator('.bc2-event').count(), 0);
  await page.getByLabel('Новый дизайн', { exact: true }).check(); await page.waitForSelector('.bc2-event');
  await page.getByRole('button', { name: 'Сбросить', exact: true }).click();
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/preview-390.png', fullPage: true });
  for (const path of ['/.git/config', '/package.json', '/preview/%2e%2e/package.json']) {
    assert.equal((await page.request.get(base + path)).status(), 404);
  }
  assert.equal(await page.locator('meta[name="bc-dev-server"]').count(), 1);
  assert.deepEqual(errors, []);
  console.log('PASS scenarios, persistent nodes, reduced motion, menu, rollback, and server boundaries');
} finally { await browser?.close(); server.kill(); }
