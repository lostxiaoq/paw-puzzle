// 灰灰修零件：游戏界面（SPEC 3.3 + 任务卡 009）。
// 上方是「影子」目标（转一转）或原零件（找一找），下方是操作区：
// 转一转 = 零件 + 大大的 ⟳ 按钮；找一找 = 3 张选项卡片。
// 零件全部用 SVG 画成立体感的小方块（格子之间留细缝），颜色取关卡的 color。
// 只依赖本目录的 logic.js / levels.js 和 art/pups.js，不碰任何全局状态。

import { rotate, sameShape, rotationsNeeded, makeChoices } from './logic.js';
import { LEVELS } from './levels.js';
import { pupSVG } from '../../art/pups.js';
import { LINES_ROTATE } from '../../voice/lines.js';

// 格子之间的细缝（占格子边长的比例）
const GAP = 0.1;

// 转一转 / 找一找关卡的 id 顺序（和 levels.js 一致，也和 lines.js 里的台词顺序一致）
const TURN_ORDER = ['rotate-1', 'rotate-2', 'rotate-3', 'rotate-4', 'rotate-5', 'rotate-10', 'rotate-12', 'rotate-14'];
const CHOOSE_ORDER = ['rotate-6', 'rotate-7', 'rotate-8', 'rotate-9', 'rotate-11', 'rotate-13', 'rotate-15'];

// ———— 小工具 ————
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ============ SVG：立体感的方块零件 ============

// 一个立体小方块：顶面亮、侧壁暗，看起来鼓鼓的像积木。
// 坐标以「单位格」计（每格 1×1），调用方用 viewBox 缩放到任意大小。
// top / front 是两个亮度不同的颜色；inset 用来画格子上开的小凹槽。
function cubeCell(x, y, top, front) {
  const g = GAP / 2; // 单侧缝
  const t = 0.16; // 立体厚度（占格子边长）
  const l = x + g;
  const w = 1 - GAP;
  const topH = 1 - GAP - t;
  // 顶面（关卡原色）+ 下侧壁（暗一档）+ 一条高光，立体感来自「上亮下暗」
  return (
    `<rect x="${l}" y="${y + g}" width="${w}" height="${topH}" rx="0.08" fill="${top}" stroke="rgba(0,0,0,.22)" stroke-width="0.035"/>`
    + `<rect x="${l}" y="${y + g + topH}" width="${w}" height="${t}" rx="0.04" fill="${front}" stroke="rgba(0,0,0,.22)" stroke-width="0.03"/>`
    + `<rect x="${l + 0.07}" y="${y + g + 0.07}" width="${w - 0.14}" height="0.13" rx="0.065" fill="#ffffff" opacity="0.4"/>`
  );
}

// 亮度小工具：把 #rrggbb 变亮 / 变暗。
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

// 画整个零件形状 → 完整的 <svg> 字符串。
// cells: [[x,y],...]；color: 主色；dim=true 时画成影子（深灰半透明 + 虚线边）。
export function pieceSVG(cells, { color = '#f6c20b', dim = false } = {}) {
  const xs = cells.map((c) => c[0]);
  const ys = cells.map((c) => c[1]);
  const w = Math.max(...xs) + 1;
  const h = Math.max(...ys) + 1;
  const top = dim ? '#9aa0ab' : color; // 顶面 = 关卡原色；影子 = 深灰
  const front = dim ? '#7d838d' : shade(color, 0.72); // 侧壁暗一档，出立体感
  const inner = cells.map(([x, y]) => cubeCell(x, y, top, front)).join('');
  return (
    `<svg viewBox="-0.05 -0.05 ${w + 0.1} ${h + 0.1}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">`
    + (dim
      ? `<g opacity="0.85" fill="none" stroke="#5b6470" stroke-width="0.06" stroke-dasharray="0.14 0.1"><rect x="${-0.02}" y="${-0.02}" width="${w + 0.04}" height="${h + 0.04}" rx="0.12"/></g>`
        + `<g opacity="0.5">${inner}</g>`
      : inner)
    + '</svg>'
  );
}

// 本游戏的样式文件（styles/rotate.css）按需插入一次
let styleReady = false;
function ensureStyle() {
  if (styleReady || document.getElementById('rotate-style')) {
    styleReady = true;
    return;
  }
  styleReady = true;
  const link = document.createElement('link');
  link.id = 'rotate-style';
  link.rel = 'stylesheet';
  link.href = './styles/rotate.css';
  document.head.appendChild(link);
}

// ============ 挂载 ============

