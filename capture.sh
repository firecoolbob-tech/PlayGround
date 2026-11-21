#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
: "${CAPTURE_URL:?CAPTURE_URL is required}"
: "${CAPTURE_DIR:?CAPTURE_DIR is required}"

/usr/bin/time -p mkdir -p -- "$CAPTURE_DIR"
/usr/bin/time -p node --input-type=module <<'NODE'
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const url = process.env.CAPTURE_URL;
const output = resolve(process.env.CAPTURE_DIR);
const runtime = join(process.env.HOME || '', '.local/share/omgithub-playwright');
const configPath = join(runtime, process.platform === 'darwin' ? 'metal.json' : 'linux.json');
const require = createRequire(join(runtime, 'package.json'));
let browser;
let exitCode = 1;

const fail = (message, code = 1) => {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
};

try {
  let parsedUrl;
  try { parsedUrl = new URL(url); }
  catch { fail(`CAPTURE_URL must be an absolute URL: ${url}`); }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) fail(`Unsupported capture protocol: ${parsedUrl.protocol}`);
  mkdirSync(output, { recursive: true });

  let chromium, config;
  try {
    ({ chromium } = require('playwright'));
    config = JSON.parse(readFileSync(configPath, 'utf8'));
  } catch (error) {
    // Browser/package/config installation problems are infrastructure failures.
    fail(`Unable to load capture browser setup: ${error.message}`, 75);
  }
  if (process.platform === 'linux') {
    try {
      const { readFileSync } = await import('node:fs');
      process.env.DISPLAY ||= `:${readFileSync(join(runtime, 'display'), 'utf8').trim()}`;
    } catch (error) {
      fail(`Capture display is unavailable: ${error.message}`, 75);
    }
  }

  try {
    browser = await chromium.launch({ ...config.browser.launchOptions, timeout: 30000 });
  } catch (error) {
    fail(`Unable to launch capture browser: ${error.message}`, 75);
  }

  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    let page;
    try {
      page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      page.setDefaultTimeout(20000);
      const pageErrors = [];
      const badResponses = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('response', response => {
        let sameOrigin = false;
        try { sameOrigin = new URL(response.url()).origin === parsedUrl.origin; } catch {}
        if (sameOrigin && response.status() >= 400) badResponses.push({ status: response.status(), url: response.url() });
      });

      let response;
      try {
        // Navigate to precisely the caller-provided URL; don't append capture parameters.
        response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (error) {
        fail(`Temporary navigation failure for ${url}: ${error.message}`, 75);
      }
      if (!response) fail(`Browser did not receive a document response for ${url}`, 75);
      if (!response.ok()) {
        const status = response.status();
        fail(`Preview returned HTTP ${status} at ${url}`, status === 408 || status === 429 || status >= 500 ? 75 : 1);
      }

      try {
        await page.waitForSelector('.screen.is-active', { state: 'visible', timeout: 20000 });
        await page.waitForFunction(() => document.readyState === 'complete' && document.body?.innerText.trim().length > 0, { timeout: 15000 });
      } catch (error) {
        fail(`App did not render a visible screen in ${name} view: ${error.message}`, 1);
      }
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(500);

      if (pageErrors.length) fail(`JavaScript rendering error in ${name} view: ${pageErrors.join('; ')}`, 1);
      if (badResponses.length) fail(`App asset request failed in ${name} view: ${badResponses.map(item => `${item.status} ${item.url}`).join('; ')}`, 1);

      try {
        await page.screenshot({ path: join(output, `final-${name}.png`), fullPage: false, timeout: 30000 });
      } catch (error) {
        fail(`Unable to capture ${name} screenshot: ${error.message}`, 75);
      }
      console.log(`Captured ${name} view at ${width}x${height}: ${url}`);
      await page.close();
    } catch (error) {
      if (page && !page.isClosed()) await page.close().catch(() => {});
      throw error;
    }
  }
  exitCode = 0;
} catch (error) {
  console.error(error);
  exitCode = error.exitCode || 1;
} finally {
  if (browser) {
    try { await browser.close(); }
    catch (error) {
      console.error(`Unable to close capture browser cleanly: ${error.message}`);
      if (exitCode === 0) exitCode = 75;
    }
  }
}
process.exitCode = exitCode;
NODE
