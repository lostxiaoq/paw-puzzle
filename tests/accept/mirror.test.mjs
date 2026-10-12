// 验收测试：天天的魔镜逻辑（SPEC 5.7）
import test from 'node:test';
import assert from 'node:assert/strict';
import { reflect, isSymmetric, diffCells, givenHalf } from '../../src/games/mirror/logic.js';
import { LEVELS } from '../../src/games/mirror/levels.js';

const G = [
  [1, 0, 2],
  [0, 3, 0],
];

test('reflect 竖线', () => {
  assert.deepEqual(reflect(G, 'vertical'), [[2, 0, 1], [0, 3, 0]]);
});

test('reflect 横线', () => {
  assert.deepEqual(reflect(G, 'horizontal'), [[0, 3, 0], [1, 0, 2]]);
});

test('reflect 不修改原数组', () => {
  const g = [[1, 2], [3, 4]];
  reflect(g, 'vertical');
  reflect(g, 'horizontal');
  assert.deepEqual(g, [[1, 2], [3, 4]]);
});

test('isSymmetric', () => {
  assert.equal(isSymmetric([[1, 0, 0, 1], [2, 1, 1, 2]], 'vertical'), true);
  assert.equal(isSymmetric([[1, 0, 0, 1], [2, 1, 1, 2]], 'horizontal'), false);
  assert.equal(isSymmetric([[1, 2], [1, 2]], 'horizontal'), true);
  assert.equal(isSymmetric([[1, 2], [1, 2]], 'vertical'), false);
});

test('diffCells', () => {
  assert.deepEqual(diffCells([[1, 0], [0, 1]], [[1, 0], [0, 1]]), []);
  assert.deepEqual(diffCells([[1, 0], [0, 1]], [[0, 0], [2, 1]]), [{ r: 0, c: 0 }, { r: 1, c: 0 }]);
});

test('givenHalf', () => {
  const sol = [[1, 2, 2, 1], [3, 0, 0, 3]];
  assert.deepEqual(givenHalf({ axis: 'vertical', solution: sol }), [[1, 2, 0, 0], [3, 0, 0, 0]]);
  const solH = [[1, 2], [3, 4], [3, 4], [1, 2]];
  assert.deepEqual(givenHalf({ axis: 'horizontal', solution: solH }), [[1, 2], [3, 4], [0, 0], [0, 0]]);
});

test('LEVELS 数据合法', () => {
  assert.ok(LEVELS.length >= 10, `至少 10 关，现在 ${LEVELS.length}`);
  const ids = new Set();
  let horizontal = 0;
  LEVELS.forEach((lv, i) => {
    assert.ok(!ids.has(lv.id), `id 重复: ${lv.id}`);
    ids.add(lv.id);
    assert.ok(['vertical', 'horizontal'].includes(lv.axis), `第 ${i} 关 axis 非法`);
    if (lv.axis === 'horizontal') horizontal++;
    const rows = lv.solution.length;
    const cols = lv.solution[0].length;
    assert.ok(lv.solution.every((row) => row.length === cols), `第 ${i} 关不是矩形`);
    assert.equal(lv.axis === 'vertical' ? cols % 2 : rows % 2, 0, `第 ${i} 关镜子方向维度必须是偶数`);
    assert.ok(isSymmetric(lv.solution, lv.axis), `第 ${i} 关 solution 不对称`);
    const used = new Set(lv.solution.flat().filter((v) => v !== 0));
    for (const v of used) assert.ok(Number.isInteger(v) && v >= 1 && v <= lv.colors.length, `第 ${i} 关颜色编号 ${v} 越界`);
    for (const c of lv.colors) assert.match(c, /^#[0-9a-fA-F]{6}$/);
    const half = givenHalf(lv).flat().filter((v) => v !== 0).length;
    assert.ok(half >= 2, `第 ${i} 关给出的一半太空`);
    assert.ok(rows <= 8 && cols <= 8, `第 ${i} 关超过 8×8`);
  });
  assert.ok(horizontal >= 3, '至少 3 关横线镜子');
  const f = LEVELS[0];
  assert.ok(f.solution.length <= 4 && f.solution[0].length <= 4 && f.colors.length === 1, '第 1 关应为 4×4 以内、1 种颜色');
  const last = LEVELS.at(-1);
  assert.ok(last.colors.length >= 3, '最后一关应有 3 种颜色');
});
