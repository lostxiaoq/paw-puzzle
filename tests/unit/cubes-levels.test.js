// 单元测试：小砾搭积木（任务卡 006）。
// 验收测试（tests/accept/cubes.test.mjs）管接口语义；这里管任务卡的
// 额外要求：16 关的分段设计、数一数关卡的「顶面全部可见」纪律
// （不许出现靠猜的积木）、以及纯函数纪律（不许改调用方传进来的数组）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { countCubes, frontHeights, leftHeights, topView, numberChoices } from '../../src/games/cubes/logic.js';
import { LEVELS } from '../../src/games/cubes/levels.js';

// 和验收测试同款的随机数发生器（线性同余），保证测试可复现。
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// ---------- 关卡结构：任务卡的分段设计 ----------

test('至少 14 关，id 唯一，两种玩法都有', () => {
  assert.ok(LEVELS.length >= 14, `至少 14 关，现在 ${LEVELS.length}`);
  const ids = new Set(LEVELS.map((lv) => lv.id));
  assert.equal(ids.size, LEVELS.length, '关卡 id 有重复');
  for (const lv of LEVELS) {
    assert.ok(['count', 'front'].includes(lv.mode), `${lv.id} 的 mode 非法`);
  }
  assert.ok(LEVELS.some((lv) => lv.mode === 'count'), '要有数一数关卡');
  assert.ok(LEVELS.some((lv) => lv.mode === 'front'), '要有从前面看关卡');
});

test('1–4 关是数一数热身：3–6 块，一层或两层，没有遮挡', () => {
  const warmup = LEVELS.slice(0, 4);
  for (const lv of warmup) {
    assert.equal(lv.mode, 'count', `${lv.id} 应是数一数`);
    const n = countCubes(lv.heights);
    assert.ok(n >= 3 && n <= 6, `${lv.id} 应是 3–6 块，现在 ${n}`);
    const maxH = Math.max(...lv.heights.flat());
    assert.ok(maxH >= 1 && maxH <= 2, `${lv.id} 应是一层或两层`);
  }
  assert.equal(countCubes(LEVELS[0].heights), 3, '第 1 关 3 块');
});

test('5–8 关是从前面看：2×2 ～ 3×3', () => {
  const look = LEVELS.slice(4, 8);
  for (const lv of look) {
    assert.equal(lv.mode, 'front', `${lv.id} 应是从前面看`);
    const rows = lv.heights.length;
    const cols = lv.heights[0].length;
    assert.ok(rows >= 2 && rows <= 3 && cols >= 2 && cols <= 3, `${lv.id} 应是 2×2～3×3`);
    assert.ok(new Set(frontHeights(lv.heights)).size > 1, `${lv.id} 正面视图全一样高`);
  }
});

test('9 关以后两种玩法交替，最大 4×4、10–16 块', () => {
  const late = LEVELS.slice(8);
  late.forEach((lv, i) => {
    const want = i % 2 === 0 ? 'count' : 'front';
    assert.equal(lv.mode, want, `${lv.id} 应该是 ${want}（两种玩法交替）`);
    const rows = lv.heights.length;
    const cols = lv.heights[0].length;
    assert.ok(rows <= 4 && cols <= 4, `${lv.id} 超过 4×4`);
    const n = countCubes(lv.heights);
    assert.ok(n >= 10 && n <= 16, `${lv.id} 应是 10–16 块，现在 ${n}`);
  });
});

// ---------- 数一数关卡的核心纪律：顶面必须全部可见 ----------

// 格子 (r,c) 的顶面完整露出来 = 三个「前排」邻居（存在的话）都比它矮：
//   (r+1,c) 正前方、(r,c+1) 右边、(r+1,c+1) 右前斜角
// （观察者在右前上方，row、col 越大越近。）
function topVisible(h, r, c) {
  const v = h[r][c];
  const at = (rr, cc) => (rr < h.length && cc < h[0].length ? h[rr][cc] : -Infinity);
  return v > at(r + 1, c) && v > at(r, c + 1) && v > at(r + 1, c + 1);
}

