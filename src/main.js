// 应用入口：根据路由渲染页面。
// 页面骨架（顶栏 / play-area / 过关弹层）由这里统一负责，
// 各游戏的 view 只往 #play-area 里画内容（SPEC 第 4 节）。

import { parseRoute, toHash, watch } from './core/router.js';
import { createStore } from './core/storage.js';
import { starsFor } from './core/scoring.js';
import { say } from './core/speech.js';
import { play } from './core/sfx.js';
import { PUPS, pupSVG } from './art/pups.js';
import { GAMES } from './games/registry.js';

const store = createStore();

// ———— 小工具 ————
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
const stars = (n) => '⭐'.repeat(n);

// 每只狗狗主页面的浅色底（主色的淡色版，卡片 / 徽章墙用）
const PUP_TINT = {
  chase: '#e3edfb',
  marshall: '#ffe1e1',
  skye: '#ffe4ef',
  rubble: '#fdf3d8',
  rocky: '#e2f2e4',
  zuma: '#ffeeda',
};
const tintOf = (pupId) => PUP_TINT[pupId] || '#f2f2f7';

// 狗狗主色的深色版（标题字色用，浅色底上看得清）
function shade(hex, k) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#444';
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ———— 视图切换 ————
let unmount = null; // 当前页面的清理函数

function setView(node, um) {
  if (unmount) {
    try {
      unmount();
    } catch (e) {
      console.warn('unmount 出错（忽略）', e);
    }
  }
  document.getElementById('app').replaceChildren(node);
  unmount = um || null;
}

// ============ 首页 ============
function renderHome() {
  const page = el(`<div class="page page-home"></div>`);

  // 顶部：标题 + 毛毛打招呼
  const head = el(`
    <header class="home-head">
      <div class="home-mascot" aria-hidden="true"></div>
      <div>
        <h1 class="home-title">汪汪队空间大冒险</h1>
        <p class="home-sub">快挑一个游戏，和狗狗们一起动脑筋！</p>
      </div>
    </header>
  `);
  head.querySelector('.home-mascot').innerHTML = pupSVG('marshall', { size: 130, mood: 'happy' });
  page.appendChild(head);

  // 4 张游戏卡片（底色 = 主持狗狗主色的浅色版）
  const grid = el(`<div class="home-grid"></div>`);
  for (const g of GAMES) {
    const gained = Object.values(store.getProgress(g.id).stars).reduce((a, b) => a + b, 0);
    const tile = el(`
      <button class="tile" data-testid="game-tile-${g.id}" data-hash="${toHash({ name: 'levels', gameId: g.id })}" style="background:${tintOf(g.pup)}">
        <span class="tile-pup"></span>
        <span class="tile-title">${g.title}</span>
        <span class="tile-stars">${gained > 0 ? stars(gained) : '还没玩过'}</span>
      </button>
    `);
    tile.querySelector('.tile-pup').innerHTML = pupSVG(g.pup, { size: 96 });
    grid.appendChild(tile);
  }
  grid.addEventListener('click', (ev) => {
    const tile = ev.target.closest('.tile');
    if (!tile) return;
    play('tap');
    location.hash = tile.dataset.hash;
  });
  page.appendChild(grid);

  // 右上角：徽章墙按钮
  const badges = el(`
    <button class="btn btn-round corner-btn" data-testid="btn-badges" title="徽章墙" aria-label="徽章墙">🏅</button>
  `);
  badges.addEventListener('click', () => {
    play('tap');
    location.hash = toHash({ name: 'badges' });
  });
  page.appendChild(badges);

  setView(page);
  say('欢迎来到汪汪队空间大冒险！选一个游戏吧');
}

