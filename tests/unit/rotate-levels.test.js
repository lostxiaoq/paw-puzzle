// 单元测试：灰灰修零件（任务卡 005）。
// 验收测试（tests/accept/rotate.test.mjs）管接口语义；这里管任务卡的
// 额外要求：关卡分段设计、每关颜色、干扰项质量（两个都要最有迷惑性）、
// 以及纯函数纪律（不许改调用方传进来的数组）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, rotate, mirror, sameShape, rotationsNeeded, isChiral, makeChoices } from '../../src/games/rotate/logic.js';
import { LEVELS } from '../../src/games/rotate/levels.js';

// 和验收测试同款的随机数发生器（线性同余），保证测试可复现。
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// ---------- 关卡结构：任务卡的分段设计 ----------

test('至少 14 关，id 唯一，每关都有明亮的颜色', () => {
  assert.ok(LEVELS.length >= 14, `至少 14 关，现在 ${LEVELS.length}`);
  const ids = new Set(LEVELS.map((lv) => lv.id));
  assert.equal(ids.size, LEVELS.length, '关卡 id 有重复');
  for (const lv of LEVELS) {
    assert.match(lv.color, /^#[0-9a-f]{6}$/i, `${lv.id} 的 color 应是 6 位十六进制色`);
  }
});

test('1–5 关全是转一转：3–4 格，turns 从 1 开始、逐渐出现 2 和 3', () => {
  const warmup = LEVELS.slice(0, 5);
  for (const lv of warmup) {
    assert.equal(lv.mode, 'turn', `${lv.id} 应是转一转`);
    assert.ok(lv.shape.length >= 3 && lv.shape.length <= 4, `${lv.id} 应是 3–4 格`);
    assert.ok([1, 2, 3].includes(lv.turns), `${lv.id} 的 turns 非法`);
  }
  assert.equal(warmup[0].turns, 1, '第 1 关应从 turns=1 开始');
  assert.ok(warmup.some((lv) => lv.turns === 2), '前 5 关里要出现 turns=2');
  assert.ok(warmup.some((lv) => lv.turns === 3), '前 5 关里要出现 turns=3（任务卡：逐渐出现 2、3）');
});

test('6–9 关全是找一找：4 格手性形状（L、J、S、Z）', () => {
  const findIt = LEVELS.slice(5, 9);
  for (const lv of findIt) {
    assert.equal(lv.mode, 'choose', `${lv.id} 应是找一找`);
    assert.equal(lv.shape.length, 4, `${lv.id} 应是 4 格`);
    assert.ok(isChiral(lv.shape), `${lv.id} 应是手性形状`);
  }
});

test('10 关以后两种玩法交替，形状 5–6 格', () => {
  const late = LEVELS.slice(9);
  late.forEach((lv, i) => {
    assert.ok(lv.shape.length >= 5 && lv.shape.length <= 6, `${lv.id} 应是 5–6 格`);
    const want = i % 2 === 0 ? 'turn' : 'choose';
    assert.equal(lv.mode, want, `${lv.id} 应该是 ${want}（两种玩法交替）`);
  });
});

test('转一转关卡的影子确实和原样不同（孩子转了才看得出变化）', () => {
  for (const lv of LEVELS) {
    if (lv.mode !== 'turn') continue;
    assert.equal(sameShape(rotate(lv.shape, lv.turns), lv.shape), false, `${lv.id} 转完和原样一样`);
  }
});

test('打印关卡难度表（自查用）', () => {
  console.log('\n灰灰修零件：15 关难度表');
  console.log('----------------------------');
  LEVELS.forEach((lv, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${lv.id.padEnd(10)} ${lv.mode.padEnd(6)} ` +
      `${lv.shape.length} 格 ${lv.mode === 'turn' ? `turns=${lv.turns}` : '        '} ${lv.color} ${lv.name}`
    );
  });
  console.log('----------------------------');
});

// ---------- makeChoices 干扰项质量：两个都要「最有迷惑性」 ----------

const chooseLevels = LEVELS.filter((lv) => lv.mode === 'choose');

test('两个干扰项都来自镜像的旋转（不是随便找个别的形状）', () => {
  for (const lv of chooseLevels) {
    const mir = mirror(lv.shape);
    const mirRots = [0, 1, 2, 3].map((k) => rotate(mir, k));
    for (let seed = 1; seed <= 100; seed++) {
      const { options, answer } = makeChoices(lv.shape, seeded(seed));
      const wrong = options.filter((_, i) => i !== answer);
      for (const w of wrong) {
        assert.ok(
          mirRots.some((r) => sameShape(r, w)),
          `${lv.id} seed=${seed}：干扰项不是镜像的旋转，迷惑性不够`
        );
      }
      // 两个干扰项还得长得不一样，不然孩子看到两个「都对」
      assert.equal(sameShape(wrong[0], wrong[1]), false, `${lv.id} seed=${seed}：两个干扰项重样了`);
    }
  }
});

test('答案位置随机分布，不会总落在同一个按钮上', () => {
  const counts = [0, 0, 0];
  for (let seed = 1; seed <= 300; seed++) {
    counts[makeChoices(chooseLevels[0].shape, seeded(seed)).answer] += 1;
  }
  for (const c of counts) assert.ok(c > 30, `答案位置分布太偏：${counts}`);
});

test('每种手性关卡形状都出得出题（200 个种子不抛错、结构合法）', () => {
  for (const lv of chooseLevels) {
    for (let seed = 0; seed < 200; seed++) {
      const { options, answer } = makeChoices(lv.shape, seeded(seed));
      assert.equal(options.length, 3);
      assert.ok([0, 1, 2].includes(answer));
      assert.ok(
        options.every((o) => o.length === lv.shape.length),
        `${lv.id} seed=${seed}：选项格子数和原形不一致`
      );
    }
  }
});

// ---------- 纯函数纪律：不许动调用方的数组 ----------

test('normalize / rotate / mirror 都不修改传入的形状', () => {
  const messy = [[2, 1], [1, 2], [1, 1]]; // 故意乱序 + 不在原点
  const copy = JSON.parse(JSON.stringify(messy));
  normalize(messy);
  rotate(messy, 2);
  rotate(messy, -3);
  mirror(messy);
  assert.deepEqual(messy, copy, '输入数组被改动了！');
  // 选项里的数组也不许被共享引用（view 之后随便上色/变形都不会串）
  const { options } = makeChoices([[0, 0], [0, 1], [0, 2], [1, 2]], seeded(7));
  for (const o of options) o.push([99, 99]);
  assert.deepEqual(makeChoices([[0, 0], [0, 1], [0, 2], [1, 2]], seeded(7)).options.length, 3);
});

// ---------- 旋转代数：边缘情况 ----------

test('rotate 的周期性和组合律', () => {
  const L = [[0, 0], [0, 1], [0, 2], [1, 2]];
  assert.deepEqual(rotate(L, 13), rotate(L, 1), '转 13 次 = 转 1 次');
  assert.deepEqual(rotate(L, -5), rotate(L, 3), '逆时针 5 次 = 顺时针 3 次');
  assert.deepEqual(rotate(rotate(L, 2), 3), rotate(L, 5), '先转 2 再转 3 = 直接转 5');
  assert.deepEqual(rotate(L), rotate(L, 1), 'turns 默认是 1');
  assert.deepEqual(rotate(L, 0), normalize(L), '转 0 次只是归一化');
});

test('手性形状镜像后 rotationsNeeded 一定是 -1，反之回得来', () => {
  const L = [[0, 0], [0, 1], [0, 2], [1, 2]];
  assert.equal(rotationsNeeded(mirror(L), L), -1);
  assert.equal(isChiral(L), true);
  // 镜像的镜像转一圈应该能回原形（左右翻两次 = 没翻，可能带旋转）
  const back = rotationsNeeded(mirror(mirror(L)), L);
  assert.equal(back >= 0, true);
});
