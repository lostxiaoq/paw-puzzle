// 天天的魔镜：游戏界面（SPEC 3.2 + 任务卡 008）。
// 左边（平板横屏）或上面（手机竖屏）是带魔镜线的网格，
// 右边（或下面）是色板 + 「检查」按钮。
// 给出一半已经涂好色不能点，孩子在另一半照镜子涂色。
// 只依赖本目录的 logic.js / levels.js 和 art/pups.js，不碰全局状态。

import { diffCells, givenHalf } from './logic.js';
import { LEVELS } from './levels.js';
import { pupSVG } from '../../art/pups.js';

// 格子之间的缝（px）。CSS 里 .mirror-grid 的 gap 必须和它一致。
const GAP = 6;

// ———— 小工具 ————
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// 镜子另一侧的对应格子：竖线 = 同一行左右对称；横线 = 同一列上下对称。
// 提示功能用它找到「应该一起闪」的两个格子。
export function mirrorOf(level, r, c) {
  const rows = level.solution.length;
  const cols = level.solution[0].length;
  return level.axis === 'vertical'
    ? { r, c: cols - 1 - c }
    : { r: rows - 1 - r, c };
}

// 本游戏的样式文件（styles/mirror.css）按需插入一次
let styleReady = false;
function ensureStyle() {
  if (styleReady || document.getElementById('mirror-style')) {
    styleReady = true;
    return;
  }
  styleReady = true;
  const link = document.createElement('link');
  link.id = 'mirror-style';
  link.rel = 'stylesheet';
  link.href = './styles/mirror.css';
  document.head.appendChild(link);
}

