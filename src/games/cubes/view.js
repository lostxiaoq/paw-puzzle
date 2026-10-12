// 小砾搭积木：游戏界面（SPEC 3.4 + 任务卡 010）。
// 用等轴测投影画积木堆，投影公式和 logic.js 顶部注释一致：
//   屏幕 x = (col − row) · W / 2
//   屏幕 y = (col + row) · H / 2 − z · H
// 画家算法：先画靠后的（row+col 小），同一格先画低层，再画高层。
// 两种玩法：
//   数一数   → 3 个大数字按钮，答对把积木从下到上闪着数一遍；
//   从前面看 → 3 张平面方格图选项，答对亮出轮廓。
// 屏幕下方画着小砾和「前面」箭头，告诉孩子观察点在哪。
// 只依赖本目录的 logic.js / levels.js 和 art/pups.js，不碰任何全局状态。

import { countCubes, frontHeights, leftHeights, numberChoices } from './logic.js';
import { LEVELS } from './levels.js';
import { pupSVG } from '../../art/pups.js';

// 等轴测的两个基本量（SVG 用户单位，viewBox 会整体缩放）
const W = 56; // 一个顶面菱形的横向全宽
const H = 28; // 一个顶面菱形的纵向全高 = 升高一层的高差

// 小砾的黄色系（SPEC 第 2 节 rubble 主色），三个可见面用它的三种明度
export const CUBE_COLOR = '#f6c20b';

// 「前面」小箭头（↖，从标签指向积木堆前方）
const ARROW_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true">'
  + '<path d="M33 33 L13 13" stroke="#c05621" stroke-width="5" stroke-linecap="round" fill="none"/>'
  + '<path d="M8 20 L8 8 L20 8" stroke="#c05621" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  + '</svg>';

// ———— 小工具 ————
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// 亮度小工具：把 #rrggbb 乘一个系数变亮 / 变暗（rotate 视图同款）
function shade(hex, k) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ============ 等轴测投影 ============

// 世界格 (row, col, z) → 屏幕坐标。z = 抬高层数（1 = 最底下那块的顶面）。
export function isoPoint(row, col, z) {
  return {
    x: (col - row) * (W / 2),
    y: (col + row) * (H / 2) - z * H,
  };
}

// 多边形 points 属性：[[x,y],...] → "x,y x,y ..."
function facePoly(pts) {
  return pts.map((p) => `${p[0]},${p[1]}`).join(' ');
}

// 顶面菱形（中心在 tx,ty）
function diamondPoints(tx, ty) {
  return facePoly([[tx, ty - H / 2], [tx + W / 2, ty], [tx, ty + H / 2], [tx - W / 2, ty]]);
}

