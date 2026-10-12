// 浏览器验收：node tests/accept/smoke.mjs <场景...>
//   home            首页 / 选关 / 游戏页骨架
//   play:<game>     打通该游戏第 1 关并进入第 2 关
//   playall:<game>  依次打通该游戏全部关卡
// 截图写到 $FORGE_ARTIFACTS（默认 tests/accept/.shots）
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const PW = process.env.FORGE_PW_MODULE || '/Users/lostxiaoq/Documents/Drop_claude/hermes-forge/node_modules/playwright-core';
const CHROME = process.env.FORGE_CHROMIUM || `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const SHOTS = process.env.FORGE_ARTIFACTS || 'tests/accept/.shots';
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

const failures = [];
function check(cond, msg) {
  if (cond) console.log(`  ✔ ${msg}`);
  else { console.log(`  ✘ ${msg}`); failures.push(msg); }
}

async function newPage(browser, base, viewport = { width: 1024, height: 768 }) {
  const ctx = await browser.newContext({ viewport, hasTouch: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(`console.error: ${m.text()}`); });
  await page.goto(base + '/');
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  return page;
}

const tid = (id) => `[data-testid="${id}"]`;
async function exists(page, id, timeout = 4000) {
  try { await page.waitForSelector(tid(id), { state: 'visible', timeout }); return true; } catch { return false; }
}
async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
}
async function go(page, hash) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
}

async function checkTargets(page, label) {
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-testid]')) {
      const id = el.dataset.testid;
      if (!/^(btn-|game-tile-|level-btn-|card-|choice-|color-)/.test(id)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.width < 60 || r.height < 60) out.push(`${id} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
  check(small.length === 0, `${label}：按钮都不小于 60px${small.length ? '（太小：' + small.join(', ') + '）' : ''}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `${label}：没有横向滚动条`);
}

async function scenarioHome(browser, base) {
  console.log('[home]');
  const page = await newPage(browser, base);
  await page.waitForTimeout(500);
  for (const g of ['route', 'mirror', 'rotate', 'cubes']) check(await exists(page, `game-tile-${g}`), `首页有 game-tile-${g}`);
  check(await exists(page, 'btn-badges'), '首页有 btn-badges');
  const svgs = await page.locator('svg').count();
  check(svgs >= 4, `首页画了狗狗（svg 数量 ${svgs}）`);
  await checkTargets(page, '首页');
  await shot(page, 'home');

  await page.click(tid('game-tile-route'));
  await page.waitForTimeout(400);
  check((await page.evaluate(() => location.hash)) === '#/game/route', '点 game-tile-route 进入 #/game/route');
  check(await exists(page, 'level-btn-0'), '选关页有 level-btn-0');
  const locked = await page.locator(tid('level-btn-1')).getAttribute('data-locked').catch(() => null);
  check(locked === 'true', '第 2 关默认锁住（data-locked="true"）');
  await checkTargets(page, '选关页');
  await shot(page, 'levels');

  await page.click(tid('level-btn-0'));
  await page.waitForTimeout(400);
  check((await page.evaluate(() => location.hash)) === '#/game/route/0', '点 level-btn-0 进入 #/game/route/0');
  for (const id of ['play-area', 'btn-back', 'btn-speak', 'btn-hint']) check(await exists(page, id), `游戏页有 ${id}`);
  await shot(page, 'play-skeleton');
  await page.click(tid('btn-back'));
  await page.waitForTimeout(400);
  check((await page.evaluate(() => location.hash)) === '#/game/route', 'btn-back 回到选关页');

  for (const g of ['mirror', 'rotate', 'cubes']) {
    await go(page, `#/game/${g}/0`);
    check(await exists(page, 'play-area'), `${g} 游戏页能打开`);
  }
  await go(page, '#/badges');
  await page.waitForTimeout(300);
  await shot(page, 'badges');

  // 手机竖屏也不能横向溢出
  const phone = await newPage(browser, base, { width: 390, height: 844 });
  await phone.waitForTimeout(400);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, '手机竖屏首页无横向滚动条');
  await shot(phone, 'home-phone');
  check(page.errors.length === 0 && phone.errors.length === 0, `没有 JS 错误${page.errors.length + phone.errors.length ? '：' + [...page.errors, ...phone.errors].join(' | ') : ''}`);
}

