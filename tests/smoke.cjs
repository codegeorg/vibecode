/* End-to-end checks against the real browser-based R runtime. */
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const port = 8765;
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['server.py', '--port', String(port), '--host', '127.0.0.1'], {
  cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'ignore', 'pipe'],
});
let serverError = '';
server.stderr.on('data', d => { serverError += d.toString(); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let browser;
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await fetch(base)).ok) break; } catch {}
      if (server.exitCode !== null) throw new Error(serverError);
      await wait(150);
    }
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      headless: true, args: ['--no-sandbox'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#runtime-status')?.textContent.includes('bereit'), { timeout: 75000 });
    const course = await page.evaluate(async () => (await import('/curriculum.js')).lessons);
    const execute = async (code, check = false) => {
      await page.locator('#code-editor').fill(code);
      await page.locator(check ? '#check-code' : '#run-code').click();
      await page.waitForFunction(() => document.querySelector('#run-code')?.disabled === false, { timeout: 45000 });
    };

    // Merely evaluating code or opening the solution must not award completion.
    await execute('values <- c(10, 20, 21, 30, 15, 21)\n# mean(values)', true);
    assert(await page.locator('#check-feedback').evaluate(e => e.classList.contains('error')));
    assert.match(await page.locator('#sidebar-count').innerText(), /^0/);
    await execute('object_that_does_not_exist');
    assert.match(await page.locator('#console-output').innerText(), /not found/);
    await page.locator('#show-solution').click();
    await page.locator('#use-solution').click();
    assert.match(await page.locator('#sidebar-count').innerText(), /^0/);
    console.log('PASS: incomplete solutions rejected; errors explained; solution viewing does not award progress');

    // Every official solution is executed by WebR and graded through the UI.
    for (const lesson of course) {
      await page.evaluate(id => { location.hash = '#lesson/' + id; }, lesson.id);
      await page.waitForFunction(title => document.querySelector('#lesson-heading')?.textContent === title, lesson.title);
      await execute(lesson.solution, true);
      assert(await page.locator('#check-feedback').evaluate(e => e.classList.contains('success')),
        `${lesson.id}: ${await page.locator('#console-output').innerText()}`);
      if (lesson.solution.includes('plot(') || lesson.solution.includes('acf(')) {
        assert(await page.locator('#plot-output canvas').count() > 0, `${lesson.id}: missing plot`);
      }
      console.log('PASS:', lesson.id);
    }
    assert.equal(await page.locator('#sidebar-count').innerText(), '18 / 18');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('#sidebar-count').innerText(), '18 / 18');
    await page.waitForFunction(() => document.querySelector('#runtime-status')?.textContent.includes('bereit'), { timeout: 75000 });
    assert.equal(await page.locator('#code-editor').inputValue(), course.at(-1).solution);
    console.log('PASS: progress and code drafts survive reload');

    await page.evaluate(() => { location.hash = '#cheatsheet'; });
    await page.locator('#cheat-search').fill('Ljung');
    assert.equal(await page.locator('.cheat-card').count(), 1);
    await page.locator('[data-try-cheat]').click();
    await page.waitForURL('**/#practice');
    await execute('my_value <- 42');
    await execute('my_value * 2');
    assert.match(await page.locator('#console-output').innerText(), /84/);
    await execute('2^10');
    assert.match(await page.locator('#console-output').innerText(), /1024/);
    await execute('x <- c(');
    assert.match(await page.locator('#console-output').innerText(), /Fehler|unexpected|parse/i);
    console.log('PASS: cheatsheet search; practice evaluates arbitrary R and retains objects; syntax errors surfaced');

    await page.locator('#file-upload').setInputFiles({
      name: 'example.csv', mimeType: 'text/csv', buffer: Buffer.from('value\n4\n7\n9\n'),
    });
    await page.waitForFunction(() => document.querySelector('#uploaded-status')?.textContent.includes('Geladen: example.csv'));
    await execute('sum(read.table("example.csv", header=TRUE)$value)');
    assert.match(await page.locator('#console-output').innerText(), /20/);
    const downloading = page.waitForEvent('download');
    await page.locator('#download-code').click();
    assert.equal((await downloading).suggestedFilename(), 'playground.R');
    console.log('PASS: user CSV import and R script download');

    await page.keyboard.press('Control+k');
    await page.locator('#global-search').fill('Holt-Winters');
    assert(await page.locator('.search-result').count() > 0);
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#mobile-menu').click();
    assert.equal(await page.locator('#mobile-menu').getAttribute('aria-expanded'), 'true');
    await page.locator('a[data-view="course"]').click();
    await page.waitForURL('**/#course');
    assert(await page.locator('#sidebar').evaluate(e => !e.classList.contains('open')));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: keyboard search; mobile navigation without horizontal overflow; no JavaScript errors');
    console.log('\nAll 18 lessons and interaction checks passed against real R.');
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