// ============ 选关页 ============
function renderLevels(game) {
  const pup = PUPS.find((p) => p.id === game.pup);
  const progress = store.getProgress(game.id);
  const page = el(`<div class="page page-levels"></div>`);

  // 顶栏：返回 + 狗狗 + 游戏名
  const top = el(`
    <header class="levels-head">
      <button class="btn btn-round" data-testid="btn-back-home" title="返回首页" aria-label="返回首页">🏠</button>
      <div class="levels-pup"></div>
      <h1 class="levels-title">${game.title}</h1>
    </header>
  `);
  top.querySelector('.levels-pup').innerHTML = pupSVG(pup.id, { size: 76 });
  top.querySelector('[data-testid="btn-back-home"]').addEventListener('click', () => {
    play('tap');
    location.hash = toHash({ name: 'home' });
  });
  page.appendChild(top);

  // 关卡按钮：爪印圆钮，显示星星；没解锁的显示 🔒 点不动
  const grid = el(`<div class="levels-grid"></div>`);
  for (let i = 0; i < game.levelCount; i++) {
    const locked = i >= progress.unlocked;
    const gained = progress.stars[i] || 0;
    const btn = el(`
      <button class="level-btn ${locked ? 'is-locked' : ''}"
        data-testid="level-btn-${i}"
        ${locked ? 'data-locked="true"' : ''}
        aria-label="第 ${i + 1} 关${locked ? '（还没解锁）' : ''}${gained ? `，${gained} 颗星` : ''}">
        ${locked ? '<span class="level-lock">🔒</span>' : `<span class="level-num">${i + 1}</span>`}
        <span class="level-stars">${gained > 0 ? '⭐'.repeat(gained) : ''}</span>
      </button>
    `);
    if (locked) {
      btn.disabled = true; // 锁住的点击无效
    } else {
      btn.addEventListener('click', () => {
        play('tap');
        location.hash = toHash({ name: 'play', gameId: game.id, level: i });
      });
    }
    grid.appendChild(btn);
  }
  page.appendChild(grid);

  setView(page);
  say(`${game.title}，一共有 ${game.levelCount} 关。选一个亮着的关卡吧！`);
}

// ============ 游戏页外框 ============
async function renderPlay(game, levelIndex) {
  // 还没解锁的关卡：直接回选关页
  const progress = store.getProgress(game.id);
  if (levelIndex >= progress.unlocked) {
    location.replace(toHash({ name: 'levels', gameId: game.id }));
    return;
  }

  const pup = PUPS.find((p) => p.id === game.pup);
  const page = el(`<div class="page page-play"></div>`);

  // 顶栏：返回 / 关卡号 / 🔊 重听 / 💡 提示
  const top = el(`
    <header class="play-head">
      <button class="btn btn-round" data-testid="btn-back" title="回到选关" aria-label="回到选关">🏠</button>
      <div class="play-title">第 ${levelIndex + 1} 关 · ${game.title}</div>
      <button class="btn btn-round" data-testid="btn-speak" title="再说一遍" aria-label="再说一遍">🔊</button>
      <button class="btn btn-round" data-testid="btn-hint" title="提示" aria-label="提示">💡</button>
    </header>
  `);
  const hintBtn = top.querySelector('[data-testid="btn-hint"]');
  page.appendChild(top);

  // 游戏区域（view 画在这里）
  const area = el(`<div class="play-area" id="play-area" data-testid="play-area"></div>`);
  page.appendChild(area);

  // 过关弹层（默认隐藏）
  const overlay = el(`
    <div class="success-overlay" data-testid="success-overlay" hidden>
      <div class="success-card">
        <div class="success-pup"></div>
        <div class="success-stars"></div>
        <button class="btn btn-big" data-testid="btn-next">下一关 ▶</button>
      </div>
    </div>
  `);
  overlay.querySelector('.success-pup').innerHTML = pupSVG(pup.id, { size: 140, mood: 'happy' });
  page.appendChild(overlay);

  // ———— ctx：给 view 用的能力（SPEC 第 4 节） ————
  let instruction = '';
  let fails = 0;
  let hintFn = null;
  let finished = false;
  const viewUnmount = { fn: null };

  const ctx = {
    gameId: game.id,
    levelIndex,
    level: null,
    pup,
    setInstruction(text) {
      instruction = String(text ?? '');
      say(instruction);
    },
    say(text) {
      say(String(text ?? ''));
    },
    sfx(name) {
      play(name);
    },
    fail() {
      fails += 1;
      play('oops');
      if (fails >= 2) hintBtn.classList.add('hint-blink');
    },
    onHint(fn) {
      hintFn = typeof fn === 'function' ? fn : null;
    },
    complete() {
      if (finished) return;
      finished = true;
      const earned = starsFor(fails + 1);
      store.completeLevel(game.id, levelIndex, earned);
      play('success');
      showSuccess(earned);
    },
  };

  // 顶栏按钮
  top.querySelector('[data-testid="btn-back"]').addEventListener('click', () => {
    play('tap');
    location.hash = toHash({ name: 'levels', gameId: game.id });
  });
  top.querySelector('[data-testid="btn-speak"]').addEventListener('click', () => {
    play('tap');
    say(instruction); // 只重读最近一次指令
  });
  hintBtn.addEventListener('click', () => {
    play('tap');
    if (hintFn) hintFn();
  });

  // ———— 过关弹层 ————
  const PRAISES = [
    '太棒了！',
    '真厉害！',
    '你真聪明！',
    '哇，做对啦！',
    '狗狗为你欢呼！',
  ];

  function showSuccess(earnedStars) {
    // 星星逐颗弹出，每颗配 star 音效
    const starsBox = overlay.querySelector('.success-stars');
    for (let i = 0; i < 3; i++) {
      const s = el(`<span class="pop-star">${i < earnedStars ? '⭐' : '☆'}</span>`);
      starsBox.appendChild(s);
    }
    const earned = starsBox.children;
    for (let i = 0; i < earnedStars; i++) {
      setTimeout(() => {
        earned[i].classList.add('is-on');
        play('star');
      }, 350 + i * 450);
    }
    overlay.hidden = false;

    // 最后一关：按钮改成回选关页
    const isLast = levelIndex >= game.levelCount - 1;
    const nextBtn = overlay.querySelector('[data-testid="btn-next"]');
    if (isLast) {
      nextBtn.textContent = '回到选关 🏠';
      nextBtn.addEventListener('click', () => {
        play('tap');
        location.hash = toHash({ name: 'levels', gameId: game.id });
      });
    } else {
      nextBtn.addEventListener('click', () => {
        play('tap');
        location.hash = toHash({ name: 'play', gameId: game.id, level: levelIndex + 1 });
      });
    }
    say(PRAISES[Math.floor(Math.random() * PRAISES.length)]);
  }

  // ———— 先把外框挂上页面，再异步加载游戏 view ————
  setView(page, () => {
    if (viewUnmount.fn) {
      try {
        viewUnmount.fn();
      } catch (e) {
        console.warn('view unmount 出错（忽略）', e);
      }
      viewUnmount.fn = null;
    }
  });

  try {
    const mod = await game.load();
    // 等待期间路由可能已经切走（area 被换掉），那就别往旧容器里画了
    if (!area.isConnected) return;
    viewUnmount.fn = mod.mount(area, ctx) || null;
  } catch (err) {
    console.error('游戏加载失败', err);
    area.textContent = '哎呀，游戏走丢了…';
  }

  ctx.setInstruction(`第 ${levelIndex + 1} 关开始啦！`);
}

