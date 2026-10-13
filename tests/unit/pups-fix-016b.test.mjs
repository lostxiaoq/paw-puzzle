// 单元测试（任务卡 016b）：天天的眼睛不被耳朵盖住、灰灰的乱毛是圆润曲线
// 背景：016 审查发现 1) 天天右耳画在脸的上层挡住右眼；2) 灰灰帽檐下的
// 「乱毛」是一排尖三角，像獠牙。这两个测试把修复固定下来，防止回归。
import test from 'node:test';
import assert from 'node:assert/strict';
import { pupSVG } from '../../src/art/pups.js';

// 脑袋：圆心 (100,92) 半径 55，SVG 里唯一的 stroke-width=3 大圆
const HEAD = '<circle cx="100" cy="92" r="55"';

// 眼睛区域（两只眼睛的外接框，normal/thinking/happy 都在里面）：
// 眼白圆 r=12、圆心 (75.5,88) 和 (124.5,88)，再放宽 1px 余量
const EYE_BOX = { x1: 62, y1: 74, x2: 138, y2: 102 };
const inEyeBox = (x, y) => x >= EYE_BOX.x1 && x <= EYE_BOX.x2 && y >= EYE_BOX.y1 && y <= EYE_BOX.y2;

// 从绝对坐标 path 的 d 里取所有数字，按 (x,y) 成对还原控制点/端点
function pathPoints(d) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  return pts;
}

test('016b 天天：两只耳朵都画在脑袋后面（先耳后脸），左右对称', () => {
  const svg = pupSVG('skye');
  const headAt = svg.indexOf(HEAD);
  assert.ok(headAt > 0, '找不到脑袋圆');
  // 左耳从 (62,44) 起笔，右耳是它以 x=100 镜像的 (138,44)
  const leftEar = svg.indexOf('M62 44');
  const rightEar = svg.indexOf('M138 44');
  assert.ok(leftEar > 0, '找不到左耳 path');
  assert.ok(rightEar > 0, '找不到右耳 path（应与左耳镜像对称）');
  assert.ok(leftEar < headAt, '左耳必须画在脑袋前面（图层上在后面）');
  assert.ok(rightEar < headAt, '右耳必须画在脑袋前面（图层上在后面）');
});

test('016b 天天：眼睛之后、帽子之前不允许有任何伸进眼睛区域的图形', () => {
  for (const mood of ['normal', 'happy', 'thinking']) {
    const svg = pupSVG('skye', { mood });
    // 眼睛的结尾：normal/thinking 是右眼上眼睑弧线，happy 是右腮红
    const lids = svg.indexOf('M112.5 83 Q124.5 72.5 136.5 83');
    const blush = svg.indexOf('cx="141" cy="106"');
    const eyeEnd = Math.max(
      lids >= 0 ? lids : -1,
      blush >= 0 ? blush : -1
    );
    const hatStart = svg.indexOf('<g transform="rotate(-5 100 44)">');
    assert.ok(eyeEnd > 0 && hatStart > eyeEnd, `${mood}: 找不到眼睛结尾或帽子开头`);
    // 眼睛和帽子之间只剩嘴；这里出现的任何图形都不得伸进眼睛区域
    const between = svg.slice(eyeEnd, hatStart);
    for (const m of between.matchAll(/<path d="([^"]+)"/g)) {
      for (const [x, y] of pathPoints(m[1])) {
        assert.ok(
          !inEyeBox(x, y),
          `${mood}: 嘴部的路径点 (${x},${y}) 伸进了眼睛区域`
        );
      }
    }
    // 旧版画在前面的耳朵（rotate(±10 …)）必须彻底消失
    assert.doesNotMatch(between, /<g transform="rotate\(-?10 /, `${mood}: 耳朵还画在脸的上层`);
  }
});

test('016b 灰灰：帽檐下的尖三角乱毛已删除，新乱毛是 3 撮纯曲线、画在帽子后面', () => {
  const svg = pupSVG('rocky');
  // 旧版的折线尖三角（像獠牙的那排）不许再出现
  assert.ok(!svg.includes('M84 52 L90 66'), '旧的尖三角乱毛还在');
  // 新乱毛：3 撮，全部只用 C 曲线、没有 L 直线（末端圆钝）
  const tuftRe = /<path d="(M66 30 [^"]+|M86 20 [^"]+|M112 18 [^"]+)" fill="#bcc3c9"/g;
  const tufts = [...svg.matchAll(tuftRe)].map((m) => m[1]);
  assert.equal(tufts.length, 3, `应有 3 撮乱毛，实际 ${tufts.length}`);
  for (const d of tufts) {
    assert.ok(!/[Ll]/.test(d), `乱毛里还有直线段 L：${d}`);
    assert.match(d, /^[MCZ0-9.,\-\s]+$/, '乱毛只应使用 M/C/Z 命令');
  }
  // 颜色与头部灰色相同、深灰描边
  assert.ok(svg.includes('fill="#bcc3c9" stroke="#8f98a1"'), '乱毛颜色应为头部灰 + 深灰描边');
  // 画在帽子后面：先毛、后帽（同一倾斜角出现两次，第一次是毛、第二次是帽子）
  const first = svg.indexOf('rotate(-6 100 44)');
  const second = svg.indexOf('rotate(-6 100 44)', first + 1);
  assert.ok(first > 0 && second > first, '灰灰的帽子倾斜组没找到');
  assert.ok(svg.slice(first, second).includes('M66 30'), '乱毛必须画在帽子之前（先毛后帽）');
});

test('016b 灰灰：乱毛的可见部分都在帽子轮廓之外（翘出来而不是糊在帽子上）', () => {
  const svg = pupSVG('rocky');
  // 帽顶最高点约 y=10（旋转后略有出入），乱毛尖端 y<10 才明显翘出帽外
  const tips = [46, 12, 2, 4, 123, 2]; // 三撮毛的最高点坐标 (x,y)
  for (let i = 0; i < tips.length; i += 2) {
    const [, y] = pathPoints(`M${tips[i]} ${tips[i + 1]}`)[0];
    assert.ok(y <= 12, `乱毛尖端 y=${y} 太低，会被帽子完全盖住`);
  }
});
