// 阿奇巡逻：游戏界面（SPEC 3.1 + 任务卡 007）。
// 左边（平板横屏）或上面（手机竖屏）是网格地图，
// 右边（或下面）是方向卡 + 指令槽 + 出发/清空。
// 只依赖本目录的 logic.js / levels.js 和 art/pups.js，不碰任何全局状态。

import { runProgram, solve } from './logic.js';
import { LEVELS } from './levels.js';
import { pupSVG } from '../../art/pups.js';

// ———— 小工具 ————
function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
const key = (x, y) => `${x},${y}`;

// 提示用：找出指令槽里第一张和正确答案不一样的位置；完全一致返回 -1。
// program 比 solution 短且前面都对 → 返回 program.length（下一格该放哪）。
export function firstWrongIndex(program, solution) {
  const n = Math.max(program.length, solution.length);
  for (let i = 0; i < n; i++) {
    if (program[i] !== solution[i]) return i;
  }
  return -1;
}

// ———— 界面里的小图形，全部现画的 SVG，没有任何图片文件 ————

// 方向大箭头（fill 用 currentColor，颜色写在 CSS 里：一个方向固定一种颜色）
function arrowSVG() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 21 13.4h-5.2v7.2H8.2v-7.2H3Z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}

// 树（障碍）
function treeSVG() {
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    + '<rect x="28" y="36" width="9" height="18" rx="4" fill="#a06a3a"/>'
    + '<circle cx="32" cy="24" r="15" fill="#57b85c"/>'
    + '<circle cx="20" cy="33" r="10.5" fill="#49a451"/>'
    + '<circle cx="44" cy="33" r="10.5" fill="#66c46b"/>'
    + '<circle cx="27" cy="20" r="4.5" fill="#8ade8d" opacity=".9"/>'
    + '</svg>';
}

// 石头（障碍）
function rockSVG() {
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    + '<path d="M10 50c-2-12 5-20 14-24 8-4 20-4 27 3 6 6 7 15 3 21-2 3-6 4-10 4H17c-4 0-6-1-7-4Z" fill="#b9c2cc"/>'
    + '<path d="M22 30c7-5 17-5 24 1" stroke="#9aa4b0" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<circle cx="42" cy="42" r="4" fill="#cdd5dd"/>'
    + '</svg>';
}

// 骨头：同一组形状画两遍，下层带描边、上层只填色，接缝处就不会有交叉线
function boneSVG() {
  const shape = '<rect x="16" y="26" width="32" height="12" rx="6"/>'
    + '<circle cx="16" cy="26" r="8"/><circle cx="16" cy="38" r="8"/>'
    + '<circle cx="48" cy="26" r="8"/><circle cx="48" cy="38" r="8"/>';
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    + '<g transform="rotate(-25 32 32)">'
    + `<g fill="#fff6e3" stroke="#e3cf9f" stroke-width="3.5">${shape}</g>`
    + `<g fill="#fff6e3">${shape}</g>`
    + '</g></svg>';
}

// 终点小猫
function catSVG() {
  return '<svg viewBox="0 0 64 64" aria-hidden="true">'
    + '<path d="M15 27 11 9l16 8Z" fill="#ffab4a" stroke="#e08a2c" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<path d="M49 27 53 9 37 17Z" fill="#ffab4a" stroke="#e08a2c" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<circle cx="32" cy="38" r="19" fill="#ffb95c" stroke="#e08a2c" stroke-width="2.5"/>'
    + '<circle cx="25" cy="36" r="2.6" fill="#3b3248"/>'
    + '<circle cx="39" cy="36" r="2.6" fill="#3b3248"/>'
    + '<circle cx="26.2" cy="35" r="0.9" fill="#fff"/>'
    + '<circle cx="40.2" cy="35" r="0.9" fill="#fff"/>'
    + '<path d="M32 41.5l-2.6 3h5.2Z" fill="#ff6fa8"/>'
    + '<path d="M27 47.5q5 4 10 0" stroke="#3b3248" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    + '<path d="M13 38h7M13 43l7-1.5M51 38h-7M51 43l-7-1.5" stroke="#e08a2c" stroke-width="1.8" stroke-linecap="round"/>'
    + '</svg>';
}

