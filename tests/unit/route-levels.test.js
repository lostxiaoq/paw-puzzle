// 单元测试：阿奇巡逻关卡自检（任务卡 003）。
// 用 solve() 逐关打印最短步数，确认难度曲线平滑；再把求出的解回放一遍。
import test from 'node:test';
import assert from 'node:assert/strict';
import { runProgram, solve } from '../../src/games/route/logic.js';
import { LEVELS } from '../../src/games/route/levels.js';

test('打印每关最短步数，确认难度曲线平滑', () => {
  console.log('\n阿奇巡逻：14 关难度曲线（最短解步数）');
  console.log('-----------------------------------');
  let prev = 0;
  LEVELS.forEach((lv, i) => {
    const sol = solve(lv);
    assert.ok(sol, `第 ${i + 1} 关（${lv.id}）无解`);
    assert.ok(sol.length <= lv.maxCards, `第 ${i + 1} 关最短解超过 maxCards`);
    assert.ok(
      sol.length >= prev - 2,
      `第 ${i + 1} 关难度回落太多（${prev} -> ${sol.length}）`
    );
    console.log(
      `  ${String(i + 1).padStart(2)}. ${lv.id}  ${lv.cols}x${lv.rows}  ` +
      `最短 ${String(sol.length).padStart(2)} 步  ` +
      `骨头 ${lv.bones.length} 根  障碍 ${lv.walls.length} 个  ` +
      `卡槽 ${lv.maxCards}  主题 ${lv.theme}`
    );
    prev = Math.max(prev, sol.length);
  });
  console.log('-----------------------------------');
});

test('solve 给出的解回放后必须 success，且 maxCards = 最短步数 + 2', () => {
  for (const lv of LEVELS) {
    const sol = solve(lv);
    assert.ok(sol, `${lv.id} 无解`);
    const r = runProgram(lv, sol);
    assert.equal(r.status, 'success', `${lv.id} 的最短解回放失败`);
    assert.equal(r.collected, lv.bones.length, `${lv.id} 有骨头没吃到`);
    assert.equal(lv.maxCards, sol.length + 2, `${lv.id} 的 maxCards 不是最短步数 + 2`);
  }
});

test('关卡分段符合任务卡要求（热身 / 绕路 / 收集骨头）', () => {
  LEVELS.slice(0, 4).forEach((lv) => {
    assert.ok(lv.cols <= 4 && lv.rows <= 4, `${lv.id} 热身关太大`);
    assert.equal(lv.walls.length, 0, `${lv.id} 热身关不该有障碍`);
    assert.equal(lv.bones.length, 0, `${lv.id} 热身关不该有骨头`);
    assert.ok(solve(lv).length <= 4, `${lv.id} 热身关超过 4 步`);
  });
  LEVELS.slice(4, 9).forEach((lv) => {
    assert.ok(lv.cols === 5 && lv.rows === 5, `${lv.id} 绕路关要 5×5`);
    assert.ok(lv.walls.length > 0, `${lv.id} 绕路关要有障碍`);
    assert.ok(lv.bones.length <= 1, `${lv.id} 绕路关骨头不超过 1 根`);
    assert.ok(solve(lv).length >= 5 && solve(lv).length <= 8, `${lv.id} 绕路关步数应在 5–8 步`);
  });
  LEVELS.slice(9).forEach((lv) => {
    assert.ok(lv.cols >= 6 && lv.rows >= 6, `${lv.id} 收集关至少 6×6`);
    assert.ok(lv.bones.length >= 2 && lv.bones.length <= 3, `${lv.id} 收集关要 2–3 根骨头`);
    assert.ok(lv.walls.length > 0, `${lv.id} 收集关要有障碍`);
    assert.ok(solve(lv).length >= 8 && solve(lv).length <= 14, `${lv.id} 收集关步数应在 8–14 步`);
  });
});

test('每关都有 theme 且取值合法', () => {
  const themes = new Set(['park', 'city', 'beach']);
  for (const lv of LEVELS) {
    assert.ok(themes.has(lv.theme), `${lv.id} 的 theme 不合法：${lv.theme}`);
  }
});

test('至少 14 关，id 唯一', () => {
  assert.ok(LEVELS.length >= 14, `至少 14 关，现在 ${LEVELS.length}`);
  const ids = new Set(LEVELS.map((lv) => lv.id));
  assert.equal(ids.size, LEVELS.length, '关卡 id 有重复');
});
