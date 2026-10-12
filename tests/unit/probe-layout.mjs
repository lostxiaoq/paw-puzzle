// 临时探针：量布局尺寸，验证任务卡的 10 条意见对应的现状（不进验收）。
// 用法和 smoke.mjs 一样：node tests/unit/probe-layout.mjs [home|play|badges] [game] [level]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PW = process.env.FORGE_PW_MODULE || '/Users/lostxiaoq/Documents/Drop_claude/hermes-forge/node_modules/playwright-core';
const CHROME = process.env.FORGE_CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const ROOT = process.cwd();
const { chromium } = require(PW);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME });

async function fresh(vp) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(base + '/');
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  return page;
}

// 1) 平板首页卡片几何
{
  const page = await fresh({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('[data-testid^="game-tile-"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const pup = el.querySelector('.tile-pup')?.getBoundingClientRect();
      const title = el.querySelector('.tile-title');
      const tr = title?.getBoundingClientRect();
      const fs = title ? getComputedStyle(title).fontSize : '';
      return { id: el.dataset.testid, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), pupW: pup && Math.round(pup.width), titleFs: fs };
    });
    const grid = document.querySelector('.home-grid')?.getBoundingClientRect();
    return { tiles, gridBottom: grid && Math.round(grid.bottom), vh: window.innerHeight };
  });
  console.log('平板首页 1024x768:', JSON.stringify(info, null, 1));
  await page.close();
}

// 2) 手机竖屏首页：徽章按钮 vs 标题重叠？
{
  const page = await fresh({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
    const badge = document.querySelector('[data-testid="btn-badges"]');
    const title = document.querySelector('.home-title');
    const tile = document.querySelector('[data-testid="game-tile-route"]');
    const pup = tile?.querySelector('.tile-pup')?.getBoundingClientRect();
    const txt = tile?.querySelector('.tile-title')?.getBoundingClientRect();
    const overlap = (a, b) => a && b && !(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y);
    const tilePupR = pup; const tileTitleR = txt;
    return {
      badge: rect(badge), title: rect(title),
      badgeOverlapsTitle: overlap(rect(badge), rect(title)),
      tilePup: tilePupR && rect(tile), tileTitle: tileTitleR,
      pupTitleOverlap: overlap(pup, txt),
    };
  });
  console.log('手机首页 390x844:', JSON.stringify(info, null, 1));
  await page.close();
}

// 3) 游戏页 play-area 内内容是否居中 + 小网格格子尺寸
for (const g of ['route', 'mirror', 'rotate', 'cubes']) {
  const page = await fresh({ width: 1024, height: 768 });
  await page.evaluate((g2) => { location.hash = `#/game/${g2}/0`; }, g);
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const area = document.querySelector('#play-area');
    const ar = area.getBoundingClientRect();
    // 找 play-area 第一个实内容元素
    const stage = area.firstElementChild;
    const sr = stage.getBoundingClientRect();
    const leftGap = Math.round(sr.x - ar.x);
    const rightGap = Math.round(ar.right - sr.right);
    const topGap = Math.round(sr.y - ar.y);
    const bottomGap = Math.round(ar.bottom - sr.bottom);
    const out = { area: { w: Math.round(ar.width), h: Math.round(ar.height) }, gaps: { left: leftGap, right: rightGap, top: topGap, bottom: bottomGap } };
    const cellEl = document.querySelector('.route-cell, .mirror-cell');
    if (cellEl) { const r = cellEl.getBoundingClientRect(); out.cell = Math.round(r.width); }
    const wrap = document.querySelector('.route-map-wrap, .mirror-wrap');
    if (wrap) { const r = wrap.getBoundingClientRect(); out.board = { w: Math.round(r.width), h: Math.round(r.height) }; }
    return out;
  });
  console.log(`游戏页 ${g}:`, JSON.stringify(info));
  await page.close();
}

// 4) 徽章墙布局
{
  const page = await fresh({ width: 1024, height: 768 });
  await page.evaluate(() => { location.hash = '#/badges'; });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="badge-"]')].map((el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.testid, x: Math.round(r.x), y: Math.round(r.y) }; });
    return cards;
  });
  console.log('徽章墙 1024x768:', JSON.stringify(info));
  await page.close();
}
{
  const page = await fresh({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = '#/badges'; });
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-testid^="badge-"]')].map((el) => { const r = el.getBoundingClientRect(); return { id: el.dataset.testid, x: Math.round(r.x), y: Math.round(r.y) }; });
    return cards;
  });
  console.log('徽章墙 390x844:', JSON.stringify(info));
  await page.close();
}

// 5) rotate「转一转」标签文案 + 灰灰尺寸
{
  const page = await fresh({ width: 1024, height: 768 });
  await page.evaluate(() => { location.hash = '#/game/rotate/0'; });
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => {
    const label = document.querySelector('.rot-top-label');
    const pup = document.querySelector('.rot-pup');
    const piece = document.querySelector('.rot-top-piece');
    const pupR = pup?.getBoundingClientRect();
    const pieceR = piece?.getBoundingClientRect();
    return { label: label?.textContent, pupSize: pupR && { w: Math.round(pupR.width), h: Math.round(pupR.height) }, piece: pieceR && { w: Math.round(pieceR.width) } };
  });
  console.log('rotate 转一转:', JSON.stringify(info));
  await page.close();
}

await browser.close();
srv.close();
console.log('probe done');