// 小爪印（走过的格子留下）
function pawPrintSVG() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<g fill="#8a6a43" opacity=".38">'
    + '<ellipse cx="12" cy="15.6" rx="5.6" ry="4.6"/>'
    + '<circle cx="5.2" cy="9.4" r="2.3"/>'
    + '<circle cx="10" cy="6.4" r="2.4"/>'
    + '<circle cx="14.8" cy="6.6" r="2.4"/>'
    + '<circle cx="19" cy="9.8" r="2.2"/>'
    + '</g></svg>';
}

// 小花（草地装饰）
function flowerSVG() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">'
    + '<g fill="#ffffff" opacity=".9">'
    + '<circle cx="12" cy="6" r="4"/><circle cx="18" cy="11" r="4"/>'
    + '<circle cx="15.5" cy="18" r="4"/><circle cx="8.5" cy="18" r="4"/>'
    + '<circle cx="6" cy="11" r="4"/>'
    + '</g>'
    + '<circle cx="12" cy="12.5" r="3.4" fill="#ffd23f"/>'
    + '</svg>';
}

// 本游戏的样式文件（styles/route.css）按需插入一次
let styleReady = false;
function ensureStyle() {
  if (styleReady || document.getElementById('route-style')) {
    styleReady = true;
    return;
  }
  styleReady = true;
  const link = document.createElement('link');
  link.id = 'route-style';
  link.rel = 'stylesheet';
  link.href = './styles/route.css';
  document.head.appendChild(link);
}

