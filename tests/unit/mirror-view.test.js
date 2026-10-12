// 单元测试：天天的魔镜 view 模块（任务卡 008）。
// view.js 顶层只 import 纯模块，所以在 Node 里 import 它不碰 DOM；
// DOM 渲染和交互留给浏览器验收（smoke.mjs）。
// 这里额外验证 smoke 的自动解题假设：可编辑区 = 镜子待涂的那一半。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorOf } from '../../src/games/mirror/view.js';
import { givenHalf, diffCells } from '../../src/games/mirror/logic.js';
import { LEVELS } from '../../src/games/mirror/levels.js';

test('view.js 在 Node 里可以安全 import（顶层不碰 window/document）', async () => {
  const mod = await import('../../src/games/mirror/view.js');
  assert.equal(typeof mod.mount, 'function');
});

test('mirrorOf：竖线镜子是左右对称映射', () => {
  const lv = LEVELS[0]; // 第 1 关：4x4 竖线
  assert.equal(lv.axis, 'vertical');
  assert.deepEqual(mirrorOf(lv, 0, 0), { r: 0, c: 3 });
  assert.deepEqual(mirrorOf(lv, 2, 1), { r: 2, c: 2 });
  // 映射两次回到自身
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const m = mirrorOf(lv, r, c);
      assert.deepEqual(mirrorOf(lv, m.r, m.c), { r, c });
    }
  }
});

test('mirrorOf：横线镜子是上下对称映射', () => {
  const lv = LEVELS[6]; // 第 7 关：6x6 横线（蘑菇）
  assert.equal(lv.axis, 'horizontal');
  assert.deepEqual(mirrorOf(lv, 0, 2), { r: 5, c: 2 });
  assert.deepEqual(mirrorOf(LEVELS[7], 0, 0), { r: 7, c: 0 }); // 第 8 关：8x8
});

test('开局每个空缺格子（= smoke 要点的格子）都能用 givenHalf 的颜色编号直接修复', () => {
  // smoke.mjs 的解法是：按 solution 逐格选 color-<v> 再点格子。
  // 这个测试保证「点完所有可编辑区的 solution 填色格」后一定全对。
  for (const lv of LEVELS) {
    const start = givenHalf(lv);
    const rows = lv.solution.length;
    const cols = lv.solution[0].length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const editable = lv.axis === 'vertical' ? c >= cols / 2 : r >= rows / 2;
        if (editable && lv.solution[r][c] > 0) {
          start[r][c] = lv.solution[r][c];
        }
      }
    }
    assert.deepEqual(
      diffCells(start, lv.solution),
      [],
      `${lv.name}：按 solution 涂完可编辑区后应完全对称`,
    );
  }
});
