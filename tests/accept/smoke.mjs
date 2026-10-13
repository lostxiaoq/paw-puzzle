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

// 正确选项的外观不能和错误选项有任何区别（data-answer 只给自动测试用，孩子不能看出来）
async function answerLeak(page) {
  return page.evaluate(() => {
    const opts = [...document.querySelectorAll('[data-testid^="choice-"]')];
    const right = opts.find((o) => o.dataset.answer === 'true');
    if (!right || opts.length < 2) return [];
    const PROPS = ['border-color', 'border-width', 'border-style', 'background-color', 'background-image', 'box-shadow',
      'outline-color', 'outline-style', 'color', 'opacity', 'filter', 'transform', 'font-weight'];
    const sig = (el) => { const cs = getComputedStyle(el); return Object.fromEntries(PROPS.map((k) => [k, cs.getPropertyValue(k)])); };
    const r = sig(right);
    const diff = new Set();
    for (const o of opts) if (o !== right) { const w = sig(o); for (const k of PROPS) if (w[k] !== r[k]) diff.add(k); }
    return [...diff];
  });
}

async function playLevel(page, game, idx) {
  await go(page, `#/game/${game}/${idx}`);
  if (!(await exists(page, 'play-area'))) return false;
  await page.waitForTimeout(300);
  await page.mouse.move(1, 1); // 上一关点完鼠标还停在选项位置，移开并等悬停过渡收回，避免误报
  await page.waitForTimeout(500);
  const leak = await answerLeak(page);
  check(leak.length === 0, `${game} 第 ${idx + 1} 关正确选项外观与其他选项一致${leak.length ? '（泄露：' + leak.join(', ') + '）' : ''}`);
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

// ---- 配音（任务卡 014）----
// 游戏里说过的每一句话都记在 window.__pawSaid：[{ speaker, text, source: 'file' | 'tts' }]

async function said(page) {
  return page.evaluate(() => (window.__pawSaid || []).map((x) => ({ ...x })));
}

// 每关先按提示、再故意做错一次、再正确通关，尽量把所有台词都触发一遍
const WRONG = {
  async route(page) {
    await page.click(tid('card-up')).catch(() => {});
    await page.click(tid('btn-go')).catch(() => {});
    await page.waitForTimeout(1500);
    await page.click(tid('btn-clear')).catch(() => {});
  },
  async mirror(page) {
    await page.click(tid('btn-check')).catch(() => {});
    await page.waitForTimeout(600);
  },
  async rotate(page) {
    const wrong = page.locator('[data-testid^="choice-"]:not([data-answer="true"])').first();
    if (await wrong.count()) { await wrong.click().catch(() => {}); await page.waitForTimeout(900); }
  },
  async cubes(page) {
    const wrong = page.locator('[data-testid^="choice-"]:not([data-answer="true"])').first();
    if (await wrong.count()) { await wrong.click().catch(() => {}); await page.waitForTimeout(900); }
  },
};

async function scenarioVoiceCoverage(browser, base) {
  console.log('[voice-coverage]');
  const page = await newPage(browser, base);
  await page.waitForTimeout(800);
  for (const game of ['route', 'mirror', 'rotate', 'cubes']) {
    const n = await page.evaluate(async (g) => (await import(`/src/games/${g}/levels.js`)).LEVELS.length, game);
    let ok = 0;
    for (let i = 0; i < n; i++) {
      await go(page, `#/game/${game}/${i}`);
      if (!(await exists(page, 'play-area'))) break;
      await page.waitForTimeout(300);
      await page.click(tid('btn-speak')).catch(() => {});
      await page.click(tid('btn-hint')).catch(() => {});
      await page.waitForTimeout(400);
      await WRONG[game](page);
      try { await SOLVERS[game](page, i); } catch { /* 下面判断 */ }
      if (await exists(page, 'success-overlay', 20000)) ok++;
      else break;
    }
    check(ok === n, `${game} 全部 ${n} 关在「提示 + 做错一次」后仍能通关（${ok}/${n}）`);
  }
  await go(page, '#/badges');
  await page.waitForTimeout(400);
  for (const p of ['chase', 'marshall', 'skye', 'rubble', 'rocky', 'zuma']) await page.click(tid(`badge-${p}`)).catch(() => {});
  await go(page, '#/');
  await page.waitForTimeout(400);
  const before = await said(page);
  // 最后单独触发一次护眼提醒（整页加载会清空记录，所以先把前面的存下来）
  await page.goto(base + '/?break=2#/game/route/0');
  await exists(page, 'break-overlay', 8000);
  await page.click(tid('btn-break-ok')).catch(() => {});
  await page.waitForTimeout(800);
  const all = [...before, ...(await said(page))];
  const { LINES } = await page.evaluate(async () => ({ LINES: (await import('/src/voice/lines.js')).LINES }));
  const known = new Set(LINES.map((l) => `${l.speaker}|${l.text}`));
  const missing = [...new Set(all.map((x) => `${x.speaker}|${x.text}`))].filter((k) => !known.has(k));
  check(all.length >= 100, `录到足够多的朗读（${all.length} 句）`);
  check(missing.length === 0, `说过的每一句都在 src/voice/lines.js 里${missing.length ? '（缺 ' + missing.length + ' 句：' + missing.slice(0, 8).join(' / ') + '）' : ''}`);
  const speakers = new Set(all.map((x) => x.speaker));
  for (const p of ['chase', 'marshall', 'skye', 'rubble', 'rocky']) check(speakers.has(p), `有 ${p} 说的话`);
  const noSpeaker = all.filter((x) => !['chase', 'marshall', 'skye', 'rubble', 'rocky', 'zuma'].includes(x.speaker));
  check(noSpeaker.length === 0, `每一句都标明了是哪只狗狗说的${noSpeaker.length ? '（例如「' + noSpeaker[0].text + '」speaker=' + noSpeaker[0].speaker + '）' : ''}`);
  if (process.env.FORGE_VOICE_REQUIRE_FILES) {
    const tts = all.filter((x) => x.source !== 'file');
    check(tts.length === 0, `全部台词都播放音频文件${tts.length ? '（' + tts.length + ' 句退回系统语音，例如「' + tts[0].text + '」）' : ''}`);
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.writeFileSync(path.join(SHOTS, 'voice-said.json'), JSON.stringify(all, null, 1));
  check(page.errors.length === 0, `没有 JS 错误${page.errors.length ? '：' + page.errors.slice(0, 5).join(' | ') : ''}`);
}

async function scenarioVoicePlay(browser, base) {
  console.log('[voice-play]');
  // 1) 没有音频清单：退回系统语音，不报错
  const p1 = await newPage(browser, base);
  await p1.route('**/audio/voice/manifest.json', (r) => r.fulfill({ status: 404, body: 'nope' }));
  await p1.goto(base + '/?v=1#/game/route/0');
  await p1.waitForTimeout(1200);
  const s1 = await said(p1);
  check(s1.length > 0 && s1.every((x) => x.source === 'tts'), '没有音频清单时退回系统语音（source=tts）');
  check(p1.errors.length === 0, `没有清单时无 JS 错误${p1.errors.length ? '：' + p1.errors.slice(0, 3).join(' | ') : ''}`);

  // 2) 有清单：命中的台词播放 mp3
  const p2 = await newPage(browser, base);
  const fixture = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'voice-fixture.mp3'));
  const target = await p2.evaluate(async () => (await import('/src/voice/lines.js')).LINES);
  const files = Object.fromEntries(target.map((l) => [`${l.speaker}|${l.text}`, 'fixture.mp3']));
  await p2.route('**/audio/voice/manifest.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 1, files }) }));
  await p2.route('**/audio/voice/fixture.mp3', (r) => r.fulfill({ contentType: 'audio/mpeg', body: fixture }));
  await p2.goto(base + '/?v=2#/game/route/0');
  await p2.waitForTimeout(1500);
  await p2.click(tid('btn-speak'));
  await p2.waitForTimeout(800);
  const s2 = await said(p2);
  check(s2.length > 0 && s2.every((x) => x.source === 'file'), `有清单时播放音频文件（source=file，${s2.map((x) => x.source).join(',')}）`);
  const playing = await p2.evaluate(() => window.__pawAudioPlays || 0);
  check(playing >= 1, `确实调用了音频播放（__pawAudioPlays=${playing}）`);
  check(p2.errors.length === 0, `有清单时无 JS 错误${p2.errors.length ? '：' + p2.errors.slice(0, 3).join(' | ') : ''}`);
}

// iPad Safari 兼容：复用单个 audio 元素；play() 被拦截时退回系统语音（任务卡 015）
async function scenarioVoiceIOS(browser, base) {
  console.log('[voice-ios]');
  // 统计页面创建了多少个音频元素、系统语音被调用几次
  const probe = `
    window.__audioCreated = 0; window.__ttsSpeak = 0;
    const A = window.Audio;
    window.Audio = function (...a) { window.__audioCreated++; return new A(...a); };
    window.Audio.prototype = A.prototype;
    const ce = document.createElement.bind(document);
    document.createElement = (t, ...r) => { if (String(t).toLowerCase() === 'audio') window.__audioCreated++; return ce(t, ...r); };
    if (window.speechSynthesis) { const s = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__ttsSpeak++; try { s(u); } catch {} }; }
  `;
  const p1 = await newPage(browser, base);
  await p1.addInitScript(probe);
  await p1.goto(base + '/?ios=1#/');
  await p1.waitForTimeout(1200);
  await p1.click(tid('game-tile-route'));
  await p1.waitForTimeout(500);
  await p1.click(tid('level-btn-0'));
  await p1.waitForTimeout(1200);
  for (let i = 0; i < 4; i++) { await p1.click(tid('btn-speak')); await p1.waitForTimeout(500); }
  const created = await p1.evaluate(() => window.__audioCreated);
  const plays = await p1.evaluate(() => window.__pawAudioPlays || 0);
  check(plays >= 4, `播放了音频（__pawAudioPlays=${plays}）`);
  check(created <= 2, `复用音频元素，没有每句新建一个（创建了 ${created} 个）`);

  // 模拟 iOS 拦截：play() 一律被拒绝
  const p2 = await newPage(browser, base);
  await p2.addInitScript(probe + `
    HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('blocked', 'NotAllowedError')); };
  `);
  await p2.goto(base + '/?ios=2#/game/route/0');
  await p2.waitForTimeout(1500);
  await p2.click(tid('btn-speak'));
  await p2.waitForTimeout(800);
  const tts = await p2.evaluate(() => window.__ttsSpeak);
  check(tts >= 1, `音频被拦截时退回系统语音（speechSynthesis.speak 调用 ${tts} 次）`);
  check(p2.errors.length === 0 && p1.errors.length === 0, `没有 JS 错误或未处理的 Promise 拒绝${[...p1.errors, ...p2.errors].length ? '：' + [...p1.errors, ...p2.errors].slice(0, 3).join(' | ') : ''}`);
}

// iOS 上触屏的 pointerdown 不算用户激活，解锁播放会被拒；必须在后续 touchend/click 上继续尝试（任务卡 015b）
async function scenarioVoiceUnlock(browser, base) {
  console.log('[voice-unlock]');
  const page = await newPage(browser, base);
  await page.addInitScript(`
    window.__blockPlay = true;
    const realPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (window.__blockPlay) return Promise.reject(new DOMException('not a user activation', 'NotAllowedError'));
      return realPlay.call(this);
    };
  `);
  await page.goto(base + '/?unlock=1#/');
  await page.waitForTimeout(1000);
  // 第一次：触屏 pointerdown（iOS 不认），播放被拒
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true })));
  await page.waitForTimeout(300);
  const after1 = await page.evaluate(() => window.__pawAudioUnlocked === true);
  check(!after1, '解锁播放被拒绝时，不能标记为已解锁（__pawAudioUnlocked 仍为 false）');
  // 第二次：touchend（iOS 认），播放成功
  await page.evaluate(() => { window.__blockPlay = false; window.dispatchEvent(new Event('touchend', { bubbles: true })); });
  await page.waitForTimeout(500);
  const after2 = await page.evaluate(() => window.__pawAudioUnlocked === true);
  check(after2, '后续的 touchend 上再次尝试并解锁成功（__pawAudioUnlocked 为 true）');
  // 第三次：再触摸不应重复解锁
  const attemptsBefore = await page.evaluate(() => window.__pawUnlockAttempts || 0);
  await page.evaluate(() => window.dispatchEvent(new Event('touchend', { bubbles: true })));
  await page.waitForTimeout(300);
  const attemptsAfter = await page.evaluate(() => window.__pawUnlockAttempts || 0);
  check(attemptsBefore >= 2 && attemptsAfter === attemptsBefore, `解锁成功后不再重复尝试（尝试次数 ${attemptsBefore} → ${attemptsAfter}）`);
  check(page.errors.length === 0, `没有 JS 错误${page.errors.length ? '：' + page.errors.slice(0, 3).join(' | ') : ''}`);
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
    else if (a === 'voice-coverage') await scenarioVoiceCoverage(browser, base);
    else if (a === 'voice-play') await scenarioVoicePlay(browser, base);
    else if (a === 'voice-ios') await scenarioVoiceIOS(browser, base);
    else if (a === 'voice-unlock') await scenarioVoiceUnlock(browser, base);
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
