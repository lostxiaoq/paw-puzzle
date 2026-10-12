// 验收测试：路由 / 星级 / 存储 / 注册表（SPEC 5.1–5.4）
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, toHash } from '../../src/core/router.js';
import { starsFor } from '../../src/core/scoring.js';
import { createStore } from '../../src/core/storage.js';
import { GAMES } from '../../src/games/registry.js';

test('parseRoute 基本路由', () => {
  for (const h of ['', '#', '#/']) assert.deepEqual(parseRoute(h), { name: 'home' });
  assert.deepEqual(parseRoute('#/game/route'), { name: 'levels', gameId: 'route' });
  assert.deepEqual(parseRoute('#/game/cubes/3'), { name: 'play', gameId: 'cubes', level: 3 });
  assert.deepEqual(parseRoute('#/game/mirror/0'), { name: 'play', gameId: 'mirror', level: 0 });
  assert.deepEqual(parseRoute('#/badges'), { name: 'badges' });
});

test('parseRoute 非法输入回首页', () => {
  for (const h of ['#/nope', '#/game', '#/game/route/abc', '#/game/route/-1', '#/game/route/1/2', '#/badges/x', 'garbage']) {
    assert.deepEqual(parseRoute(h), { name: 'home' }, h);
  }
});

test('toHash 是 parseRoute 的逆运算', () => {
  assert.equal(toHash({ name: 'home' }), '#/');
  for (const h of ['#/game/route', '#/game/rotate/7', '#/badges']) assert.equal(toHash(parseRoute(h)), h);
});

test('starsFor', () => {
  assert.equal(starsFor(1), 3);
  assert.equal(starsFor(2), 2);
  assert.equal(starsFor(3), 1);
  assert.equal(starsFor(10), 1);
  assert.equal(starsFor(0), 3);
});

function fakeBackend() {
  const m = new Map();
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('storage 初始进度', () => {
  const s = createStore(fakeBackend());
  assert.deepEqual(s.getProgress('route'), { unlocked: 1, stars: {} });
  assert.equal(s.totalStars(), 0);
});

test('storage 过关解锁并保留最高星', () => {
  const b = fakeBackend();
  const s = createStore(b);
  s.completeLevel('route', 0, 2);
  assert.deepEqual(s.getProgress('route'), { unlocked: 2, stars: { 0: 2 } });
  s.completeLevel('route', 0, 1);
  assert.equal(s.getProgress('route').stars[0], 2);
  s.completeLevel('route', 0, 3);
  assert.equal(s.getProgress('route').stars[0], 3);
  s.completeLevel('route', 4, 1);
  assert.equal(s.getProgress('route').unlocked, 6);
  s.completeLevel('route', 1, 3); // 不会把 unlocked 调低
  assert.equal(s.getProgress('route').unlocked, 6);
  s.completeLevel('cubes', 0, 3);
  assert.equal(s.totalStars(), 3 + 1 + 3 + 3);
  assert.ok(b.m.has('paw-puzzle:v1'));
  JSON.parse(b.m.get('paw-puzzle:v1'));
});

test('storage 数据持久化到新实例', () => {
  const b = fakeBackend();
  createStore(b).completeLevel('mirror', 2, 3);
  const s2 = createStore(b);
  assert.equal(s2.getProgress('mirror').stars[2], 3);
  assert.equal(s2.getProgress('mirror').unlocked, 4);
});

test('storage reset', () => {
  const s = createStore(fakeBackend());
  s.completeLevel('route', 0, 3);
  s.reset();
  assert.deepEqual(s.getProgress('route'), { unlocked: 1, stars: {} });
});

test('storage 后端抛错或损坏时不崩溃', () => {
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const s = createStore(bad);
  s.completeLevel('route', 0, 3);
  assert.equal(s.getProgress('route').stars[0], 3);
  const corrupt = fakeBackend();
  corrupt.setItem('paw-puzzle:v1', '{not json');
  assert.deepEqual(createStore(corrupt).getProgress('route'), { unlocked: 1, stars: {} });
  assert.doesNotThrow(() => createStore(undefined).getProgress('route'));
});

test('GAMES 注册表', async () => {
  assert.deepEqual(GAMES.map((g) => g.id), ['route', 'mirror', 'rotate', 'cubes']);
  assert.deepEqual(GAMES.map((g) => g.pup), ['chase', 'skye', 'rocky', 'rubble']);
  assert.deepEqual(GAMES.map((g) => g.title), ['阿奇巡逻', '天天的魔镜', '灰灰修零件', '小砾搭积木']);
  for (const g of GAMES) {
    assert.ok(Number.isInteger(g.levelCount) && g.levelCount > 0, g.id);
    assert.equal(typeof g.load, 'function');
  }
});
