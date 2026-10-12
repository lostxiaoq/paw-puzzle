// 单元测试：正确答案不能从外观或顺序里漏出来（任务卡 010b）。
// data-answer 属性只是给自动测试用的标记，任何样式都不允许依赖它；
// 选项在页面上的先后顺序也必须随机打乱。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { numberChoices } from '../../src/games/cubes/logic.js';
import { makeFrontChoices } from '../../src/games/cubes/view.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// 和 smoke.mjs 一样的种子随机数
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

test('cubes.css 不允许出现依赖 data-answer 的样式规则', () => {
  const css = fs.readFileSync(path.join(here, '../../styles/cubes.css'), 'utf8');
  // 去掉注释再查，防止注释里提到属性名时误报
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /data-answer/i, '样式表里不能有任何基于 data-answer 的选择器');
});

test('numberChoices：正确答案的位置随种子打乱', () => {
  const positions = new Set();
  for (let seed = 1; seed <= 30; seed++) positions.add(numberChoices(5, seeded(seed)).indexOf(5));
  assert.ok(positions.size >= 2, `位置要会变，实际只有 ${[...positions]} `);
});

test('makeFrontChoices：正确答案的位置随种子打乱', () => {
  const h = [[1, 2], [2, 1]]; // 任意一个 2×2 堆即可
  const positions = new Set();
  for (let seed = 1; seed <= 30; seed++) positions.add(makeFrontChoices(h, seeded(seed)).answer);
  assert.ok(positions.size >= 2, `位置要会变，实际只有 ${[...positions]} `);
});