// ---- 各游戏的自动解题 ----
const SOLVERS = {
  async route(page, idx) {
    const sol = await page.evaluate(async (i) => {
      const { solve } = await import('/src/games/route/logic.js');
      const { LEVELS } = await import('/src/games/route/levels.js');
      return solve(LEVELS[i]);
    }, idx);
    for (const d of sol) await page.click(tid(`card-${d}`));
    await page.click(tid('btn-go'));
  },
  async mirror(page, idx) {
    const moves = await page.evaluate(async (i) => {
      const { LEVELS } = await import('/src/games/mirror/levels.js');
      const lv = LEVELS[i];
      const rows = lv.solution.length, cols = lv.solution[0].length;
      const out = [];
      lv.solution.forEach((row, r) => row.forEach((v, c) => {
        const editable = lv.axis === 'vertical' ? c >= cols / 2 : r >= rows / 2;
        if (editable && v > 0) out.push([r, c, v]);
      }));
      return out;
    }, idx);
    for (const [r, c, v] of moves) {
      if (await page.locator(tid(`color-${v}`)).count()) await page.click(tid(`color-${v}`));
      await page.click(tid(`cell-${r}-${c}`));
    }
    await page.click(tid('btn-check'));
  },
  async rotate(page, idx) {
    const info = await page.evaluate(async (i) => {
      const { LEVELS } = await import('/src/games/rotate/levels.js');
      const { rotate, rotationsNeeded } = await import('/src/games/rotate/logic.js');
      const lv = LEVELS[i];
      return lv.mode === 'turn' ? { mode: 'turn', clicks: rotationsNeeded(lv.shape, rotate(lv.shape, lv.turns)) } : { mode: 'choose' };
    }, idx);
    if (info.mode === 'turn') { for (let k = 0; k < info.clicks; k++) { await page.click(tid('btn-rotate')); await page.waitForTimeout(150); } }
    else await page.click('[data-testid^="choice-"][data-answer="true"]');
  },
  async cubes(page) {
    await page.click('[data-testid^="choice-"][data-answer="true"]');
  },
};

async function playLevel(page, game, idx) {
  await go(page, `#/game/${game}/${idx}`);
  if (!(await exists(page, 'play-area'))) return false;
  await page.waitForTimeout(300);
  try { await SOLVERS[game](page, idx); } catch (e) { console.log(`    自动操作失败：${e.message.split('\n')[0]}`); return false; }
  return exists(page, 'success-overlay', 20000);
}