// ============ 徽章墙（简单版，详细功能后续任务做） ============
function renderBadges() {
  const total = store.totalStars();
  const page = el(`<div class="page page-badges"></div>`);

  const head = el(`
    <header class="badges-head">
      <button class="btn btn-round" data-testid="btn-back-home" title="返回首页" aria-label="返回首页">🏠</button>
      <h1 class="badges-title">我的徽章墙</h1>
      <div class="badges-total">总共 <b>${total}</b> 颗 ⭐</div>
    </header>
  `);
  head.querySelector('[data-testid="btn-back-home"]').addEventListener('click', () => {
    play('tap');
    location.hash = toHash({ name: 'home' });
  });
  page.appendChild(head);

  // 6 只狗狗排成一排
  const row = el(`<div class="badges-row"></div>`);
  for (const pup of PUPS) {
    const card = el(`
      <div class="badge-card" style="background:${tintOf(pup.id)}">
        <div class="badge-pup"></div>
        <div class="badge-name">${pup.name}</div>
      </div>
    `);
    card.querySelector('.badge-pup').innerHTML = pupSVG(pup.id, { size: 90 });
    row.appendChild(card);
  }
  page.appendChild(row);

  setView(page);
  say(`这是你的徽章墙！你已经有 ${total} 颗星星啦。`);
}

// ============ 路由分发 ============
function navigate(route) {
  if (route.name === 'levels') {
    const game = GAMES.find((g) => g.id === route.gameId);
    if (game) {
      renderLevels(game);
      return;
    }
  }
  if (route.name === 'play') {
    const game = GAMES.find((g) => g.id === route.gameId);
    if (game) {
      renderPlay(game, route.level); // 异步，内部会自己校验解锁
      return;
    }
  }
  if (route.name === 'badges') {
    renderBadges();
    return;
  }
  renderHome();
}

// 启动：监听 hash 路由
watch(navigate);