// ============ 挂载 ============
export function mount(container, ctx) {
  ensureStyle();
  // main.js 的 ctx.level 恒为 null，关卡数据自己按关卡号取
  const level = LEVELS[ctx.levelIndex] || LEVELS[0];
  const rows = level.solution.length;
  const cols = level.solution[0].length;
  const colors = level.colors;

  // ———— 状态 ————
  // grid 是孩子面前的画板：开局 = givenHalf（一半有颜色，一半全空）
  let grid = givenHalf(level).map((row) => [...row]);
  let current = 1;    // 当前选中的颜色编号（从 1 开始）
  let finished = false; // 本关已过关
  let disposed = false; // 已离开本页
  const timers = new Set();
  // 带“离场保险”的 setTimeout：页面切走后回调不再执行
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // ———— 网格 ————
  const stage = el('<div class="mirror-stage"></div>');
  const boardBox = el('<div class="mirror-board-box"></div>');
  // 天天从线头探出去，这里按天线预留一块边距，探出部分就不会把页面撑出滚动条
  const wrap = el(`<div class="mirror-wrap mirror-axis-${level.axis}"></div>`);
  const gridEl = el('<div class="mirror-grid"></div>');
  gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, var(--cell))`;

  // 把格子的颜色画到元素上（v = 0 表示空）
  function paintCellEl(cell, v) {
    cell.classList.toggle('is-painted', v > 0);
    cell.style.background = v > 0 ? colors[v - 1] : '';
  }
  // 涂色时的小弹跳
  function popIn(cell) {
    if (typeof cell.animate === 'function') {
      cell.animate(
        [{ transform: 'scale(0.72)' }, { transform: 'scale(1)' }],
        { duration: 170, easing: 'ease-out' },
      );
    }
  }

  // 开局摆好所有格子：给出的一半锁住，另一半可以点
  const cellEls = []; // 下标 = r * cols + c
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const editable = level.axis === 'vertical' ? c >= cols / 2 : r >= rows / 2;
      const cell = el(
        `<button class="mirror-cell${editable ? '' : ' is-given'}"`
        + ` data-testid="cell-${r}-${c}"`
        + `${editable ? '' : ' disabled'}`
        + ` aria-label="第 ${r + 1} 行第 ${c + 1} 格${editable ? '' : '（已经涂好）'}"></button>`,
      );
      paintCellEl(cell, grid[r][c]);
      if (editable) {
        cell.addEventListener('click', () => tapCell(r, c, cell));
      }
      cellEls.push(cell);
      gridEl.appendChild(cell);
    }
  }

  // ———— 魔镜线 + 站在线头的天天 ————
  const line = el(`<div class="mirror-line mirror-line-${level.axis}"><i class="mirror-line-spark"></i></div>`);
  const pup = el(`<div class="mirror-pup mirror-pup-${level.axis}">${pupSVG('skye', { size: 64 })}</div>`);
  wrap.appendChild(gridEl);
  wrap.appendChild(line);
  wrap.appendChild(pup);
  boardBox.appendChild(wrap);

  // ———— 操作区：色板 + 检查 ————
  const side = el('<div class="mirror-side"></div>');
  const palette = el('<div class="mirror-palette" role="group" aria-label="选颜色"></div>');
  const colorBtns = [];
  colors.forEach((hex, i) => {
    const b = el(
      `<button class="mirror-color${i === 0 ? ' is-active' : ''}"`
      + ` data-testid="color-${i + 1}" style="background:${hex}"`
      + ` aria-label="第 ${i + 1} 种颜色"></button>`,
    );
    b.addEventListener('click', () => {
      if (finished || disposed) return;
      current = i + 1;
      ctx.sfx('tap');
      refreshPalette();
    });
    colorBtns.push(b);
    palette.appendChild(b);
  });
  function refreshPalette() {
    colorBtns.forEach((b, i) => b.classList.toggle('is-active', i + 1 === current));
  }
  side.appendChild(palette);

  const checkBtn = el('<button class="mirror-check" data-testid="btn-check">检查 ✔</button>');
  checkBtn.addEventListener('click', doCheck);
  side.appendChild(checkBtn);

  stage.appendChild(boardBox);
  stage.appendChild(side);
  container.appendChild(stage);

  // ———— 点格子：空→涂色；同色→擦掉；别的颜色→换色 ————
  function tapCell(r, c, cell) {
    if (finished || disposed) return;
    clearHint();
    ctx.sfx('tap');
    const v = grid[r][c];
    grid[r][c] = v === current ? 0 : current;
    paintCellEl(cell, grid[r][c]);
    if (grid[r][c] > 0) popIn(cell);
  }

  // ———— 检查 ————
  let wrongTimer = 0;
  function clearWrong() {
    if (wrongTimer) {
      clearTimeout(wrongTimer);
      wrongTimer = 0;
    }
    for (const cell of cellEls) cell.classList.remove('is-wrong');
  }

  function doCheck() {
    if (finished || disposed) return;
    clearHint();
    clearWrong();
    const wrong = diffCells(grid, level.solution);
    if (wrong.length === 0) {
      // 全对：整个图案闪一下，天天夸孩子，然后交给外框算星过关
      finished = true;
      ctx.sfx('tap');
      wrap.classList.add('is-win');
      ctx.say(`你画出了一个 ${level.name}！`);
      later(() => ctx.complete(), 750); // 稍等闪光播完再弹过关
      return;
    }
    // 有错：错的格子轻轻抖动闪烁 1 秒（不永久标红），然后擦掉标记
    for (const { r, c } of wrong) cellEls[r * cols + c].classList.add('is-wrong');
    wrongTimer = later(clearWrong, 1000);
    ctx.fail(); // 外框播 oops 音效并计数
    ctx.say('有几个格子不太对，再看看镜子');
  }

  // ———— 提示（外框的 💡 按钮）————
  // 随机挑一个还没涂对的格子，让它和镜子另一侧的对应格子同时闪 3 次。
  let hintTimer = 0;
  function clearHint() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = 0;
    }
    for (const cell of cellEls) cell.classList.remove('is-hint');
    checkBtn.classList.remove('is-hint');
  }
  function showHint() {
    if (finished || disposed) return;
    clearHint();
    const wrong = diffCells(grid, level.solution);
    if (wrong.length === 0) {
      // 全涂对了？那就闪「检查」按钮，提醒孩子按下去
      checkBtn.classList.add('is-hint');
      hintTimer = later(() => checkBtn.classList.remove('is-hint'), 1600);
      return;
    }
    const pick = wrong[Math.floor(Math.random() * wrong.length)];
    const mate = mirrorOf(level, pick.r, pick.c);
    cellEls[pick.r * cols + pick.c].classList.add('is-hint');
    cellEls[mate.r * cols + mate.c].classList.add('is-hint');
    ctx.say('看看一起发光的两个格子');
    hintTimer = later(clearHint, 1600); // 动画 0.5 秒 × 3 次
  }
  ctx.onHint(showHint);

  // ———— 尺寸自适应：横屏左右分栏按可用空间算格子，竖屏占满宽度 ————
  function layout() {
    if (disposed) return;
    // 任务卡 013-2：board-box 收缩为内容大小，空间要量整条 stage 的
    const rect = stage.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    let cell;
    if (window.innerWidth > 700) {
      // 横屏：可用高 = stage 高；可用宽 = stage 宽 - 工具栏宽 - 间隙
      // （stage 居中时，两侧 auto margin 就是留给工具栏 + 间隙的）
      const gap = parseFloat(getComputedStyle(stage).columnGap) || 26;
      const axisPad = level.axis === 'horizontal' ? 40 : 0;
      const fromH = Math.floor((rect.height - (level.axis === 'vertical' ? 40 : 0)) / rows);
      const fromW = Math.floor((rect.width - side.offsetWidth - gap - 16 - axisPad - (cols - 1) * GAP) / cols);
      cell = Math.max(30, Math.min(120, fromH, fromW));
    } else {
      // 竖屏：网格占满宽度（两侧各留 8px，横线镜子时天天从左边探进来另留 40px）
      cell = Math.floor((rect.width - 16 - (level.axis === 'horizontal' ? 40 : 0) - (cols - 1) * GAP) / cols);
      cell = Math.max(30, Math.min(120, cell));
    }
    // 小网格（4×4 及以下）在平板上能放大到 120px，8×8 也比以前更大
    wrap.style.setProperty('--cell', `${cell}px`);
    wrap.style.width = `${cols * cell + (cols - 1) * GAP}px`;
    wrap.style.height = `${rows * cell + (rows - 1) * GAP}px`;
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
  if (ro) ro.observe(boardBox);
  window.addEventListener('resize', layout);
  const raf = requestAnimationFrame(layout);

  // ———— 进入关卡的说明 ————
  // main.js 挂载后会先说「第 N 关开始啦」，等它说完再换成玩法说明
  const instr = level.axis === 'vertical'
    ? '天天的魔镜坏了一半，帮她把另一边涂成一模一样，像照镜子一样！'
    : '这次镜子是横着的哦，上面和下面要一样';
  later(() => ctx.setInstruction(instr), 1600);

  // ———— 卸载 ————
  return () => {
    disposed = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    clearHint();
    clearWrong();
    if (ro) ro.disconnect();
    window.removeEventListener('resize', layout);
    cancelAnimationFrame(raf);
    ctx.onHint(null);
    stage.remove();
  };
}
