// 验收测试：小砾搭积木逻辑（SPEC 5.9）
import test from 'node:test';
import assert from 'node:assert/strict';
import { countCubes, frontHeights, leftHeights, topView, numberChoices } from '../../src/games/cubes/logic.js';
import { LEVELS } from '../../src/games/cubes/levels.js';

const H = [
  [3, 0, 1],
  [1, 2, 0],
];

test('countCubes', () => {
  assert.equal(countCubes(H), 7);
  assert.equal(countCubes([[0]]), 0);
});

test('frontHeights', () => {
  assert.deepEqual(frontHeights(H), [3, 2, 1]);
});

test('leftHeights', () => {
  assert.deepEqual(leftHeights(H), [3, 2]);
});

test('topView', () => {
  assert.deepEqual(topView(H), [[true, false, true], [true, true, false]]);
});

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('numberChoices', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    for (const n of [1, 2, 5, 12]) {
      const c = numberChoices(n, seeded(seed));
      assert.equal(c.length, 3);
      assert.equal(new Set(c).size, 3, '三个数要互不相同');
      assert.ok(c.includes(n));
      assert.ok(c.every((v) => Number.isInteger(v) && v > 0));
      assert.ok(c.every((v) => Math.abs(v - n) <= 3), '干扰项要接近正确答案，才有思考价值');
      assert.deepEqual(numberChoices(n, seeded(seed)), c);
      if (n === 5) positions.add(c.indexOf(5));
    }
  }
  assert.ok(positions.size >= 2, '正确答案位置要打乱');
});

test('LEVELS 数据合法', () => {
  assert.ok(LEVELS.length >= 12, `至少 12 关，现在 ${LEVELS.length}`);
  const ids = new Set();
  const modes = new Set();
  let hidden = 0;
  LEVELS.forEach((lv, i) => {
    assert.ok(!ids.has(lv.id), `id 重复: ${lv.id}`);
    ids.add(lv.id);
    modes.add(lv.mode);
    assert.ok(['count', 'front'].includes(lv.mode), `第 ${i} 关 mode 非法`);
    const h = lv.heights;
    assert.ok(h.length >= 1 && h.length <= 4 && h.every((r) => r.length === h[0].length && r.length <= 4), `第 ${i} 关尺寸非法`);
    assert.ok(h.flat().every((v) => Number.isInteger(v) && v >= 0 && v <= 4), `第 ${i} 关高度非法`);
    assert.ok(countCubes(h) > 0);
    if (lv.mode === 'front') assert.ok(new Set(frontHeights(h)).size > 1, `第 ${i} 关正面视图全一样高`);
    // 被挡住：某格前面（row 更大、同列）有不低于它的积木，或者高度 ≥2（下面的块看不到侧面全部）
    const hasHidden = h.some((row, r) => row.some((v, c) => v > 0 && h.slice(r + 1).some((rr) => rr[c] >= v)));
    if (hasHidden) hidden++;
  });
  assert.deepEqual([...modes].sort(), ['count', 'front']);
  assert.equal(countCubes(LEVELS[0].heights), 3, '第 1 关 3 块积木');
  assert.ok(hidden >= 3, '至少 3 关有被挡住的积木');
});
