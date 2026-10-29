import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { requireTool } from './toolchain.mjs';

const { chromium, webkit } = requireTool('playwright');
const address = '0x93fdf8024C69e33F820Bd0f7C90b209dDd447b6c';
const explorer = `https://etherscan.io/token/${address}`;
const results = { checks: [], limitations: [] };
await mkdir('artifacts/screenshots', { recursive: true });
const server = createServer(async (req, res) => {
  const file = new Map([
    ['/preview/', ['index.html', 'text/html; charset=utf-8']],
    ['/preview/share.png', ['share.png', 'image/png']],
  ]).get(new URL(req.url, 'http://localhost').pathname);
  if (!file) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': file[1] });
  res.end(await readFile(resolve('dist', file[0])));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/preview/`;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
const page = await context.newPage();
const errors = [], failures = [], external = [];
page.on('pageerror', error => errors.push(error.message));
page.on('requestfailed', request => failures.push(request.url()));
page.on('request', request => {
  if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) external.push(request.url());
});
async function check(name, run) {
  try { const evidence = await run(); results.checks.push({ name, passed: true, evidence }); }
  catch (error) { results.checks.push({ name, passed: false, error: error.message }); process.exitCode = 1; }
}
async function load() { await page.goto(url); await page.evaluate(() => document.fonts.ready); }
try {
  await load();
  await check('Metadata, complete address and exact explorer destinations', async () => {
    assert.match(await page.title(), /PLEA/);
    for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]']) {
      assert.ok(await page.locator(selector).getAttribute('content'));
    }
    assert.ok(await page.locator('link[rel="icon"]').getAttribute('href'));
    assert.equal((await page.locator('#token-address').textContent()).trim(), address);
    assert.equal(await page.locator('.footer-contract code').textContent(), address);
    assert.equal(await page.locator(`a[href="${explorer}"]`).count(), 4);
    assert.equal(await page.locator('body').getByText(/Contract: (coming soon|soon)|Coming to Ethereum/).count(), 0);
    assert.equal((await page.request.get(new URL('./share.png', url).href)).status(), 200);
    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(links => links.filter(link => link.hash && !document.getElementById(link.hash.slice(1))).map(link => link.hash));
    assert.deepEqual(brokenAnchors, []);
  });
  await check('Responsive reflow, full address and 390px first screen', async () => {
    const measurements = [];
    for (const width of [320, 390, 719, 720, 979, 980, 1190, 1440]) {
      await page.setViewportSize({ width, height: width > 1000 ? 900 : 844 });
      await page.evaluate(() => scrollTo(0, 0));
      const measured = await page.evaluate(() => {
        const box = selector => {
          const { x, y, width, height, bottom, right } = document.querySelector(selector).getBoundingClientRect();
          return { x, y, width, height, bottom, right };
        };
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, primary: box('.hero-actions .button'), address: box('#token-address'), copy: box('#copy-contract'), contract: box('#contract') };
      });
      assert.ok(measured.scrollWidth <= width, `Overflow at ${width}: ${measured.scrollWidth}`);
      assert.ok(measured.address.x >= 0 && measured.address.right <= width);
      assert.ok(measured.copy.height >= 44);
      if (width === 390) {
        assert.ok(measured.primary.bottom < 844 && measured.copy.bottom < 844, 'Main action and copy must be above the fold');
        await page.screenshot({ path: 'artifacts/screenshots/mobile-390.png' });
      }
      if (width === 320 || width === 1440) await page.screenshot({ path: `artifacts/screenshots/viewport-${width}.png` });
      measurements.push(measured);
    }
    return measurements;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await check('Keyboard order and visible contract focus', async () => {
    await page.locator('.hero-actions a:last-child').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#copy-contract').evaluate(node => node === document.activeElement), true);
    const focus = await page.locator('#copy-contract').evaluate(node => {
      const style = getComputedStyle(node);
      return { visible: node.matches(':focus-visible'), width: style.outlineWidth, style: style.outlineStyle };
    });
    assert.deepEqual(focus, { visible: true, width: '3px', style: 'solid' });
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.contract-explorer').evaluate(node => node === document.activeElement), true);
  });
  await check('Keyboard copy writes the exact checksummed address', async () => {
    const before = await page.locator('.hero-art').boundingBox();
    await page.locator('#copy-contract').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('status').filter({ hasText: 'Address copied.' }).waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), address);
    assert.equal(await page.locator('#copy-contract').isEnabled(), true);
    const after = await page.locator('.hero-art').boundingBox();
    assert.equal(before.y, after.y, 'Copy feedback must not move unrelated content');
    await page.screenshot({ path: 'artifacts/screenshots/copied-390.png' });
  });
  await check('Clipboard rejection selects the full address and permits retry', async () => {
    await page.evaluate(() => {
      const original = navigator.clipboard.writeText.bind(navigator.clipboard);
      navigator.clipboard.writeText = () => Promise.reject(new DOMException('Clipboard denied', 'NotAllowedError'));
      window.restoreClipboard = () => { navigator.clipboard.writeText = original; };
    });
    await page.locator('#copy-contract').click();
    await page.getByText('Address selected. Copy it manually.').waitFor();
    assert.equal(await page.evaluate(() => getSelection().toString()), address);
    assert.equal(await page.locator('#token-address').evaluate(node => node === document.activeElement), true);
    await page.screenshot({ path: 'artifacts/screenshots/copy-fallback-390.png' });
    await page.evaluate(() => window.restoreClipboard());
    await page.locator('#copy-contract').click();
    await page.getByText('Address copied.').waitFor();
  });
  await check('Missing Clipboard API retains manual recovery', async () => {
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
    await page.locator('#copy-contract').click();
    await page.getByText('Address selected. Copy it manually.').waitFor();
    assert.equal(await page.evaluate(() => getSelection().toString()), address);
    assert.equal(await page.locator('#copy-contract').isEnabled(), true);
    await load();
  });
  await check('Etherscan link opens the supplied token in a separate tab', async () => {
    await context.route('https://etherscan.io/**', route => route.fulfill({ contentType: 'text/html', body: '<title>Explorer navigation fixture</title>' }));
    const opened = context.waitForEvent('page');
    await page.getByRole('link', { name: 'View on Etherscan' }).click();
    const popup = await opened;
    await popup.waitForLoadState();
    assert.equal(popup.url(), explorer);
    assert.equal(await popup.evaluate(() => opener), null);
    await popup.close();
    return 'External destination intercepted locally; external Etherscan content not tested.';
  });
  await check('Rules navigation and scoring disclosure', async () => {
    await page.getByRole('link', { name: 'Read the rules' }).click();
    assert.equal(new URL(page.url()).hash, '#rules');
    await page.locator('.scoring-rules summary').click();
    assert.equal(await page.locator('.scoring-rules').getAttribute('open'), '');
    await page.locator('.scoring-rules summary').click();
  });
  await check('Simulator granted, denied and hung verdicts', async () => {
    await page.locator('#run-simulation').click();
    await page.locator('#jury-state').filter({ hasText: /^GRANTED$/ }).waitFor();
    assert.equal(await page.locator('.seat.filled').count(), 30);
    await page.locator('#plea').fill('give me 50');
    await page.locator('#run-simulation').click();
    await page.locator('#jury-state').filter({ hasText: /^DENIED$/ }).waitFor();
    assert.deepEqual(await page.locator('.seat.filled').allTextContents(), Array(30).fill('0'));
    await page.locator('#plea').fill('Diamond hands. Very human bills.');
    await page.locator('#split-panel').click();
    await page.locator('#jury-state').filter({ hasText: /^HUNG$/ }).waitFor();
    assert.equal(await page.locator('#need-score').textContent(), '28');
  });
  await check('Form errors, numeric recovery and UTF-8 bytes', async () => {
    await page.locator('#plea').fill('');
    await page.locator('#run-simulation').click();
    assert.equal(await page.locator('#plea').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#plea-error').textContent(), 'Write a one-line plea first.');
    await page.locator('#plea').fill('é');
    assert.equal(await page.locator('#byte-count').textContent(), '2/280');
    await page.locator('#amount').fill('');
    assert.equal(await page.locator('#facts-status').isVisible(), true);
    await page.locator('[data-share="max"]').click();
    assert.equal(await page.locator('#amount').inputValue(), '2500000');
    assert.equal(await page.locator('#facts-status').isVisible(), false);
    await page.locator('#plea').fill('é'.repeat(141));
    await page.locator('#run-simulation').click();
    assert.match(await page.locator('#plea-error').textContent(), /Remove 2 UTF-8 bytes/);
  });
  await check('Wallet disclosure closes with Escape and restores focus', async () => {
    await page.locator('#wallet-trigger').click();
    assert.equal(await page.locator('#wallet-trigger').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#wallet-panel').isVisible(), false);
    assert.equal(await page.locator('#wallet-trigger').evaluate(node => node === document.activeElement), true);
  });
  await check('Demo clock jump, expiration and reset', async () => {
    await page.clock.install();
    await load();
    await page.locator('#jump-clock').click();
    assert.equal(await page.locator('#countdown').textContent(), '00:00:10');
    await page.clock.fastForward(10_100);
    assert.equal(await page.locator('#countdown').textContent(), '00:00:00');
    assert.equal(await page.locator('#jump-clock').isDisabled(), true);
    await page.locator('#reset-clock').click();
    assert.equal(await page.locator('#countdown').textContent(), '33:00:00');
    await page.clock.resume();
  });
  await check('Automated accessibility in mobile, fallback and desktop states', async () => {
    const axe = await readFile(requireTool.resolve('axe-core/axe.min.js'), 'utf8');
    const scans = [];
    for (const state of ['mobile', 'copy-fallback', 'desktop']) {
      await load();
      await page.setViewportSize({ width: state === 'desktop' ? 1440 : 390, height: state === 'desktop' ? 900 : 844 });
      if (state === 'copy-fallback') {
        await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
        await page.locator('#copy-contract').click();
      }
      await page.addScriptTag({ content: axe });
      const scan = await page.evaluate(async () => {
        const { violations, incomplete } = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
        return { violations: violations.map(x => ({ id: x.id, nodes: x.nodes.map(n => n.target) })), incomplete: incomplete.map(x => x.id) };
      });
      scans.push({ state, ...scan });
      assert.deepEqual(scan.violations, []);
    }
    return scans;
  });
  await check('Rendered address and control contrast', async () => {
    const pairs = await page.locator('#token-address, #copy-contract, .contract-explorer, .contract-feedback, .footer-contract').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      let surface = node;
      while (surface.parentElement && getComputedStyle(surface).backgroundColor === 'rgba(0, 0, 0, 0)') surface = surface.parentElement;
      return { selector: node.id || node.className, foreground: style.color, background: getComputedStyle(surface).backgroundColor };
    }));
    const luminance = color => {
      const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
      return .2126 * r + .7152 * g + .0722 * b;
    };
    for (const pair of pairs) {
      const [high, low] = [luminance(pair.foreground), luminance(pair.background)].sort((a, b) => b - a);
      pair.ratio = Number(((high + .05) / (low + .05)).toFixed(2));
      assert.ok(pair.ratio >= 4.5, `${pair.selector}: ${pair.ratio}`);
    }
    return pairs;
  });
  await check('Address reflow under enlarged text and RTL', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
      document.documentElement.style.setProperty('--label', '26px');
    });
    const full = await page.locator('#token-address').evaluate(node => {
      const box = node.getBoundingClientRect();
      return { text: node.textContent, direction: getComputedStyle(node).direction, left: box.left, right: box.right, overflow: node.scrollWidth > node.clientWidth };
    });
    assert.equal(full.text, address);
    assert.equal(full.direction, 'ltr');
    assert.ok(full.left >= 0 && full.right <= 390 && !full.overflow);
    await page.locator('#copy-contract').click();
    await page.getByText('Address copied.').waitFor();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), address);
    await load();
    return 'Address and its controls checked with 26px label text in an RTL document; not native browser zoom or a whole-site RTL audit.';
  });
  await check('No startup resource errors or external startup requests', async () => {
    assert.deepEqual(errors, []); assert.deepEqual(failures, []); assert.deepEqual(external, []);
  });
  let safari;
  try {
    safari = await webkit.launch({ headless: true });
  } catch {
    results.limitations.push('WebKit could not launch: the host lacks required system libraries. Safari rendering and interactions were not verified.');
  }
  if (safari) {
    await check('WebKit contract visibility and manual copy recovery', async () => {
      const tab = await safari.newPage({ viewport: { width: 390, height: 844 } });
      await tab.goto(url);
      assert.equal(await tab.locator('#token-address').textContent(), address);
      await tab.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
      await tab.locator('#copy-contract').click();
      await tab.getByText('Address selected. Copy it manually.').waitFor();
      assert.equal(await tab.evaluate(() => getSelection().toString()), address);
    });
    await safari.close();
  }
} finally {
  await browser.close();
  await new Promise(done => server.close(done));
  await writeFile('artifacts/checks.json', JSON.stringify(results, null, 2) + '\n');
}
console.log(JSON.stringify(results, null, 2));