async function scenarioPlay(browser, base, game, all) {
  console.log(`[${all ? 'playall' : 'play'}:${game}]`);
  const page = await newPage(browser, base);
  const n = await page.evaluate(async (g) => (await import(`/src/games/${g}/levels.js`)).LEVELS.length, game);
  const count = all ? n : 1;
  for (let i = 0; i < count; i++) {
    // 模拟已经解锁
    const ok = await playLevel(page, game, i);
    check(ok, `${game} 第 ${i + 1} 关能通关并出现 success-overlay`);
    if (!ok) { await shot(page, `${game}-fail-${i}`); break; }
    if (i === 0) {
      await page.waitForTimeout(1500); // 等弹层动画播完再截图和检查遮挡
      const clickable = await page.evaluate(() => {
        const b = document.querySelector('[data-testid="btn-next"]');
        if (!b) return false;
        const r = b.getBoundingClientRect();
        const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!(e && e.closest('[data-testid="btn-next"]'));
      });
      check(clickable, `${game} 过关弹层的 btn-next 在最上层、能点到`);
      await shot(page, `${game}-success`);
      const saved = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('paw-puzzle:v1')); } catch { return null; } });
      check(saved && saved[game] && saved[game].stars && saved[game].stars[0] >= 1, `${game} 第 1 关星数已写入 localStorage`);
    }
  }
  if (!all) {
    check(await exists(page, 'btn-next'), '过关弹层有 btn-next');
    await page.click(tid('btn-next'));
    await page.waitForTimeout(500);
    check((await page.evaluate(() => location.hash)) === `#/game/${game}/1`, 'btn-next 进入第 2 关');
    await go(page, `#/game/${game}/0`);
    await page.waitForTimeout(400);
    await checkTargets(page, `${game} 游戏页`);
    await shot(page, `${game}-play`);
    // 解锁全部关卡，才能截到最后一关的画面（否则会被跳回选关页）
    await page.evaluate(([g, cnt]) => {
      const d = JSON.parse(localStorage.getItem('paw-puzzle:v1') || '{}');
      d[g] = { ...(d[g] || { stars: {} }), unlocked: cnt };
      localStorage.setItem('paw-puzzle:v1', JSON.stringify(d));
    }, [game, n]);
    await page.reload(); // 应用启动时把进度读进内存，改完 localStorage 要刷新才生效
    await page.waitForTimeout(500);
    await go(page, `#/game/${game}/${n - 1}`);
    await page.waitForTimeout(400);
    await shot(page, `${game}-last`);
  }
  check(page.errors.length === 0, `没有 JS 错误${page.errors.length ? '：' + page.errors.slice(0, 5).join(' | ') : ''}`);
}

// 方向卡和指令槽里的箭头必须互不相同（自动测试按 testid 点击，箭头画错也能通关，所以单独查）
async function scenarioRouteArrows(browser, base) {
  console.log('[route-arrows]');
  const page = await newPage(browser, base);
  await go(page, '#/game/route/0');
  await exists(page, 'card-up');
  const look = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    // 外观 = 去掉颜色后的内部结构 + 所有子元素的计算 transform
    const parts = [el.innerHTML.replace(/#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|currentColor/g, '')];
    for (const n of el.querySelectorAll('*')) parts.push(getComputedStyle(n).transform, n.getAttribute('transform') || '');
    parts.push(getComputedStyle(el).transform);
    return parts.join('|');
  }, sel);
  const dirs = ['up', 'down', 'left', 'right'];
  const cards = await Promise.all(dirs.map((d) => look(tid(`card-${d}`))));
  check(cards.every(Boolean) && new Set(cards).size === 4, '4 张方向卡的箭头朝向互不相同');
  const slots = [];
  for (const d of dirs) {
    await page.click(tid(`card-${d}`));
    await page.waitForTimeout(350);
  }
  for (let i = 0; i < 4; i++) slots.push(await look(tid(`slot-${i}`)));
  check(slots.every(Boolean) && new Set(slots).size === 4, '指令槽里 4 个方向的箭头互不相同');
  await shot(page, 'route-arrows');
  check(page.errors.length === 0, `没有 JS 错误${page.errors.length ? '：' + page.errors.slice(0, 5).join(' | ') : ''}`);
}