// 一块积木（三个可见面：顶面最亮、右面次之、左面最暗，描深色细边）
function cubeSVG(row, col, z, color) {
  const { x: tx, y: ty } = isoPoint(row, col, z + 1); // 顶面中心（这块的第 z+1 层顶）
  const edge = 'rgba(146,98,16,0.5)'; // 深黄棕细边
  const sw = 1.5;
  const sideL = facePoly([[tx - W / 2, ty], [tx, ty + H / 2], [tx, ty + H / 2 + H], [tx - W / 2, ty + H]]);
  const sideR = facePoly([[tx + W / 2, ty], [tx, ty + H / 2], [tx, ty + H / 2 + H], [tx + W / 2, ty + H]]);
  return (
    `<g class="cube" data-cube="${row},${col},${z}">`
    + `<polygon points="${sideL}" fill="${shade(color, 0.66)}" stroke="${edge}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<polygon points="${sideR}" fill="${shade(color, 0.84)}" stroke="${edge}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + `<polygon points="${diamondPoints(tx, ty)}" fill="${color}" stroke="${edge}" stroke-width="${sw}" stroke-linejoin="round"/>`
    + '</g>'
  );
}

// 浅色地板网格：整块菱形地板 + 内部细线
function floorSVG(rows, cols) {
  const pt = (r, c) => {
    const p = isoPoint(r - 0.5, c - 0.5, 0);
    return `${p.x},${p.y}`;
  };
  let s = `<polygon class="floor" points="${[pt(0, 0), pt(0, cols), pt(rows, cols), pt(rows, 0)].join(' ')}"/>`;
  for (let r = 1; r < rows; r++) {
    s += `<line class="floor-line" x1="${pt(r, 0).split(',')[0]}" y1="${pt(r, 0).split(',')[1]}" x2="${pt(r, cols).split(',')[0]}" y2="${pt(r, cols).split(',')[1]}"/>`;
  }
  for (let c = 1; c < cols; c++) {
    s += `<line class="floor-line" x1="${pt(0, c).split(',')[0]}" y1="${pt(0, c).split(',')[1]}" x2="${pt(rows, c).split(',')[0]}" y2="${pt(rows, c).split(',')[1]}"/>`;
  }
  return s;
}

// viewBox：把地板、最高的塔、轮廓注记都装进去
function pileViewBox(h) {
  const rows = h.length;
  const cols = h[0].length;
  const maxH = Math.max(...h.flat());
  const xMin = -(rows * W) / 2;
  const xMax = (cols * W) / 2;
  const yMin = -maxH * H - H / 2; // 最高塔的顶点
  const yMax = ((rows + cols) * H) / 2; // 地板前角
  const pad = 10;
  return `${xMin - pad} ${yMin - pad} ${xMax - xMin + pad * 2} ${yMax - yMin + pad * 2}`;
}

// 「从前面看」的轮廓：在前排平面画出每列高度（黄色虚线幽灵墙，提示 / 答对时亮出）
function frontOutlineSVG(h) {
  const R = h.length - 0.5; // 前排平面（最后一排向前半格）
  const parts = [];
  frontHeights(h).forEach((fc, c) => {
    if (fc <= 0) return;
    const p = (cc, zz) => {
      const q = isoPoint(R, cc, zz);
      return [q.x, q.y];
    };
    parts.push(`<polygon points="${facePoly([p(c, 0), p(c + 1, 0), p(c + 1, fc), p(c, fc)])}"/>`);
  });
  return `<g class="front-outline">${parts.join('')}</g>`;
}

// 画整堆积木 → 完整 <svg> 字符串。
// 画家算法：row+col 从小到大、同格 z 从低到高（后 → 前、下 → 上）。
export function pileSVG(h, { frontOutline = false, color = CUBE_COLOR } = {}) {
  const rows = h.length;
  const cols = h[0].length;
  const cells = [];
  for (let sum = 0; sum <= rows + cols - 2; sum++) {
    for (let r = 0; r < rows; r++) {
      const c = sum - r;
      if (c < 0 || c >= cols) continue;
      for (let z = 0; z < h[r][c]; z++) cells.push([r, c, z]);
    }
  }
  const body = cells.map(([r, c, z]) => cubeSVG(r, c, z, color)).join('');
  const outline = frontOutline ? frontOutlineSVG(h) : '';
  return (
    `<svg class="cubes-svg" data-testid="cubes-svg" viewBox="${pileViewBox(h)}" aria-hidden="true">`
    + floorSVG(rows, cols)
    + outline
    + body
    + '</svg>'
  );
}

// 「从前面看」的选项图：正方形方格平面图，底部对齐。
// heights = 每列高度（列从左到右）。
export function frontSVG(heights, { color = CUBE_COLOR, cell = 26, maxH = 4 } = {}) {
  const w = heights.length * cell;
  const hgt = maxH * cell;
  let rects = '';
  heights.forEach((v, c) => {
    for (let k = 0; k < v; k++) {
      const x = c * cell;
      const y = hgt - (k + 1) * cell; // 底部对齐：从下往上叠
      const fill = k === v - 1 ? color : shade(color, 0.82); // 最上面一块最亮
      rects += `<rect x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" rx="4" fill="${fill}" stroke="rgba(146,98,16,0.5)" stroke-width="2"/>`;
    }
  });
  return `<svg class="cubes-front-svg" viewBox="0 0 ${w} ${hgt}" aria-hidden="true">${rects}</svg>`;
}

// ============ 「从前面看」出题 ============

