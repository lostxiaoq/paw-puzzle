// 单元测试：小砾搭积木的界面小工具（任务卡 010）。
// view.js 顶层只 import 纯逻辑模块，导出的画图 / 出题函数可以在 Node 里直接测。
import test from 'node:test';
import assert from 'node:assert/strict';
import { isoPoint, pileSVG, frontSVG, makeFrontChoices, CUBE_COLOR } from '../../src/games/cubes/view.js';
import { countCubes, frontHeights, leftHeights } from '../../src/games/cubes/logic.js';
import { LEVELS } from '../../src/games/cubes/levels.js';

// 和 smoke.mjs 一样的种子随机数
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('isoPoint 投影公式：屏幕 x = (col − row)·W/2，y = (col + row)·H/2 − z·H', () => {
  assert.deepEqual(isoPoint(0, 0, 0), { x: 0, y: 0 });
  const p = isoPoint(1, 2, 3);
  assert.equal(p.x, (2 - 1) * 28); // W = 56
  assert.equal(p.y, (1 + 2) * 14 - 3 * 28); // H = 28
});

test('pileSVG：每块积木画一个 <g class="cube">，每块三个可见面', () => {
  for (const lv of LEVELS) {
    const svg = pileSVG(lv.heights);
    assert.ok(svg.startsWith('<svg'), `${lv.id} 应以 <svg 开头`);
    assert.match(svg, /viewBox=/, `${lv.id} 应有 viewBox`);
    const cubes = svg.match(/<g class="cube"/g) || [];
    assert.equal(cubes.length, countCubes(lv.heights), `${lv.id} 积木块数`);
    // 每块积木 = 左面 + 右面 + 顶面 = 3 个 polygon
    for (const g of svg.match(/<g class="cube"[\s\S]*?<\/g>/g) || []) {
      assert.equal((g.match(/<polygon/g) || []).length, 3, `${lv.id} 每块积木 3 个面`);
    }
  }
});

test('pileSVG 画家算法：row+col 小的先画；同一格 z 低的先画', () => {
  for (const lv of LEVELS) {
    const svg = pileSVG(lv.heights);
    const order = [...svg.matchAll(/data-cube="(\d+),(\d+),(\d+)"/g)].map((m) => ({
      r: +m[1], c: +m[2], z: +m[3],
    }));
    assert.equal(order.length, countCubes(lv.heights), `${lv.id} data-cube 数量`);
    for (let i = 1; i < order.length; i++) {
      const a = order[i - 1];
      const b = order[i];
      const sumA = a.r + a.c;
      const sumB = b.r + b.c;
      const ok = sumA < sumB
        || (sumA === sumB && (a.r < b.r || (a.r === b.r && a.z < b.z)));
      assert.ok(ok, `${lv.id} 画家顺序错：${JSON.stringify(a)} 应排在 ${JSON.stringify(b)} 前面`);
    }
  }
});

test('pileSVG：地板 + 黄色积木；frontOutline 模式有轮廓组', () => {
  const plain = pileSVG([[1, 1], [1, 1]]);
  assert.match(plain, /class="floor"/, '应有地板');
  assert.match(plain, new RegExp(CUBE_COLOR), '应用小砾的黄色');
  const lv = LEVELS.find((l) => l.mode === 'front');
  const outlined = pileSVG(lv.heights, { frontOutline: true });
  assert.match(outlined, /class="front-outline"/, '应有轮廓组');
  const cols = frontHeights(lv.heights).filter((v) => v > 0).length;
  const polys = (outlined.match(/<g class="front-outline">[\s\S]*?<\/g>/g)[0].match(/<polygon/g) || []).length;
  assert.equal(polys, cols, '每个非空列一段轮廓');
  assert.doesNotMatch(plain, /front-outline/, '默认不画轮廓');
});

test('frontSVG：每个单位块一个圆角方块，底部对齐，最高块最亮', () => {
  const svg = frontSVG([2, 1]);
  assert.equal((svg.match(/<rect/g) || []).length, 3, '[2,1] 应画 3 块');
  assert.match(svg, /viewBox="0 0 52 104"/, 'viewBox = 列数×cell 高 × maxH×cell');
  // 顶块用原色，下面的块用暗一档
  assert.match(svg, new RegExp(`fill="${CUBE_COLOR}"`), '顶块应是原色');
  assert.match(svg, /fill="#ca9f09"/, '下块应是暗一档');
  // 所有 front 关卡的正面高度都能画出来
  for (const lv of LEVELS) {
    const s = frontSVG(frontHeights(lv.heights));
    assert.equal((s.match(/<rect/g) || []).length, frontHeights(lv.heights).reduce((a, b) => a + b, 0), lv.id);
  }
});

test('makeFrontChoices：3 个互不相同选项，恰好一个是 frontHeights，都在 0–4', () => {
  for (const lv of LEVELS) {
    const answer = frontHeights(lv.heights);
    for (let seed = 1; seed <= 20; seed++) {
      const { options, answer: idx } = makeFrontChoices(lv.heights, seeded(seed));
      assert.equal(options.length, 3, `${lv.id} seed ${seed} 应有 3 个选项`);
      const keys = new Set(options.map((o) => o.join(',')));
      assert.equal(keys.size, 3, `${lv.id} seed ${seed} 选项要互不相同`);
      assert.ok(options.every((o) => o.length === answer.length), '选项列数和答案一致');
      assert.ok(options.every((o) => o.every((v) => v >= 0 && v <= 4)), '高度都在 0–4');
      assert.deepEqual(options[idx], answer, 'answer 下标指向真正的答案');
      assert.equal(options.filter((o) => o.join(',') === answer.join(',')).length, 1, '答案只出现一次');
      // 同一串随机数结果必须相同
      assert.deepEqual(makeFrontChoices(lv.heights, seeded(seed)).options, options, `${lv.id} 确定性`);
      // 两个干扰项都要和答案不同
      options.forEach((o, i) => {
        if (i !== idx) assert.notEqual(o.join(','), answer.join(','), '干扰项不能等于答案');
      });
    }
  }
});

test('makeFrontChoices：干扰项优先用 leftHeights（有效时必须被选上）', () => {
  // 找一个 leftHeights 有效（全 ≥1、列数和答案一致）且和 frontHeights 不同的 front 关卡
  const lv = LEVELS.find((l) => l.mode === 'front'
    && leftHeights(l.heights).length === frontHeights(l.heights).length
    && leftHeights(l.heights).join(',') !== frontHeights(l.heights).join(',')
    && leftHeights(l.heights).every((v) => v >= 1));
  assert.ok(lv, '测试前提：存在这样的关卡');
  const { options } = makeFrontChoices(lv.heights, seeded(7));
  const keys = options.map((o) => o.join(','));
  assert.ok(keys.includes(leftHeights(lv.heights).join(',')), 'leftHeights 应出现在选项里');
});

test('makeFrontChoices：leftHeights 含 0（或等于答案）时跳过它，不破坏 1–4 约束', () => {
  // 造一个左视含 0 的堆：只有最后一行有积木
  const h = [[0, 0], [2, 1]];
  const { options } = makeFrontChoices(h, seeded(3));
  assert.equal(options.length, 3);
  assert.ok(options.every((o) => o.every((v) => v >= 0 && v <= 4)));
  assert.ok(new Set(options.map((o) => o.join(','))).size === 3);
});
