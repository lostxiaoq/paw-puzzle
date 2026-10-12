// 验收测试：狗狗形象（SPEC 2、5.5）
import test from 'node:test';
import assert from 'node:assert/strict';
import { PUPS, pupSVG } from '../../src/art/pups.js';

const EXPECTED = [
  ['chase', '阿奇', '#1f5fbf'],
  ['marshall', '毛毛', '#d62828'],
  ['skye', '天天', '#ff6fa8'],
  ['rubble', '小砾', '#f6c20b'],
  ['rocky', '灰灰', '#3a9d4a'],
  ['zuma', '路马', '#ff8c1a'],
];

test('PUPS 元数据', () => {
  assert.equal(PUPS.length, 6);
  for (const [id, name, color] of EXPECTED) {
    const p = PUPS.find((x) => x.id === id);
    assert.ok(p, id);
    assert.equal(p.name, name);
    assert.equal(p.color.toLowerCase(), color);
    assert.equal(typeof p.role, 'string');
  }
});

test('pupSVG 输出合法 SVG 且尺寸正确', () => {
  for (const [id, , color] of EXPECTED) {
    const svg = pupSVG(id, { size: 200 });
    assert.ok(svg.trimStart().startsWith('<svg'), id);
    assert.match(svg, /viewBox="[^"]+"/);
    assert.match(svg, /width="200"/);
    assert.match(svg, /height="200"/);
    assert.ok(svg.toLowerCase().includes(color), `${id} 应使用主色 ${color}`);
    assert.ok(svg.trimEnd().endsWith('</svg>'));
    assert.ok(svg.length > 600, `${id} 图形太简单`);
  }
  assert.match(pupSVG('chase'), /width="120"/);
});

test('三种表情互不相同', () => {
  for (const [id] of EXPECTED) {
    const s = new Set(['normal', 'happy', 'thinking'].map((mood) => pupSVG(id, { mood })));
    assert.equal(s.size, 3, id);
  }
});

test('每只狗形象不同', () => {
  const s = new Set(EXPECTED.map(([id]) => pupSVG(id).replace(/#[0-9a-fA-F]{6}/g, '')));
  assert.ok(s.size >= 4, '去掉颜色后至少要有 4 种不同造型（徽章/斑点等差异）');
});

// 浏览器遇到非法属性只会在控制台报错、把图形画成黑色，单看字符串发现不了，所以逐个属性检查
const COLOR_OK = /^(none|transparent|currentColor|white|black|#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?([0-9a-fA-F]{2})?|rgba?\([\d.,\s%]+\)|url\(#[\w-]+\))$/;
test('SVG 属性值合法（颜色、路径、数字）', () => {
  for (const [id] of EXPECTED) {
    for (const mood of ['normal', 'happy', 'thinking']) {
      const svg = pupSVG(id, { mood });
      for (const [, attr, val] of svg.matchAll(/\s([a-zA-Z-]+)="([^"]*)"/g)) {
        const where = `${id}/${mood} ${attr}="${val.slice(0, 40)}"`;
        assert.ok(!/undefined|NaN|null|\$\{/.test(val), `非法值 ${where}`);
        if (attr === 'fill' || attr === 'stroke' || attr === 'stop-color') assert.match(val, COLOR_OK, `颜色非法 ${where}`);
        if (attr === 'd') assert.match(val, /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-+eE\s]+$/, `路径非法 ${where}`);
        if (['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'stroke-width', 'opacity'].includes(attr)) {
          assert.ok(Number.isFinite(Number(val)), `数字非法 ${where}`);
        }
      }
    }
  }
});

test('未知 id 抛错', () => {
  assert.throws(() => pupSVG('ryder'));
});
