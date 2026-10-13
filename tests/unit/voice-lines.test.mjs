// 台词表单元测试（任务卡 014）：src/voice/lines.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { LINES, line } from '../../src/voice/lines.js';
import { PUPS } from '../../src/art/pups.js';
import { LEVELS as routeLevels } from '../../src/games/route/levels.js';
import { LEVELS as mirrorLevels } from '../../src/games/mirror/levels.js';
import { LEVELS as rotateLevels } from '../../src/games/rotate/levels.js';
import { LEVELS as cubesLevels } from '../../src/games/cubes/levels.js';

test('每句台词都有 id / speaker / text，且 speaker 是 6 只狗狗之一', () => {
  const pupIds = new Set(PUPS.map((p) => p.id));
  const seen = new Set();
  for (const l of LINES) {
    assert.equal(typeof l.id, 'string', JSON.stringify(l));
    assert.ok(l.id.length > 0, JSON.stringify(l));
    assert.ok(pupIds.has(l.speaker), `speaker 非法：${l.id} → ${l.speaker}`);
    assert.equal(typeof l.text, 'string', JSON.stringify(l));
    assert.ok(l.text.length > 0, `空台词：${l.id}`);
    assert.ok(!seen.has(l.id), `id 重复：${l.id}`);
    seen.add(l.id);
  }
});

test('每句不超过 30 个字', () => {
  for (const l of LINES) {
    assert.ok(l.text.length <= 30, `${l.id} 太长（${l.text.length} 字）：${l.text}`);
  }
});

test('mirror.done 展开了每一关的「你画出了一个 ××！」', () => {
  const texts = new Set(LINES.filter((l) => l.id.startsWith('mirror.done.')).map((l) => l.text));
  for (const lv of mirrorLevels) {
    assert.ok(texts.has(`你画出了一个${lv.name}！`), `缺关卡 ${lv.id}（${lv.name}）`);
  }
});

test('rotate 的修好 / 找对台词覆盖两种玩法的每一关', () => {
  const texts = new Set(LINES.map((l) => l.text));
  // rotate-2 / rotate-3 都叫「拐角」，台词带序号区分（清单键不能重复）
  for (const lv of rotateLevels) {
    if (lv.mode === 'turn') assert.ok(texts.has(`修好啦！${lv.name}装上啦！`) || texts.has(`修好啦！第 1 个拐角装上啦！`) || texts.has(`修好啦！第 2 个拐角装上啦！`), `缺 ${lv.id}`);
    else assert.ok(texts.has(`找对啦！${lv.name}转好了！`), `缺 ${lv.id}`);
  }
  assert.ok(texts.has('修好啦！第 1 个拐角装上啦！'), 'rotate-2 的拐角台词');
  assert.ok(texts.has('修好啦！第 2 个拐角装上啦！'), 'rotate-3 的拐角台词');
});

test('数字台词覆盖所有数一数关卡可能出现的块数', () => {
  // 数一数关卡的块数范围（从 levels.js 数出来：最小 3、最大 16）
  let min = Infinity;
  let max = 0;
  for (const lv of cubesLevels) {
    const total = lv.heights.flat().reduce((a, b) => a + b, 0);
    if (lv.mode === 'count') {
      min = Math.min(min, total);
      max = Math.max(max, total);
    }
  }
  for (let n = min; n <= max; n++) {
    assert.ok(LINES.some((l) => l.id === `cubes.count.${n}` && l.text === String(n)), `缺数字台词 ${n}`);
  }
});

test('过关夸奖语至少 5 句，随机会说哪句都要在表里', () => {
  const praises = LINES.filter((l) => l.id.startsWith('common.praise.'));
  assert.ok(praises.length >= 5, '至少 5 句夸奖语');
});

test('6 只狗狗都有徽章道谢和解锁提示台词', () => {
  for (const p of PUPS) {
    assert.ok(LINES.some((l) => l.id === `badge.thanks.${p.id}`), `缺 ${p.id} 道谢`);
    assert.ok(LINES.some((l) => l.id === `badge.hint.${p.id}`), `缺 ${p.id} 提示`);
  }
});

test('route 关卡带骨头 / 不带骨头的开场白都在台词表里', () => {
  const texts = new Set(LINES.map((l) => l.text));
  assert.ok(texts.has('先吃光骨头，再去找小猫哦！'));
  assert.ok(texts.has('帮阿奇找小猫！点箭头排路线，再出发'));
});

test('line() 按 id 取台词，取不到时给兜底句而不是 undefined', () => {
  assert.equal(line('route.levelStart').text, '阿奇准备好啦，出发！');
  const fb = line('no.such.id');
  assert.equal(typeof fb.text, 'string');
  assert.ok(fb.text.length > 0);
});

test('每个游戏都有 levelStart，且说话人是该游戏的主持狗狗', () => {
  assert.equal(line('route.levelStart').speaker, 'chase');
  assert.equal(line('mirror.levelStart').speaker, 'skye');
  assert.equal(line('rotate.levelStart').speaker, 'rocky');
  assert.equal(line('cubes.levelStart').speaker, 'rubble');
});

test('台词 id 没有「speaker|text」重复（清单键必须一一对应）', () => {
  const seen = new Set();
  for (const l of LINES) {
    const k = `${l.speaker}|${l.text}`;
    assert.ok(!seen.has(k), `重复台词：${k}`);
    seen.add(k);
  }
});

test('route/mirror/rotate/cubes 的主持狗狗和 SPEC 第 3 节一致', () => {
  const host = {
    'route.intro': 'chase',
    'mirror.introVertical': 'skye',
    'rotate.introTurn': 'rocky',
    'cubes.introCount': 'rubble',
  };
  for (const [id, pup] of Object.entries(host)) {
    assert.equal(line(id).speaker, pup, id);
  }
});
