// 自查脚本：把 pups-preview.html 截成图，供人工检查新画风
// 用法：FORGE_PW_MODULE=<playwright-core 路径> node tests/unit/pups-shot.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PW = process.env.FORGE_PW_MODULE || '/Users/lostxiaoq/Documents/Drop_claude/hermes-forge/node_modules/playwright-core';
const CHROME = process.env.FORGE_CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT = process.env.FORGE_ARTIFACTS || 'tests/unit/.shots';
const ROOT = process.cwd();
const { chromium } = require(PW);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/tests/unit/pups-preview.html');
await page.waitForSelector('.card', { timeout: 5000 });
await page.waitForTimeout(300);
fs.mkdirSync(OUT, { recursive: true });
await page.screenshot({ path: path.join(OUT, 'pups-preview.png'), fullPage: true });
console.log('已保存', path.join(OUT, 'pups-preview.png'), '卡片数', await page.locator('.card').count());
console.log(errors.length ? 'JS 错误：' + errors.join(' | ') : '没有 JS 错误');
await browser.close();
srv.close();
process.exit(errors.length ? 1 : 0);
