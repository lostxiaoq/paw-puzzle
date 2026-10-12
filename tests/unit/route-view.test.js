// 单元测试：阿奇巡逻界面的小工具（任务卡 007b 的核心回归点：箭头方向）。
// view.js 顶层不碰 DOM，可以直接在 Node 里 import。
import test from 'node:test';
import assert from 'node:assert/strict';
import { arrowSVG, firstWrongIndex } from '../../src/games/route/view.js';

test('arrowSVG：四个方向各转一个角度', () => {
  assert.ok(arrowSVG('up').startsWith('<svg'), '返回的是 SVG 字符串');
  assert.ok(!arrowSVG('up').includes('rotate('), 'up 不旋转');
  assert.ok(arrowSVG('down').includes('rotate(180 12 12)'), 'down 转 180°');
  assert.ok(arrowSVG('left').includes('rotate(-90 12 12)'), 'left 转 -90°');
  assert.ok(arrowSVG('right').includes('rotate(90 12 12)'), 'right 转 90°');
});

test('arrowSVG：四个方向的产出互不相同（007 的 bug 就是全相同）', () => {
  const dirs = ['up', 'down', 'left', 'right'];
  assert.equal(new Set(dirs.map(arrowSVG)).size, 4);
});

test('arrowSVG：未知 / 缺省方向按朝上兜底，不抛错', () => {
  assert.equal(arrowSVG(), arrowSVG('up'));
  assert.equal(arrowSVG('???'), arrowSVG('up'));
});

test('firstWrongIndex：找出第一处不一样（提示用，回归保护）', () => {
  assert.equal(firstWrongIndex(['up', 'left'], ['up', 'right', 'down']), 1);
  assert.equal(firstWrongIndex(['up'], ['up', 'right']), 1); // 短了 → 指向下一格
  assert.equal(firstWrongIndex(['up', 'left'], ['up', 'left']), -1); // 全对
});
