// 像素级自查（任务卡 016b）：用无头浏览器真实渲染 pupSVG，
// 在关键坐标采样像素颜色，验证：
//  1. 天天三只表情的两只眼睛中心都能看到眼白（不被耳朵盖住）
//  2. 灰灰额头（帽檐下、眼睛上）没有乱毛色块
// 用法：FORGE_PW_MODULE=<playwright-core 路径> node tests/unit/pups-pixel-check.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PW = process.env.FORGE_PW_MODULE || '/Users/lostxiaoq/Documents/Drop_claude/hermes-forge/node_modules/playwright-core';
const CHROME = process.env.FORGE_CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const { chromium } = require(PW);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
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
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });

// SVG 是 200×200 视口，浏览器里按 200×200 渲染后逐像素采样
await page.goto(base + '/tests/unit/pups-pixel-page.html');
await page.addScriptTag({ type: 'module', content: `
  try {
    const { pupSVG } = await import('${base}/src/art/pups.js');
    window.__ready = false;
    window.__sample = async (id, mood, points) => {
      const svg = pupSVG(id, { size: 200, mood });
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode();
      const ctx = document.getElementById('c').getContext('2d');
      ctx.clearRect(0, 0, 200, 200);
      ctx.drawImage(img, 0, 0, 200, 200);
      return points.map(([x, y]) => {
        const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
        return [x, y, r, g, b, a];
      });
    };
    window.__ready = true;
  } catch (e) {
    window.__error = String(e && e.stack || e);
  }
` });
await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 10000 });
const err = await page.evaluate(() => window.__error);
if (err) { console.error('页面模块加载失败：', err); await browser.close(); srv.close(); process.exit(1); }

const hex = ([r, g, b, , a]) => (a < 200 ? 'transparent' : '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));

let failures = 0;
const check = (ok, msg) => { console.log(`  ${ok ? '✔' : '✘'} ${msg}`); if (!ok) failures++; };

// ---- 天天：两只眼睛位置绝不能被耳朵的金毛盖住 ----
// 眼白圆心 (75.5,88)/(124.5,88)，r=12 → 采样中心 ±4 的 5 个点。
// 合法颜色 = 眼睛自身的颜色（白/瞳孔紫/眼线深棕/眼睑描边）；
// 耳朵金毛 #f2cd8f 或其描边 #d8a95f 一旦出现即说明耳朵盖住了眼睛。
const isEyeForbidden = (c) => c === '#f2cd8f' || c === '#d8a95f' || c === 'transparent';
// 采样点按表情区分：
//  - normal/thinking：睁眼，眼睛内部各点（眼白/瞳孔/眼线）都必须是眼睛系颜色；
//  - happy：眯成弧线，只有弧线笔迹上的点能采（弧顶 + 两侧翼），
//    弧线下方本来露的就是脸毛，不采。若耳朵盖到这里，笔迹会变成金毛色。
const EYE_PTS = {
  normal: [[75, 84], [125, 84], [75, 88], [125, 88], [76, 92], [124, 92]],
  thinking: [[75, 84], [125, 84], [75, 88], [125, 88], [76, 92], [124, 92]],
  happy: [[75, 84], [125, 84], [70, 85], [130, 85]],
};
for (const mood of ['normal', 'happy', 'thinking']) {
  const raw = await page.evaluate(([m, pts]) => window.__sample('skye', m, pts), [mood, EYE_PTS[mood]]);
  for (const [x, y, ...rgb] of raw) {
    const c = hex(rgb);
    check(!isEyeForbidden(c), `skye/${mood} 眼睛区域 (${x},${y}) = ${c}${isEyeForbidden(c) ? ' ← 耳朵金毛盖住眼睛了！' : '（眼睛系颜色）'}`);
  }
}

// ---- 天天：耳朵本体在脑袋外侧必须可见（不然耳朵等于没画） ----
// 左耳外侧月牙的采样点（右耳镜像）：耳中段 + 耳尖卷毛
const EAR_PTS = [[24, 100], [26, 78], [36, 121], [174, 100], [172, 78], [163, 121]];
const earRaw = await page.evaluate(([p]) => window.__sample('skye', 'normal', p), [EAR_PTS]);
const isEarColor = (c) => c === '#f2cd8f' || c === '#f9e8c8' || c === '#d8a95f';
for (const [x, y, ...rgb] of earRaw) {
  const c = hex(rgb);
  check(isEarColor(c), `skye 耳朵区域 (${x},${y}) = ${c}（应为耳朵毛/卷毛色）`);
}

// ---- 灰灰：额头（帽檐下沿到眼睛之间）不能有乱毛 ----
// 帽檐最低到 y≈66，眼睛上睑从 y≈73 开始 → 额头采样带 y=69…71，x=60…140
const pts = await page.evaluate(() => window.__sample('rocky', 'normal',
  [[60, 70], [80, 70], [100, 70], [120, 70], [140, 70], [70, 68], [130, 68]]));
for (const [x, y, ...rgb] of pts) {
  const c = hex(rgb);
  // 额头只允许：头灰 #bcc3c9、帽檐绿 #2c7a38 及描边 #1f5f2b、
  // 眼睑描边 #8f98a1、头描边、背景绿的浅色。乱毛是 #bcc3c9 + 深描边 —
  // 乱毛若出现在额头，会在这里形成「灰底+深灰描边」的锯齿状组合，
  // 逐点采样下深描边色 #8f98a1 出现在 y=70 线上即视为有尖刺残留。
  const isFurDarkStroke = c === '#8f98a1';
  check(!isFurDarkStroke, `rocky 额头 (${x},${y}) = ${c}（深灰描边出现即说明有乱毛残留）`);
}

await browser.close();
srv.close();
if (failures) { console.log(`\nFAIL ${failures} 项`); process.exit(1); }
console.log('\nPASS 像素自查全部通过');
