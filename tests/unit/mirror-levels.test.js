// 单元测试：天天的魔镜关卡自检（任务卡 004）。
// 验收测试管 SPEC 的数据合法性，这里管任务卡的加码要求：
// 难度分段（1–3 关 4×4 → 4–7 关 6×6 → 8 关起 8×8）、横线镜子数量、
// 每关的中文名、givenHalf 给色规则、同一关里的颜色对比度。
// 图案本身好不好看，请开 tests/unit/mirror-preview.html 人工检查。
import test from 'node:test';
import assert from 'node:assert/strict';
import { givenHalf } from '../../src/games/mirror/logic.js';
import { LEVELS } from '../../src/games/mirror/levels.js';

test('打印每关概况，确认难度曲线（4×4 → 6×6 → 8×8）', () => {
  console.log('\n天天的魔镜：14 关难度曲线');
  console.log('-----------------------------------');
  LEVELS.forEach((lv, i) => {
    const rows = lv.solution.length;
    const cols = lv.solution[0].length;
    const given = givenHalf(lv).flat().filter((v) => v !== 0).length;
    console.log(
      `  ${String(i + 1).padStart(2)}. ${lv.name}  ${cols}x${rows}  ` +
      `${lv.axis === 'vertical' ? '竖线' : '横线'}  ${lv.colors.length} 色  ` +
      `要涂 ${given} 格  ${lv.colors.join(' ')}`
    );
  });
  console.log('-----------------------------------');
});

test('难度分段符合任务卡要求（1–3 关 4×4，4–7 关 6×6，8 关起 8×8）', () => {
  LEVELS.slice(0, 3).forEach((lv) => {
    assert.equal(lv.solution.length, 4, `${lv.name} 应为 4 行`);
    assert.equal(lv.solution[0].length, 4, `${lv.name} 应为 4 列`);
    assert.equal(lv.colors.length, 1, `${lv.name} 应只有 1 种颜色`);
  });
  LEVELS.slice(3, 7).forEach((lv) => {
    assert.equal(lv.solution.length, 6, `${lv.name} 应为 6 行`);
    assert.equal(lv.solution[0].length, 6, `${lv.name} 应为 6 列`);
    assert.equal(lv.colors.length, 2, `${lv.name} 应有 2 种颜色`);
  });
  LEVELS.slice(7).forEach((lv) => {
    assert.equal(lv.solution.length, 8, `${lv.name} 应为 8 行`);
    assert.equal(lv.solution[0].length, 8, `${lv.name} 应为 8 列`);
    assert.equal(lv.colors.length, 3, `${lv.name} 应有 3 种颜色`);
  });
});

test('至少 12 关、id 唯一、每关有中文名', () => {
  assert.ok(LEVELS.length >= 12, `至少 12 关，现在 ${LEVELS.length}`);
  const ids = new Set(LEVELS.map((lv) => lv.id));
  assert.equal(ids.size, LEVELS.length, '关卡 id 有重复');
  for (const lv of LEVELS) {
    assert.ok(typeof lv.name === 'string' && lv.name.length > 0, `${lv.id} 缺少 name`);
  }
});

test('横线镜子至少 3 关，图案上下轮廓要有起伏（不然看不出是对称）', () => {
  const horizontal = LEVELS.filter((lv) => lv.axis === 'horizontal');
  assert.ok(horizontal.length >= 3, `至少 3 关横线镜子，现在 ${horizontal.length}`);
  for (const lv of horizontal) {
    const filled = lv.solution.map((row) => row.filter((v) => v !== 0).length);
    assert.ok(
      Math.min(...filled) < Math.max(...filled),
      `${lv.name} 每行填色数一样多，上下看不出轮廓变化`
    );
  }
});

test('givenHalf 只给镜子一侧，另一侧全空，且不给出整个答案', () => {
  for (const lv of LEVELS) {
    const rows = lv.solution.length;
    const cols = lv.solution[0].length;
    const half = givenHalf(lv);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const onGivenSide = lv.axis === 'vertical' ? c < cols / 2 : r < rows / 2;
        if (!onGivenSide) {
          assert.equal(half[r][c], 0, `${lv.name} 不该给的一侧出现了颜色`);
        }
      }
    }
    const filled = lv.solution.flat().filter((v) => v !== 0).length;
    const given = half.flat().filter((v) => v !== 0).length;
    assert.ok(given >= 2, `${lv.name} 给出的一半太空`);
    assert.ok(given < filled, `${lv.name} 全给出来了，孩子没得涂`);
  }
});

test('同一关里的颜色两两都要够对比（防止近似色分不清）', () => {
  // 简单的 RGB 欧氏距离：≤ 90 就算"孩子分不清"的近似色。
  const dist = (a, b) => {
    const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
    const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
    return Math.sqrt(pa.reduce((s, v, i) => s + (v - pb[i]) ** 2, 0));
  };
  for (const lv of LEVELS) {
    for (let i = 0; i < lv.colors.length; i++) {
      for (let j = i + 1; j < lv.colors.length; j++) {
        assert.ok(
          dist(lv.colors[i], lv.colors[j]) >= 90,
          `${lv.name} 的颜色太接近：${lv.colors[i]} vs ${lv.colors[j]}`
        );
      }
    }
  }
});