test('数一数关卡：每个顶面都完整可见，没有靠猜的积木', () => {
  for (const lv of LEVELS) {
    if (lv.mode !== 'count') continue;
    lv.heights.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v > 0) {
          assert.ok(
            topVisible(lv.heights, r, c),
            `${lv.id} 的格子 (${r},${c}) 高度 ${v} 的顶面被挡住了，数数只能靠猜`
          );
        }
      });
    });
  }
});

test('front 关卡不受顶面纪律限制，但确实存在被挡住的积木', () => {
  // 至少有一关 front 的某格被「齐平或更高的前排」挡住——这正是 front 玩法的价值
  const hasHiddenSomewhere = LEVELS.some((lv) =>
    lv.mode === 'front' &&
    lv.heights.some((row, r) => row.some((v, c) => v > 0 && lv.heights.slice(r + 1).some((rr) => rr[c] >= v)))
  );
  assert.ok(hasHiddenSomewhere, 'front 关卡里应该出现被前排挡住的情况');
});

// ---------- 接口语义的边缘情况（验收之外的加固） ----------

test('countCubes / frontHeights / leftHeights / topView 的边缘情况', () => {
  const H = [
    [4, 0, 2, 0],
    [1, 2, 2, 1],
    [0, 0, 0, 3],
    [0, 0, 1, 1],
  ];
  assert.equal(countCubes(H), 4 + 2 + 1 + 2 + 2 + 1 + 3 + 1 + 1);
  assert.deepEqual(frontHeights(H), [4, 2, 2, 3]);
  assert.deepEqual(leftHeights(H), [4, 2, 3, 1]);
  assert.deepEqual(topView(H), [
    [true, false, true, false],
    [true, true, true, true],
    [false, false, false, true],
    [false, false, true, true],
  ]);
  // 单行单列也不出错；frontHeights 不丢掉开头的高度 0
  assert.deepEqual(frontHeights([[0, 3]]), [0, 3]);
  assert.deepEqual(leftHeights([[0], [3]]), [0, 3]);
});

test('numberChoices：n 很小（1、2）时干扰项也都是正整数且不重复', () => {
  for (const n of [1, 2]) {
    for (let seed = 0; seed < 100; seed++) {
      const c = numberChoices(n, seeded(seed));
      assert.equal(c.length, 3);
      assert.equal(new Set(c).size, 3, `n=${n} seed=${seed} 有重复`);
      assert.ok(c.includes(n));
      assert.ok(c.every((v) => Number.isInteger(v) && v >= 1), `n=${n} seed=${seed} 出现非正整数`);
    }
  }
});

test('纯函数纪律：所有函数都不修改传入的数组', () => {
  const messy = [
    [2, 0],
    [1, 3],
  ];
  const copy = JSON.parse(JSON.stringify(messy));
  countCubes(messy);
  frontHeights(messy);
  leftHeights(messy);
  topView(messy);
  numberChoices(5, seeded(3));
  assert.deepEqual(messy, copy, '输入数组被改动了！');
  // topView 返回的数组和高度图不共享引用，随便改不串
  const tv = topView(messy);
  tv[0][0] = false;
  assert.equal(messy[0][0], 2, 'topView 的返回值和输入共享了引用');
});

// ---------- 打印关卡难度表（自查用） ----------

test('打印关卡难度表（自查用）', () => {
  console.log('\n小砾搭积木：16 关难度表');
  console.log('---------------------------------------------');
  LEVELS.forEach((lv, i) => {
    const n = countCubes(lv.heights);
    const size = `${lv.heights.length}×${lv.heights[0].length}`;
    const blocked = lv.heights.some((row, r) =>
      row.some((v, c) => v > 0 && lv.heights.slice(r + 1).some((rr) => rr[c] >= v))
    );
    console.log(
      `  ${String(i + 1).padStart(2)}. ${lv.id.padEnd(9)} ${lv.mode.padEnd(6)} ` +
      `${size} ${String(n).padStart(2)} 块 ${blocked ? '有遮挡' : '无遮挡'} ${lv.name}`
    );
  });
  console.log('---------------------------------------------');
});
