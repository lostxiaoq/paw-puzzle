// 单元测试：灰灰修零件的界面小工具（任务卡 009）。
// view.js 顶层只 import 纯逻辑模块，pieceSVG 可以在 Node 里直接测。
import test from 'node:test';
import assert from 'node:assert/strict';
import { pieceSVG } from '../../src/games/rotate/view.js';
import { LEVELS } from '../../src/games/rotate/levels.js';

test('pieceSVG 以 <svg 开头、带 viewBox，每个格子画一个立体方块', () => {
  const svg = pieceSVG([[0, 0], [1, 0], [0, 1]]);
  assert.ok(svg.startsWith('<svg'), '应以 <svg 开头');
  assert.match(svg, /viewBox=/, '应有 viewBox');
  // 3 格 = 3 个顶面 rect（彩色主面）
  const tops = svg.match(/rx="0.08"/g) || [];
  assert.equal(tops.length, 3, `应有 3 个方块顶面，实际 ${tops.length}`);
});

test('影子模式：深灰 + 虚线边', () => {
  const svg = pieceSVG([[0, 0], [1, 0]], { color: '#f6c20b', dim: true });
  assert.match(svg, /stroke-dasharray=/, '影子应有虚线边');
  assert.match(svg, /#9aa0ab/, '影子应是深灰色');
  assert.doesNotMatch(svg, /#f6c20b/, '影子不应带关卡原色');
});

test('普通模式：用关卡颜色上色', () => {
  const svg = pieceSVG([[0, 0]], { color: '#ff8c1a' });
  assert.match(svg, /#ff8c1a/, '零件应带关卡颜色');
});

test('所有关卡形状都能画出来（viewBox 覆盖整个形状）', () => {
  for (const lv of LEVELS) {
    const svg = pieceSVG(lv.shape, { color: lv.color });
    const maxX = Math.max(...lv.shape.map((c) => c[0]));
    const maxY = Math.max(...lv.shape.map((c) => c[1]));
    assert.ok(svg.includes(`"${maxX + 0.05}"`) || new RegExp(`viewBox="-0.05 -0.05 ${maxX + 1.1} ${maxY + 1.1}"`).test(svg),
      `${lv.id} 的 viewBox 应盖住整块零件`);
  }
});
