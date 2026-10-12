// 验收测试：阿奇巡逻逻辑（SPEC 5.6）
import test from 'node:test';
import assert from 'node:assert/strict';
import { runProgram, solve } from '../../src/games/route/logic.js';
import { LEVELS } from '../../src/games/route/levels.js';

const L = {
  id: 't1', cols: 4, rows: 3,
  start: { x: 0, y: 0 }, goal: { x: 3, y: 0 },
  walls: [{ x: 1, y: 0 }], bones: [], maxCards: 10,
};

test('撞墙', () => {
  const r = runProgram(L, ['right']);
  assert.equal(r.status, 'blocked');
  assert.equal(r.failedAt, 0);
  assert.deepEqual(r.path, [{ x: 0, y: 0 }]);
});

test('出界', () => {
  const r = runProgram(L, ['down', 'up', 'up']);
  assert.equal(r.status, 'outOfBounds');
  assert.equal(r.failedAt, 2);
  assert.deepEqual(r.path, [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 0 }]);
});

test('成功绕过墙', () => {
  const p = ['down', 'right', 'right', 'right', 'up'];
  const r = runProgram(L, p);
  assert.equal(r.status, 'success');
  assert.equal(r.failedAt, -1);
  assert.equal(r.path.length, 6);
  assert.deepEqual(r.path.at(-1), { x: 3, y: 0 });
});

test('没走到 / 路过终点不算', () => {
  assert.equal(runProgram(L, ['down']).status, 'notReached');
  assert.equal(runProgram(L, ['down', 'right', 'right', 'right', 'up', 'down']).status, 'notReached');
  assert.equal(runProgram(L, []).status, 'notReached');
});

const B = {
  id: 't2', cols: 3, rows: 3,
  start: { x: 0, y: 0 }, goal: { x: 2, y: 0 },
  walls: [], bones: [{ x: 1, y: 2 }, { x: 1, y: 1 }], maxCards: 10,
};

test('骨头', () => {
  const miss = runProgram(B, ['right', 'right']);
  assert.equal(miss.status, 'missedBones');
  assert.equal(miss.collected, 0);
  const ok = runProgram(B, ['down', 'down', 'right', 'up', 'right', 'up']);
  assert.equal(ok.status, 'success');
  assert.equal(ok.collected, 2);
  const twice = runProgram(B, ['down', 'right', 'left', 'right']);
  assert.equal(twice.collected, 1, '同一根骨头只算一次');
});

test('solve 求最短解', () => {
  assert.deepEqual(solve({ ...L, walls: [] }), ['right', 'right', 'right']);
  const s = solve(L);
  assert.equal(s.length, 5);
  assert.equal(runProgram(L, s).status, 'success');
  const sb = solve(B);
  assert.equal(sb.length, 6);
  assert.equal(runProgram(B, sb).status, 'success');
});

test('solve 无解返回 null', () => {
  const blocked = { ...L, walls: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }] };
  assert.equal(solve(blocked), null);
});

test('LEVELS 数据合法且全部有解', () => {
  assert.ok(LEVELS.length >= 12, `至少 12 关，现在 ${LEVELS.length}`);
  const ids = new Set();
  let prevLen = 0;
  LEVELS.forEach((lv, i) => {
    assert.ok(!ids.has(lv.id), `id 重复: ${lv.id}`);
    ids.add(lv.id);
    const inside = (p) => p.x >= 0 && p.y >= 0 && p.x < lv.cols && p.y < lv.rows;
    assert.ok(inside(lv.start) && inside(lv.goal), `第 ${i} 关起点/终点越界`);
    for (const w of lv.walls) assert.ok(inside(w), `第 ${i} 关墙越界`);
    for (const b of lv.bones) assert.ok(inside(b), `第 ${i} 关骨头越界`);
    const sol = solve(lv);
    assert.ok(sol, `第 ${i} 关无解`);
    assert.ok(sol.length <= lv.maxCards, `第 ${i} 关最短解 ${sol.length} 步超过 maxCards ${lv.maxCards}`);
    assert.ok(sol.length >= prevLen - 2, `第 ${i} 关难度回落太多`);
    prevLen = Math.max(prevLen, sol.length);
  });
  const first = LEVELS[0];
  assert.ok(first.cols * first.rows <= 9 && solve(first).length <= 3, '第 1 关要非常简单');
  const tail = LEVELS.slice(-3);
  assert.ok(tail.every((lv) => lv.cols >= 6 && lv.rows >= 6), '最后 3 关至少 6×6');
  assert.ok(tail.some((lv) => lv.bones.length > 0 && lv.walls.length > 0), '最后几关要有骨头和障碍');
});