// 正确答案 frontHeights(h)；干扰项优先级：
//   ① leftHeights(h)（左右看很容易混）
//   ② 正确答案左右翻转
//   ③ 随机某一列 +1 / −1
// 三个选项互不相同、每列高度都在 1–4。返回 { options, answer }（answer 是下标）。
export function makeFrontChoices(h, rng) {
  const answer = frontHeights(h);
  const key = (arr) => arr.join(',');
  const seen = new Set([key(answer)]);
  const wrongs = [];
  const offer = (arr) => {
    if (wrongs.length >= 2) return;
    // 每格 0–4 即可（答案本身可能带空列）；「某列 ±1」策略另外保证被改的列仍在 1–4
    if (!arr.every((v) => v >= 0 && v <= 4) || seen.has(key(arr))) return;
    seen.add(key(arr));
    wrongs.push(arr);
  };
  // ① leftHeights（左右看很容易混）。注意左视的「列数」= 行数，
  //    非方形关卡（行数 ≠ 列数）画出来列数都不一样，一眼假，跳过。
  const left = leftHeights(h);
  if (left.length === answer.length) offer(left);
  offer([...answer].reverse());
  // 单列 ±1 的所有候选先洗牌，让每关「被打的列」不一样
  const flips = [];
  answer.forEach((v, c) => {
    if (v + 1 <= 4) flips.push(answer.map((x, j) => (j === c ? x + 1 : x)));
    if (v - 1 >= 1) flips.push(answer.map((x, j) => (j === c ? x - 1 : x)));
  });
  for (let i = flips.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [flips[i], flips[j]] = [flips[j], flips[i]];
  }
  for (const f of flips) offer(f);
  // 兜底（关卡数据都验证过到不了这里）：放宽限制也必须凑够 3 个不同选项
  let bump = 1;
  while (wrongs.length < 2) {
    const hi = answer.indexOf(Math.max(...answer));
    const arr = answer.map((x, j) => (j === hi ? x + bump : x));
    if (!seen.has(key(arr))) {
      seen.add(key(arr));
      wrongs.push(arr);
    }
    bump += 1;
  }
  // 正确答案 + 两个干扰项一起洗牌，决定正确项落在第几个按钮上
  const options = [answer, ...wrongs];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answer: options.findIndex((o) => key(o) === key(answer)) };
}

// ============ 样式按需插入 ============
let styleReady = false;
function ensureStyle() {
  if (styleReady || document.getElementById('cubes-style')) {
    styleReady = true;
    return;
  }
  styleReady = true;
  const link = document.createElement('link');
  link.id = 'cubes-style';
  link.rel = 'stylesheet';
  link.href = './styles/cubes.css';
  document.head.appendChild(link);
}

// ============ 挂载 ============