// 徽章墙 / 首页星数 / 护眼提醒（任务卡 011）
async function scenarioBadges(browser, base) {
  console.log('[badges]');
  const page = await newPage(browser, base);
  const stars = (n, s) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i, s]));
  const setData = (d) => page.evaluate((x) => localStorage.setItem('paw-puzzle:v1', JSON.stringify(x)), d);
  // route 5 关×3 星，其余各 1 关 → 共 15+2+1+3 = 21 星
  await setData({
    route: { unlocked: 6, stars: stars(5, 3) },
    mirror: { unlocked: 2, stars: { 0: 2 } },
    rotate: { unlocked: 2, stars: { 0: 1 } },
    cubes: { unlocked: 2, stars: { 0: 3 } },
  });
  await page.reload();
  await page.waitForTimeout(500);
  const attr = (id, a) => page.locator(tid(id)).getAttribute(a).catch(() => null);
  check((await attr('game-tile-route', 'data-stars')) === '15', '首页阿奇巡逻卡片 data-stars="15"');
  check((await attr('game-tile-mirror', 'data-stars')) === '2', '首页魔镜卡片 data-stars="2"');
  await page.click(tid('btn-badges'));
  await page.waitForTimeout(500);
  check((await page.evaluate(() => location.hash)) === '#/badges', '点 btn-badges 进入徽章墙');
  const earned = async (pup) => attr(`badge-${pup}`, 'data-earned');
  check((await earned('chase')) === 'true', '阿奇徽章已获得（巡逻过 5 关）');
  check((await earned('skye')) === 'false', '天天徽章未获得（魔镜只过 1 关）');
  check((await earned('zuma')) === 'true', '路马徽章已获得（四个游戏都至少过 1 关）');
  check((await earned('marshall')) === 'false', '毛毛徽章未获得（21 星 < 30）');
  const total = await page.locator(tid('total-stars')).textContent().catch(() => '');
  check(/21/.test(total || ''), `徽章墙显示总星数 21（实际「${(total || '').trim()}」）`);
  await shot(page, 'badges-partial');

  await setData({
    route: { unlocked: 6, stars: stars(5, 3) },
    mirror: { unlocked: 2, stars: { 0: 2 } },
    rotate: { unlocked: 6, stars: stars(5, 3) },
    cubes: { unlocked: 2, stars: { 0: 3 } },
  });
  await page.reload();
  await page.waitForTimeout(500);
  check((await earned('rocky')) === 'true', '灰灰徽章已获得（零件过 5 关）');
  check((await earned('marshall')) === 'true', '毛毛徽章已获得（35 星 ≥ 30）');
  for (const p of ['chase', 'marshall', 'skye', 'rubble', 'rocky', 'zuma']) check(await exists(page, `badge-${p}`, 1000), `徽章墙有 badge-${p}`);
  await checkTargets(page, '徽章墙');
  await shot(page, 'badges-more');

  // 护眼提醒：?break=<秒> 缩短计时，用于测试
  const p2 = await newPage(browser, base);
  await p2.goto(base + '/?break=2#/game/route/0');
  await p2.waitForTimeout(800);
  check(!(await p2.locator(tid('break-overlay')).isVisible().catch(() => false)), '刚开始没有护眼提醒');
  check(await exists(p2, 'break-overlay', 6000), '到时间后弹出护眼提醒 break-overlay');
  await shot(p2, 'break');
  check(await exists(p2, 'btn-break-ok', 1000), '护眼提醒有 btn-break-ok');
  await p2.click(tid('btn-break-ok'));
  await p2.waitForTimeout(600);
  check(!(await p2.locator(tid('break-overlay')).isVisible().catch(() => false)), '点 btn-break-ok 后提醒关闭');
  check(page.errors.length === 0 && p2.errors.length === 0, `没有 JS 错误${page.errors.length + p2.errors.length ? '：' + [...page.errors, ...p2.errors].slice(0, 5).join(' | ') : ''}`);
}

const args = process.argv.slice(2);
if (!args.length) { console.error('用法: node tests/accept/smoke.mjs home | play:<game> | playall:<game> | route-arrows | badges'); process.exit(2); }
const srv = await serve();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ executablePath: CHROME });
try {
  for (const a of args) {
    if (a === 'home') await scenarioHome(browser, base);
    else if (a === 'route-arrows') await scenarioRouteArrows(browser, base);
    else if (a === 'badges') await scenarioBadges(browser, base);
    else if (a.startsWith('play:')) await scenarioPlay(browser, base, a.slice(5), false);
    else if (a.startsWith('playall:')) await scenarioPlay(browser, base, a.slice(8), true);
    else { console.error(`未知场景 ${a}`); failures.push(a); }
  }
} finally {
  await browser.close();
  srv.close();
}
console.log(failures.length ? `\nFAIL ${failures.length} 项` : '\nPASS');
process.exit(failures.length ? 1 : 0);