export function mount(container, ctx) {
  ensureStyle();
  // main.js 的 ctx.level 恒为 null，关卡数据自己按关卡号取
  const level = LEVELS[ctx.levelIndex] || LEVELS[0];

  // ———— 状态 ————
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

  // 顶栏外框（横屏：上面影子 / 下面零件；竖屏同理，只是按钮小一点）
  const stage = el('<div class="rot-stage"></div>');
  container.appendChild(stage);

  // ———— 通用：上方的展示台（影子 / 原零件） ————
  const topBox = el('<div class="rot-top"></div>');
  const topLabel = el('<div class="rot-top-label"></div>');
  const topPiece = el('<div class="rot-top-piece"></div>');
  topBox.appendChild(topLabel);
  topBox.appendChild(topPiece);
  stage.appendChild(topBox);

  // ———— 分模式搭建 ————
  if (level.mode === 'turn') {
    mountTurn();
  } else {
    mountChoose();
  }

  // =========================================================
  // 玩法一：转一转
  // =========================================================
  function mountTurn() {
    const target = rotate(level.shape, level.turns);
    const minClicks = rotationsNeeded(level.shape, target);
    // 「修好啦！××装上啦！」——按关卡在转一转关卡里的序号取台词
    const fixedIdx = TURN_ORDER.indexOf(level.id);
    const fixedLine = LINES_ROTATE.fixedByLevel[fixedIdx] || LINES_ROTATE.fixedByLevel[0];
    let angle = 0; // 当前累计角度（度）。屏幕坐标 y 向下，正角 = 顺时针
    let clicks = 0; // 总点击数（含动画排队中的）
    let failCounted = false; // 「超次数算一次 fail」只记一次
    let flying = false; // 零件正在飞进影子
    const queue = []; // 动画期间的点击排队
    let animating = false;

    // 影子是「目标」：文案要说清楚要把它转成影子这样（任务卡 012-9）
    topLabel.textContent = '把零件转成这样 👇';
    topPiece.innerHTML = pieceSVG(target, { color: level.color, dim: true });
    topPiece.classList.add('is-shadow');
    topPiece.classList.add('rot-shadow');

    // 灰灰和影子排成一排（任务卡 012-9：灰灰要挨着影子，别飘在远处），
    // 放大到 104px，孩子一眼看清「灰灰在看着影子」
    const pup = el(`<div class="rot-pup">${pupSVG('rocky', { size: 104, mood: 'thinking' })}</div>`);
    const topRow = el('<div class="rot-top-row"></div>');
    topBox.appendChild(topRow); // 先加 row（label 之后）
    topRow.appendChild(topPiece); // 把影子挪进 row（appendChild 自带「移动」语义）
    topRow.appendChild(pup);

    // 下方：零件 + 转一转按钮
    const bottom = el('<div class="rot-bottom"></div>');
    const pieceBox = el('<div class="rot-piece-box"><div class="rot-piece"></div></div>');
    const pieceEl = pieceBox.querySelector('.rot-piece');
    // 固定按形状画布大小，旋转时不会跳；角度用 CSS transform 过渡
    pieceEl.innerHTML = pieceSVG(level.shape, { color: level.color });
    pieceEl.style.transform = 'rotate(0deg)';

    const btn = el(
      '<button class="rot-btn" data-testid="btn-rotate" aria-label="转一转">'
      + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.32 4H3.5L7 4.5 10.5 9H8.1a5 5 0 1 0 .34-2z" fill="currentColor"/></svg>'
      + '</button>',
    );
    bottom.appendChild(pieceBox);
    bottom.appendChild(btn);
    stage.appendChild(bottom);

    // 重绘零件：角度归到 0–359，换回未旋转的形状画一遍。
    // 只在动画结束后调用，保证 SVG 里的「正面朝下」永远是对的。
    function redraw() {
      angle = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
      // 归一角度时先关掉过渡：不然 360→0 会当着孩子的面倒转回去
      pieceEl.style.transition = 'none';
      pieceEl.style.transform = `rotate(${angle}deg)`;
      void pieceEl.offsetWidth; // 强制回流，让「无过渡」立刻生效
      pieceEl.style.transition = '';
      pieceEl.innerHTML = pieceSVG(rotate(level.shape, angle / 90), { color: level.color });
    }

    // 转一次（带 300ms 过渡动画）。动画期间再点会排队，一个都不丢。
    function doTurn() {
      clicks += 1;
      // 星级规则：点击超过最少次数 + 4 → 记一次 fail（只一次），不打断孩子
      if (clicks > minClicks + 4 && !failCounted && !finished) {
        failCounted = true;
        ctx.fail();
      }
      if (finished || flying) return;
      queue.push(1);
      pump();
    }

    // 队列泵：一次转一个，转完（动画结束 + 重绘）再转下一个
    async function pump() {
      if (animating || flying || finished) return;
      animating = true;
      while (queue.length) {
        queue.shift();
        angle += 90;
        // 触发 CSS transform 过渡（rotate.css 里 .rot-piece 有 300ms transition）
        pieceEl.style.transform = `rotate(${angle}deg)`;
        ctx.sfx('tap');
        // 等动画播完……
        await sleep(320);
        if (disposed) return;
        redraw();
        // 转到位了？→ 零件飞进影子里！
        if (sameShape(rotate(level.shape, angle / 90), target)) {
          await winFly();
          return;
        }
      }
      animating = false;
    }

    // 过关：零件真的「飞」进影子里（FLIP：算出影子中心，平移+缩小过去），
    // 同时影子亮起来，然后交给外框算星、弹层
    async function winFly() {
      flying = true;
      finished = true;
      queue.length = 0; // 没用上的点击全部作废
      // 影子亮起来
      const shadowSvg = topPiece.querySelector('svg');
      if (shadowSvg) {
        shadowSvg.style.transition = 'opacity 0.4s ease';
        shadowSvg.style.opacity = '1';
      }
      // 从零件中心到影子中心的位移 + 缩放（零件画布 200px、影子画布 150px）
      const from = pieceEl.getBoundingClientRect();
      const to = topPiece.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      const scale = (to.width * 0.8) / from.width;
      pieceEl.style.transition = 'transform 0.6s cubic-bezier(0.5, 0, 0.3, 1), filter 0.6s ease';
      pieceEl.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      pieceEl.style.filter = 'brightness(1.35) drop-shadow(0 0 12px rgba(255, 214, 79, 0.95))';
      ctx.say(fixedLine.text);
      await sleep(700); // 让孩子看清零件和影子重合
      if (!disposed) ctx.complete();
    }

    btn.addEventListener('click', doTurn);

    // 提示：影子上叠一个半透明零件，播放一次从当前角度转到目标的动画
    let hintBusy = false;
    function clearHint() {
      const g = topPiece.querySelector('.rot-ghost');
      if (g) g.remove();
      hintBusy = false;
    }
    ctx.onHint(() => {
      if (finished || disposed || flying || hintBusy) return;
      hintBusy = true;
      // 目标角度 = 从 0 出发要转的最少次数（影子 = rotate(shape, turns)）
      const need = (((minClicks % 4) + 4) % 4) * 90;
      const ghost = el(`<div class="rot-ghost">${pieceSVG(target, { color: level.color })}</div>`);
      ghost.style.transform = `rotate(${angle % 360}deg)`;
      topPiece.appendChild(ghost);
      // 下一帧开始过渡到目标角度（transition 写在 rotate.css 里）
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ghost.style.transform = `rotate(${need}deg)`;
        });
      });
      ctx.say(LINES_ROTATE.hintTurn.text);
      later(clearHint, 1800);
    });
  }

  // =========================================================
  // 玩法二：找一找
  // =========================================================
  function mountChoose() {
    topLabel.textContent = '哪个是它转过去的样子？';
    topPiece.innerHTML = pieceSVG(level.shape, { color: level.color });
    // 「找对啦！××转好了！」——按关卡在找一找关卡里的序号取台词
    const foundIdx = CHOOSE_ORDER.indexOf(level.id);
    const foundLine = LINES_ROTATE.foundByLevel[foundIdx] || LINES_ROTATE.foundByLevel[0];

    const row = el('<div class="rot-choices"></div>');
    stage.appendChild(row);

    // 出题：正确项 = 原形旋转，干扰项 = 翻面（镜像）
    const { options, answer } = makeChoices(level.shape, Math.random);
    const disabled = new Set();

    options.forEach((cells, i) => {
      const card = el(
        `<button class="rot-choice" data-testid="choice-${i}"`
        + `${i === answer ? ' data-answer="true"' : ''} aria-label="选项 ${i + 1}"></button>`,
      );
      card.innerHTML = `<span class="rot-choice-face rot-choice-front">${pieceSVG(cells, { color: level.color })}</span>`;
      card.addEventListener('click', () => pick(i, card, cells));
      row.appendChild(card);
    });
    const cardEls = [...row.children];

    async function pick(i, card, cells) {
      if (finished || disposed || disabled.has(i)) return;
      if (i === answer) {
        // 答对了！卡片弹一下，然后交给外框过关
        finished = true;
        ctx.sfx('tap');
        card.classList.add('is-win');
        ctx.say(foundLine.text);
        await sleep(500);
        if (!disposed) ctx.complete();
        return;
      }
      // 答错：这张卡翻过来展示「翻面」，然后变灰不能再点
      ctx.fail(); // 外框播 oops 音效并计数
      disabled.add(i);
      card.classList.add('is-flipped'); // 3D 翻转 + 镜像零件 = 翻面的证据
      later(() => {
        card.classList.add('is-dim'); // 翻面展示完再变灰，孩子看得更清楚
      }, 900);
      later(() => ctx.say(LINES_ROTATE.wrongFlip.text), 350);
    }

    // 提示：把一个（还没被点掉的）错误选项变灰
    ctx.onHint(() => {
      if (finished || disposed) return;
      const wrongIdx = cardEls
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => i !== answer && !disabled.has(i) && !c.classList.contains('is-dim'));
      if (!wrongIdx.length) return;
      const pickOne = wrongIdx[Math.floor(Math.random() * wrongIdx.length)];
      pickOne.c.classList.add('is-dim');
      disabled.add(pickOne.i);
      ctx.say(LINES_ROTATE.hintDim.text);
    });
  }

  // ============ 进入关卡的说明 ============
  // main.js 挂载后会先说「这一关开始啦」，等它说完再换成玩法说明
  const instr = level.mode === 'turn' ? LINES_ROTATE.introTurn : LINES_ROTATE.introChoose;
  later(() => ctx.setInstruction(instr.text), 1800);

  // ============ 卸载 ============
  return () => {
    disposed = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    ctx.onHint(null);
    stage.remove();
  };
}
