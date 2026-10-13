// 单狗 200×200 定长截图（不受 fullPage 滚动偏移影响），用于 before/after 逐像素对比
// 用法：node tests/unit/pups-solo-shot.mjs <输出路径>
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PW = process.env.FORGE_PW_MODULE || '/Users/lostxiaoq/Documents/Drop_claude/hermes-forge/node_modules/playwright-core';
const CHROME = process.env.FORGE_CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const OUT = process.argv[2] || 'tests/unit/.shots/pups-solo.png';
const { chromium } = require(PW);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(process.cwd(), p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 660 } });
await page.goto(base + '/tests/unit/pups-preview.html');
await page.waitForSelector('.card');
// 每张卡片中间那个 200×200 的「平常」表情图
const figs = page.locator('.card .moods figure:first-child > div');
await page.addStyleTag({ content: 'body{background:#ffffff!important} .card{box-shadow:none!important;border-radius:0!important;padding:4px!important}' });
const n = await figs.count();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
for (let i = 0; i < n; i++) {
  await figs.nth(i).screenshot({ path: OUT.replace(/\.png$/, `-${i}.png`) });
}
console.log('已保存', n, '张 →', OUT.replace(/\.png$/, '-<0..5>.png'));
await browser.close();
srv.close();