export function mount(container, ctx) {
  ensureStyle();
  // main.js 的 ctx.level 恒为 null，关卡数据自己按关卡号取
  const level = LEVELS[ctx.levelIndex] || LEVELS[0];
  const h = level.heights;
  const total = countCubes(h);

  // ———— 状态 ————
  let finished = false; // 本关已过关
  let disposed = false; // 已离开本页
  let hintBusy = false; // 拆开动画播放中（防连点）
  const locked = new Set(); // 已点错的选项（变灰不能再点）
  const timers = new Set();
  const cubeEls = new Map(); // "r,c,z" → 该积木的 <g>
  // 带“离场保险”的 setTimeout：页面切走后回调不再执行
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!disposed) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  // ———— 积木堆舞台 ————
  const stage = el('<div class="cubes-stage"></div>');
  const board = el('<div class="cubes-board"></div>');
  board.innerHTML = pileSVG(h, { frontOutline: level.mode === 'front' });
  board.querySelectorAll('g[data-cube]').forEach((g) => cubeEls.set(g.dataset.cube, g));
  const outlineG = board.querySelector('.front-outline');

  // 小砾 + 「前面」标签：告诉孩子站在哪边看
  const tag = el(`<div class="cubes-front-tag">${ARROW_SVG}<span>前面</span></div>`);
  const pup = el(`<div class="cubes-pup">${pupSVG('rubble', { size: 72 })}</div>`);
  board.appendChild(tag);
  board.appendChild(pup);
  stage.appendChild(board);

  // ———— 下方 3 个大选项 ————
  const choices = el('<div class="cubes-choices" role="group" aria-label="选答案"></div>');
  if (level.mode === 'count') {
    numberChoices(total, Math.random).forEach((v, i) => {
      const right = v === total;
      const b = el(
        `<button class="cubes-choice" data-testid="choice-${i}"`
        + `${right ? ' data-answer="true"' : ''} aria-label="选 ${v} 块">`
        + `<span class="cubes-num">${v}</span></button>`,
      );
      b.addEventListener('click', () => pick(i, b, right));
      choices.appendChild(b);
    });
  } else {
    const { options, answer } = makeFrontChoices(h, Math.random);
    options.forEach((hts, i) => {
      const b = el(
        `<button class="cubes-choice" data-testid="choice-${i}"`
        + `${i === answer ? ' data-answer="true"' : ''} aria-label="第 ${i + 1} 个样子"></button>`,
      );
      b.innerHTML = frontSVG(hts);
      b.addEventListener('click', () => pick(i, b, i === answer));
      choices.appendChild(b);
    });
  }
  stage.appendChild(choices);
  container.appendChild(stage);

  // ———— 点选项 ————
  function pick(i, btn, right) {
    if (finished || disposed || locked.has(i)) return;
    if (right) {
      finished = true;
      ctx.sfx('tap');
      btn.classList.add('is-win');
      if (level.mode === 'count') celebrateCount();
      else celebrateFront();
      return;
    }
    // 答错：按钮变灰 + 轻轻提醒（不惩罚，换个再试）
    ctx.fail(); // 外框播 oops 音效并计数
    locked.add(i);
    btn.classList.add('is-dim');
    btn.disabled = true;
    later(() => ctx.say('再数一数，别忘了下面藏着的积木'), 300);
  }

  // 答对（数一数）：积木从下到上依次闪一下，数出声「1、2、3……」
  // 超过 10 块时数快一点（每块 250ms），数完再过关。
  function celebrateCount() {
    const speed = total > 10 ? 250 : 400;
    const list = [...cubeEls.values()]; // Map 的插入顺序 = 画家顺序 = 从下到上、从后到前
    list.forEach((g, i) => {
      if (typeof g.animate === 'function') {
        g.animate(
          [{ filter: 'brightness(1)' }, { filter: 'brightness(1.9)' }, { filter: 'brightness(1)' }],
          { duration: 230, delay: i * speed, easing: 'ease-in-out' },
        );
      }
      later(() => ctx.say(String(i + 1)), i * speed); // 数出声
    });
    const end = list.length * speed;
    later(() => ctx.say(`一共 ${total} 块积木！`), end + 150);
    later(() => {
      if (!disposed) ctx.complete();
    }, end + 950);
  }

  // 答对（从前面看）：亮出轮廓让孩子对照一下，再过关
  function celebrateFront() {
    if (outlineG) outlineG.classList.add('is-on');
    ctx.say('看！从前面看就是这个样子！');
    later(() => {
      if (!disposed) ctx.complete();
    }, 850);
  }

  // ———— 提示（外框的 💡 按钮）————
  // 数一数：把积木堆轻轻「拆开」0.8 秒（每列向上错开）再合上，露出藏着的积木。
  function hintExplode() {
    if (hintBusy) return;
    hintBusy = true;
    ctx.say('呼——把积木轻轻拆开，藏在下面的也要数哦');
    for (const [key, g] of cubeEls) {
      const [r, c, z] = key.split(',').map(Number);
      const above = h[r][c] - 1 - z; // 头顶上还压着几块
      g.style.transitionDelay = `${c * 45}ms`; // 每列向上错开
      g.style.transform = `translate(0px, ${-(above + 1) * 13}px)`;
    }
    later(() => {
      for (const g of cubeEls.values()) g.style.transform = '';
      later(() => {
        for (const g of cubeEls.values()) g.style.transitionDelay = '';
        hintBusy = false;
      }, 520);
    }, 800); // 拆开停 0.8 秒再合上
  }

  // 从前面看：在积木堆前面亮出每一列的轮廓线
  function hintOutline() {
    if (!outlineG) return;
    outlineG.classList.add('is-on');
    ctx.say('看！黄色虚线就是从前面看到的轮廓');
    later(() => {
      if (!finished) outlineG.classList.remove('is-on');
    }, 2200);
  }

  ctx.onHint(() => {
    if (finished || disposed) return;
    if (level.mode === 'count') hintExplode();
    else hintOutline();
  });

  // ———— 进入关卡的说明 ————
  // main.js 挂载后会先说「第 N 关开始啦」，等它说完再换成玩法说明
  const instr = level.mode === 'count'
    ? '小砾搭了一座积木，一共用了几块？'
    : '站在小砾那边看，积木是什么样子的？';
  later(() => ctx.setInstruction(instr), 1700);

  // ———— 卸载 ————
  return () => {
    disposed = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    ctx.onHint(null);
    stage.remove();
  };
}
