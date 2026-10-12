// 单元测试：狗狗形象（补充验收之外的自我检查）
import test from 'node:test';
import assert from 'node:assert/strict';
import { PUPS, pupSVG } from '../../src/art/pups.js';

test('PUPS 的 id 唯一且主色是合法 hex', () => {
  const ids = PUPS.map((p) => p.id);
  assert.equal(new Set(ids).size, 6);
  for (const p of PUPS) {
    assert.match(p.color, /^#[0-9a-fA-F]{6}$/);
    assert.equal(typeof p.role, 'string');
    assert.ok(p.role.length > 0);
  }
});

test('默认参数：size=120、mood=normal', () => {
  assert.match(pupSVG('chase'), /width="120"/);
  assert.equal(pupSVG('chase'), pupSVG('chase', { mood: 'normal' }));
});

test('非法 size 不会写进 SVG', () => {
  const svg = pupSVG('skye', { size: 96 });
  assert.match(svg, /width="96"/);
  assert.doesNotMatch(svg, /width="undefined"/);
});

test('SVG 标签配对完整（svg / g / path 自闭合）', () => {
  for (const p of PUPS) {
    for (const mood of ['normal', 'happy', 'thinking']) {
      const svg = pupSVG(p.id, { mood });
      assert.equal((svg.match(/<svg/g) || []).length, 1);
      assert.equal((svg.match(/<\/svg>/g) || []).length, 1);
      const open = (svg.match(/<g[\s>]/g) || []).length;
      const close = (svg.match(/<\/g>/g) || []).length;
      assert.equal(open, close, `${p.id}/${mood} 的 <g> 标签没配对`);
      // path 必须全部自闭合
      for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
        assert.ok(m[0].endsWith('/>'), `${p.id}/${mood} 有未闭合的 path: ${m[0]}`);
      }
    }
  }
});

test('mood 传未知值时回退到 normal（不抛错）', () => {
  assert.equal(pupSVG('zuma', { mood: 'silly' }), pupSVG('zuma', { mood: 'normal' }));
});
