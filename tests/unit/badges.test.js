// 徽章规则单元测试（任务卡 011）：src/badges.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { earnedBadges, totalStarsOf } from '../../src/badges.js';

// 小工具：造一个游戏的进度
const prog = (stars, unlocked) => ({ unlocked: unlocked ?? Object.keys(stars).length + 1, stars });

test('没有任何进度时，6 枚徽章全部未获得', () => {
  assert.deepEqual(earnedBadges({}), {
    chase: false,
    skye: false,
    rocky: false,
    rubble: false,
    marshall: false,
    zuma: false,
  });
});

test('每个游戏正好过 5 关 → 对应狗狗徽章获得', () => {
  const data = {
    route: prog({ 0: 3, 1: 2, 2: 1, 3: 3, 4: 1 }),
    mirror: prog({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }),
    rotate: prog({ 0: 3, 1: 3, 2: 3, 3: 3, 4: 3 }),
    cubes: prog({ 0: 2, 1: 2, 2: 2, 3: 2, 4: 2 }),
  };
  const got = earnedBadges(data);
  assert.equal(got.chase, true);
  assert.equal(got.skye, true);
  assert.equal(got.rocky, true);
  assert.equal(got.rubble, true);
  // 4 只都过 5 关 → 总星数至少 20，但 < 30 时毛毛还不给
  // （上面 route 10 + mirror 5 + rotate 15 + cubes 10 = 40，其实已 ≥30）
});

test('过 4 关不够：阿奇徽章不亮，路马已满足', () => {
  const data = {
    route: prog({ 0: 3, 1: 3, 2: 3, 3: 1 }), // 4 关
    mirror: prog({ 0: 1 }),
    rotate: prog({ 0: 1 }),
    cubes: prog({ 0: 1 }),
  };
  const got = earnedBadges(data);
  assert.equal(got.chase, false, '只过 4 关，阿奇不给');
  assert.equal(got.zuma, true, '四个游戏都至少过 1 关，路马给');
});

test('毛毛：总星数 ≥ 30 才亮', () => {
  // 29 颗不给
  const low = {
    route: prog({ 0: 3, 1: 3, 2: 3, 3: 3, 4: 3 }), // 15
    mirror: prog({ 0: 3, 1: 3, 2: 3, 3: 3 }), // 12
    rotate: prog({ 0: 1 }), // 1
    cubes: prog({ 0: 1 }), // 1
  }; // 合计 29
  assert.equal(earnedBadges(low).marshall, false);
  // 30 颗给
  low.cubes.stars[1] = 2; // 29 + 2 = 31
  assert.equal(earnedBadges(low).marshall, true);
});

test('路马：四个游戏都至少过 1 关；缺一个都不行', () => {
  const three = {
    route: prog({ 0: 3 }),
    mirror: prog({ 0: 3 }),
    rotate: prog({ 0: 3 }),
  };
  assert.equal(earnedBadges(three).zuma, false, '只玩了 3 个游戏');
  three.cubes = prog({ 0: 1 });
  assert.equal(earnedBadges(three).zuma, true);
});

test('过关定义 = 该关有星数记录（1 星也算过关）', () => {
  const data = { route: prog({ 0: 1, 1: 1, 2: 1, 3: 1, 4: 1 }) };
  assert.equal(earnedBadges(data).chase, true, '都是 1 星也算过 5 关');
});

test('空进度 / 坏数据不炸', () => {
  assert.doesNotThrow(() => earnedBadges(undefined));
  assert.doesNotThrow(() => earnedBadges(null));
  assert.doesNotThrow(() => earnedBadges({ route: { stars: 'oops' } }));
  assert.equal(earnedBadges(null).chase, false);
});

test('totalStarsOf 与 storage.totalStars 口径一致', () => {
  const data = {
    route: prog({ 0: 3, 1: 2 }),
    mirror: prog({ 0: 1 }),
    rotate: prog({}),
    cubes: prog({ 0: 3, 1: 3, 2: 3 }),
  };
  assert.equal(totalStarsOf(data), 3 + 2 + 1 + 0 + 3 + 3 + 3);
});
