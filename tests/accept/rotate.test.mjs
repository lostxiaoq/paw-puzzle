// 验收测试：灰灰修零件逻辑（SPEC 5.8）
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, rotate, mirror, sameShape, rotationsNeeded, isChiral, makeChoices } from '../../src/games/rotate/logic.js';
import { LEVELS } from '../../src/games/rotate/levels.js';

// L 形四格：竖条 + 右下角一格
const L4 = [[0, 0], [0, 1], [0, 2], [1, 2]];
const I3 = [[0, 0], [1, 0], [2, 0]];
const SQ = [[0, 0], [1, 0], [0, 1], [1, 1]];

test('normalize 平移并排序', () => {
  assert.deepEqual(normalize([[3, 5], [2, 5], [2, 6]]), [[0, 0], [1, 0], [0, 1]]);
});

test('rotate 顺时针 90°', () => {
  // (x,y)->(-y,x) 后平移：竖条 L 变成横条，拐角在左下
  assert.deepEqual(rotate(L4, 1), [[0, 0], [1, 0], [2, 0], [0, 1]]);
  assert.deepEqual(rotate(I3, 1), [[0, 0], [0, 1], [0, 2]]);
});

test('rotate 周期与负数', () => {
  assert.deepEqual(rotate(L4, 4), normalize(L4));
  assert.deepEqual(rotate(L4, 0), normalize(L4));
  assert.deepEqual(rotate(L4, -1), rotate(L4, 3));
  assert.deepEqual(rotate(rotate(L4, 1), 2), rotate(L4, 3));
});

test('mirror', () => {
  assert.deepEqual(mirror(L4), [[1, 0], [1, 1], [0, 2], [1, 2]]);
  assert.deepEqual(mirror(mirror(L4)), normalize(L4));
});

test('sameShape 不允许旋转', () => {
  assert.equal(sameShape(L4, [[5, 5], [5, 6], [5, 7], [6, 7]]), true);
  assert.equal(sameShape(L4, rotate(L4, 1)), false);
});

test('rotationsNeeded', () => {
  assert.equal(rotationsNeeded(L4, L4), 0);
  assert.equal(rotationsNeeded(L4, rotate(L4, 3)), 3);
  assert.equal(rotationsNeeded(L4, mirror(L4)), -1);
  assert.equal(rotationsNeeded(I3, rotate(I3, 2)), 0, '直条转 180° 和原来一样，最小是 0');
  assert.equal(rotationsNeeded(SQ, rotate(SQ, 1)), 0);
});

test('isChiral', () => {
  assert.equal(isChiral(L4), true);
  assert.equal(isChiral(I3), false);
  assert.equal(isChiral(SQ), false);
  assert.equal(isChiral([[0, 0], [1, 0], [1, 1], [2, 1]]), true, 'S/Z 形是手性');
  assert.equal(isChiral([[0, 0], [1, 0], [2, 0], [1, 1]]), false, 'T 形不是手性');
});

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('makeChoices 结构正确且可复现', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { options, answer } = makeChoices(L4, seeded(seed));
    assert.equal(options.length, 3);
    assert.ok([0, 1, 2].includes(answer));
    const k = rotationsNeeded(L4, options[answer]);
    assert.ok(k >= 1 && k <= 3, `正确选项应是旋转 1–3 次，得到 ${k}`);
    const wrong = options.filter((_, i) => i !== answer);
    for (const w of wrong) assert.equal(rotationsNeeded(L4, w), -1, '干扰项不能是原形的旋转');
    assert.ok(wrong.some((w) => rotationsNeeded(mirror(L4), w) >= 0), '至少一个干扰项是镜像');
    assert.deepEqual(makeChoices(L4, seeded(seed)), { options, answer });
  }
  const answers = new Set(Array.from({ length: 30 }, (_, i) => makeChoices(L4, seeded(i + 1)).answer));
  assert.ok(answers.size >= 2, '正确答案位置应随机分布');
});

test('makeChoices 非手性形状抛错', () => {
  assert.throws(() => makeChoices(SQ, seeded(1)));
});

test('LEVELS 数据合法', () => {
  assert.ok(LEVELS.length >= 12, `至少 12 关，现在 ${LEVELS.length}`);
  const ids = new Set();
  const modes = new Set();
  LEVELS.forEach((lv, i) => {
    assert.ok(!ids.has(lv.id), `id 重复: ${lv.id}`);
    ids.add(lv.id);
    modes.add(lv.mode);
    assert.ok(lv.shape.length >= 3 && lv.shape.length <= 6, `第 ${i} 关格子数应在 3–6`);
    const keys = new Set(lv.shape.map(([x, y]) => `${x},${y}`));
    assert.equal(keys.size, lv.shape.length, `第 ${i} 关有重复格子`);
    // 连通性
    const seen = new Set([`${lv.shape[0][0]},${lv.shape[0][1]}`]);
    const stack = [lv.shape[0]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${x + dx},${y + dy}`;
        if (keys.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
      }
    }
    assert.equal(seen.size, keys.size, `第 ${i} 关形状不连通`);
    if (lv.mode === 'turn') {
      assert.ok([1, 2, 3].includes(lv.turns), `第 ${i} 关 turns 非法`);
      assert.equal(sameShape(rotate(lv.shape, lv.turns), lv.shape), false, `第 ${i} 关转完和原样一样，没意义`);
    } else {
      assert.equal(lv.mode, 'choose', `第 ${i} 关 mode 非法`);
      assert.ok(isChiral(lv.shape), `第 ${i} 关 choose 需要手性形状`);
    }
  });
  assert.deepEqual([...modes].sort(), ['choose', 'turn']);
  assert.ok(LEVELS[0].shape.length === 3 && LEVELS[0].mode === 'turn', '第 1 关应为 3 格的转一转');
});