// ============ 挂载 ============
export function mount(container, ctx) {
  ensureStyle();
  // main.js 的 ctx.level 恒为 null，关卡数据自己按关卡号取
  const level = LEVELS[ctx.levelIndex] || LEVELS[0];

  // ———— 状态 ————
  let program = [];      // 孩子排好的指令，最长 maxCards
  let running = false;   // 阿奇正在走
  let finished = false;  // 本关已过关
  let disposed = false;  // 已离开本页
  let failedIndex = -1;  // 被标红的那张卡片
  let lastX = level.start.x;
  let lastY = level.start.y;
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

  // ———— 地图 ————
  const stage = el('<div class="route-stage"></div>');
  const mapBox = el('<div class="route-map-box"></div>');
  const wrap = el(`<div class="route-map-wrap route-theme-${level.theme || 'park'}"></div>`);
  // 地图尺寸全部用 --cell 推导，改一个变量整张地图（含阿奇、爪印）一起缩放
  wrap.style.width = `calc(var(--cell) * ${level.cols})`;
  wrap.style.height = `calc(var(--cell) * ${level.rows})`;

  const map = el('<div class="route-map"></div>');
  map.style.gridTemplateColumns = `repeat(${level.cols}, var(--cell))`;
  map.style.gridTemplateRows = `repeat(${level.rows}, var(--cell))`;

  const startKey = key(level.start.x, level.start.y);
  const goalKey = key(level.goal.x, level.goal.y);
  const wallSet = new Set(level.walls.map((w) => key(w.x, w.y)));
  const boneCells = new Map(); // "x,y" -> 骨头元素（走路时吃掉 / 失败后复原）
  let wallIdx = 0;
  let flowerCount = 0;

  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const k = key(x, y);
      const cell = el(`<div class="route-cell${(x + y) % 2 ? ' alt' : ''}"></div>`);
      if (k === startKey) cell.classList.add('is-start');
      if (wallSet.has(k)) {
        cell.classList.add('is-obs');
        // 树和石头轮流出现，画面更活泼
        cell.innerHTML = `<div class="route-obs">${wallIdx++ % 2 ? rockSVG() : treeSVG()}</div>`;
      } else if (k === goalKey) {
        cell.classList.add('is-goal');
        cell.innerHTML = `<div class="route-goal">${catSVG()}</div>`;
      } else {
        const isBone = level.bones.some((b) => key(b.x, b.y) === k);
        if (isBone) {
          const bone = el(`<div class="route-bone">${boneSVG()}</div>`);
          cell.appendChild(bone);
          boneCells.set(k, bone);
        } else if (flowerCount < 3 && (x * 7 + y * 13 + level.id.length) % 9 === 0) {
          flowerCount += 1;
          cell.innerHTML = `<div class="route-flower">${flowerSVG()}</div>`;
        }
      }
      map.appendChild(cell);
    }
  }

  // 提示虚线画在这层 SVG 上（viewBox 用格子数，随地图自动缩放）
  const hintSvg = el(`<svg class="route-hint-line" viewBox="0 0 ${level.cols} ${level.rows}" preserveAspectRatio="none" aria-hidden="true"></svg>`);

  // 阿奇：外层管位移（平滑走路），内层管抖动等小动画，互不打架
  const pup = el(`<div class="route-pup"><div class="route-pup-in">${pupSVG('chase', { size: 120 })}</div></div>`);
  const pupIn = pup.firstElementChild;
  const pupXY = (x, y) =>
    `translate(calc(var(--cell) * ${(x + 0.06).toFixed(3)}), calc(var(--cell) * ${(y + 0.1).toFixed(3)}))`;
  pup.style.transform = pupXY(lastX, lastY); // 先摆好再上屏，避免从角落滑过来
  function setPup(x, y) {
    lastX = x;
    lastY = y;
    pup.style.transform = pupXY(x, y);
  }

  wrap.appendChild(map);
  wrap.appendChild(hintSvg);
  wrap.appendChild(pup);
  mapBox.appendChild(wrap);
  stage.appendChild(mapBox);

  // ———— 操作区 ————
  const controls = el('<div class="route-controls"></div>');

  // 4 张方向卡：十字排布，每个方向固定一种颜色，不识字也认得出
  const DIRS = [
    { dir: 'up', label: '向上', cls: 'route-dir-up', area: '1 / 2' },
    { dir: 'left', label: '向左', cls: 'route-dir-left', area: '2 / 1' },
    { dir: 'down', label: '向下', cls: 'route-dir-down', area: '2 / 2' },
    { dir: 'right', label: '向右', cls: 'route-dir-right', area: '2 / 3' },
  ];
  const dpad = el('<div class="route-dpad" role="group" aria-label="方向卡片"></div>');
  for (const d of DIRS) {
    const b = el(
      `<button class="route-dir ${d.cls}" data-testid="card-${d.dir}" aria-label="${d.label}" style="grid-area:${d.area}">${arrowSVG()}</button>`,
    );
    b.addEventListener('click', () => addCard(d.dir, b));
    dpad.appendChild(b);
  }
  controls.appendChild(dpad);

  // 指令槽：数量 = maxCards，点已放的卡片可以删掉
  const slotsBox = el('<div class="route-slots" aria-label="指令槽"></div>');
  const slotEls = [];
  for (let i = 0; i < level.maxCards; i++) {
    const s = el(`<button class="route-slot" data-testid="slot-${i}" aria-label="第 ${i + 1} 格" tabindex="-1"></button>`);
    s.addEventListener('click', () => removeAt(i));
    slotEls.push(s);
    slotsBox.appendChild(s);
  }
  controls.appendChild(slotsBox);

  // 出发 / 清空
  const actions = el(
    '<div class="route-actions">'
    + '<button class="route-go" data-testid="btn-go">▶ 出发</button>'
    + '<button class="route-clear" data-testid="btn-clear">清空</button>'
    + '</div>',
  );
  const goBtn = actions.querySelector('[data-testid="btn-go"]');
  const clearBtn = actions.querySelector('[data-testid="btn-clear"]');
  goBtn.addEventListener('click', () => go());
  clearBtn.addEventListener('click', () => {
    if (running || finished || disposed) return;
    ctx.sfx('tap');
    clearAll();
  });
  controls.appendChild(actions);
  stage.appendChild(controls);
  container.appendChild(stage);

  // ———— 指令槽渲染 ————
  const SLOT_CLS = { up: 's-up', down: 's-down', left: 's-left', right: 's-right' };
  function renderSlots() {
    program.forEach((d, i) => {
      slotEls[i].className = `route-slot is-filled ${SLOT_CLS[d] || ''}${i === failedIndex ? ' is-fail' : ''}`;
      slotEls[i].innerHTML = arrowSVG();
    });
    for (let i = program.length; i < slotEls.length; i++) {
      slotEls[i].className = `route-slot${i === failedIndex ? ' is-fail' : ''}`;
      slotEls[i].innerHTML = '';
    }
  }

  function shakeOnce(elm) {
    elm.classList.remove('shake');
    void elm.offsetWidth; // 强制回流，让动画能重新播
    elm.classList.add('shake');
    later(() => elm.classList.remove('shake'), 500);
  }

  function addCard(dir, btnEl) {
    if (running || finished || disposed) return;
    clearHint();
    if (program.length >= level.maxCards) {
      shakeOnce(btnEl); // 满了：轻轻抖一下这张方向卡
      return;
    }
    ctx.sfx('tap');
    program.push(dir);
    failedIndex = -1; // 改了路线，把上次的红牌擦掉
    renderSlots();
  }

  function removeAt(i) {
    if (running || finished || disposed) return;
    if (!program[i]) return;
    ctx.sfx('tap');
    program.splice(i, 1);
    failedIndex = -1;
    clearHint();
    renderSlots();
  }

  function clearAll() {
    program = [];
    failedIndex = -1;
    clearHint();
    renderSlots();
  }

  // ———— 走路动画 ————
  const prints = [];
  function dropPrint(x, y, i) {
    const p = el(`<span class="route-print">${pawPrintSVG()}</span>`);
    p.style.left = `calc(var(--cell) * ${(x + 0.35).toFixed(3)})`;
    p.style.top = `calc(var(--cell) * ${(y + 0.4).toFixed(3)})`;
    p.style.transform = `rotate(${i % 2 ? 16 : -14}deg)`; // 左右脚交替的小歪度
    wrap.appendChild(p);
    prints.push(p);
  }

  function eatBoneAt(x, y) {
    const bone = boneCells.get(key(x, y));
    if (bone && !bone.classList.contains('is-eaten')) {
      bone.classList.add('is-eaten');
      ctx.sfx('star');
    }
  }

  // 撞墙/出界前的小前冲：朝那个方向顶一下再弹回来
  const BUMP = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  async function bump(dir) {
    const d = BUMP[dir] || [0, 0];
    const from = pup.style.transform;
    const hit = pupXY(lastX + d[0] * 0.3, lastY + d[1] * 0.3);
    if (pup.animate) {
      pup.animate(
        [{ transform: from }, { transform: hit, offset: 0.45 }, { transform: from }],
        { duration: 300, easing: 'ease-in-out' },
      );
    }
    await sleep(320);
  }

  // 失败后回到起点：阿奇归位、爪印擦掉、骨头复原；指令槽保留让孩子改
  function resetRun() {
    setPup(level.start.x, level.start.y);
    for (const p of prints) p.remove();
    prints.length = 0;
    for (const bone of boneCells.values()) bone.classList.remove('is-eaten');
  }

  async function go() {
    if (running || finished || disposed) return;
    if (!program.length) {
      ctx.sfx('tap');
      ctx.say('先点箭头，排好路线再出发哦');
      shakeOnce(goBtn);
      return;
    }
    ctx.sfx('tap');
    running = true;
    failedIndex = -1;
    renderSlots();
    clearHint();

    // 逻辑层一次性算出结果，界面只负责一步一步演出来
    const res = runProgram(level, program);
    for (let i = 1; i < res.path.length; i++) {
      if (disposed) return;
      const c = res.path[i];
      setPup(c.x, c.y);
      ctx.sfx('step');
      await sleep(350); // 每步约 350ms
      if (disposed) return;
      dropPrint(c.x, c.y, i);
      eatBoneAt(c.x, c.y);
    }
    if (disposed) return;

    if (res.status === 'success') {
      finished = true;
      await sleep(300); // 让孩子看清阿奇到了小猫身边
      if (!disposed) ctx.complete(); // 外框：算星、写进度、弹层
      running = false;
      return;
    }

    if (res.status === 'blocked' || res.status === 'outOfBounds') {
      await bump(program[res.failedAt] || 'up');
      if (disposed) return;
      shakeOnce(pupIn); // 阿奇原地轻轻抖动
      failedIndex = res.failedAt;
      renderSlots();    // 出错的那张卡片标红
      ctx.fail();       // 记一次失败（外框自己会播 oops 音效）
      ctx.say('哎呀，前面过不去');
    } else if (res.status === 'notReached') {
      ctx.say('还差一点点，再想想');
    } else if (res.status === 'missedBones') {
      ctx.say('骨头还没吃完哦');
    }

    // 失败：回到起点重想，指令槽保留
    await sleep(1100);
    if (disposed) return;
    resetRun();
    running = false;
  }

  // ———— 提示（外框的 💡 按钮） ————
  let hintTimer = 0;
  function clearHint() {
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = 0;
    }
    hintSvg.classList.remove('is-on');
    hintSvg.innerHTML = '';
    for (const s of slotEls) s.classList.remove('is-hint');
    goBtn.classList.remove('is-hint');
  }

  function showHint() {
    if (running || finished || disposed) return;
    clearHint();
    const sol = solve(level);
    if (!sol) return;

    // 1) 闪烁第一张不对的卡片位置（全对时改闪「出发」）
    const k = firstWrongIndex(program, sol);
    if (k === -1) {
      goBtn.classList.add('is-hint');
    } else if (k < slotEls.length) {
      slotEls[k].classList.add('is-hint');
    }
    later(() => {
      for (const s of slotEls) s.classList.remove('is-hint');
      goBtn.classList.remove('is-hint');
    }, 2800);

    // 2) 地图上用虚线画出正确路线的前 3 步
    const pts = [level.start, ...sol.slice(0, 3)];
    const line = pts.map((p) => `${p.x + 0.5},${p.y + 0.5}`).join(' ');
    const dots = pts
      .map((p) => `<circle cx="${p.x + 0.5}" cy="${p.y + 0.5}" r="0.16" fill="#1f5fbf"/>`)
      .join('');
    hintSvg.innerHTML =
      `<polyline points="${line}" fill="none" stroke="#1f5fbf" stroke-width="0.16"`
      + ' stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.3 0.24"/>'
      + dots;
    hintSvg.classList.add('is-on');
    hintTimer = later(clearHint, 5200);
    ctx.say('跟着蓝色的虚线走一走');
  }
  ctx.onHint(showHint);

  // ———— 尺寸自适应：横屏左右分栏按高度算，竖屏地图占满宽度 ————
  function layout() {
    if (disposed) return;
    const rect = mapBox.getBoundingClientRect();
    if (rect.width < 20) return;
    const availH = Math.max(window.innerHeight - rect.top - 18, 200);
    let cell = Math.floor(Math.min(rect.width / level.cols, availH / level.rows));
    cell = Math.max(40, Math.min(108, cell)); // 7×7 在 1024×768 下约 80px，远超 60px
    wrap.style.setProperty('--cell', `${cell}px`);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
  if (ro) {
    ro.observe(mapBox);
    ro.observe(controls);
  }
  window.addEventListener('resize', layout);
  const raf = requestAnimationFrame(layout);

  // ———— 进入关卡的说明 ————
  // main.js 挂载后会先说「第 N 关开始啦」，等它说完再换成玩法说明
  const instr = level.bones.length > 0
    ? '先吃掉所有骨头，再去找小猫'
    : '帮阿奇找到小猫！点箭头排好路线，再按出发';
  later(() => ctx.setInstruction(instr), 1800);

  // ———— 卸载 ————
  return () => {
    disposed = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    if (hintTimer) clearTimeout(hintTimer);
    if (ro) ro.disconnect();
    window.removeEventListener('resize', layout);
    cancelAnimationFrame(raf);
    ctx.onHint(null);
    stage.remove();
  };
}
