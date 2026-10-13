// 语音模块单元测试（任务卡 015）：Node 里能 import 不炸，台词文本与清单语义正确。
//
// speech.js 的浏览器行为（单元素复用 / 首次触摸解锁 / 被拒退回系统语音）由
// tests/accept/smoke.mjs 的 voice-ios / voice-play 场景在真实浏览器里验收；
// Node 里没有 window，模块会走「空清单」分支，这里只做静态 + 纯数据校验。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LINES } from '../../src/voice/lines.js';

const SRC = new URL('../../src/core/speech.js', import.meta.url);

test('speech.js 在 Node 里 import 不炸（无 window 时走空清单分支）', async () => {
  const mod = await import(SRC.href);
  // 对外接口存在且可调用
  assert.equal(typeof mod.say, 'function');
  assert.equal(typeof mod.setSpeaker, 'function');
  assert.doesNotThrow(() => mod.setSpeaker('chase'));
  assert.doesNotThrow(() => mod.say('你好'));
  assert.doesNotThrow(() => mod.say('   ')); // 空白台词：忽略，不抛错
});

test('全站只创建一个音频元素（真实代码只 new 一次 Audio，不循环创建）', () => {
  const raw = readFileSync(SRC, 'utf8');
  // 剥掉块注释、整行注释和行尾注释（「//」前有空白才算注释，不会误伤 data:audio 里的 ://）
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/[^\n]*$/gm, '');
  const creations = code.match(/new Audio\(/g) || [];
  assert.equal(creations.length, 1, `new Audio 应该只出现 1 次，实际 ${creations.length} 次`);
  // 解锁监听必须 once + capture，且覆盖 pointerdown / touchend / keydown
  assert.match(code, /addEventListener\('pointerdown', unlockAudio, \{ once: true, capture: true \}\)/);
  assert.match(code, /addEventListener\('touchend', unlockAudio, \{ once: true, capture: true \}\)/);
  assert.match(code, /addEventListener\('keydown', unlockAudio, \{ once: true, capture: true \}\)/);
  // 被拒退回：__pawAudioFallbacks 计数存在，且 play() 的 Promise 一定接了 catch/第二参数
  assert.match(code, /__pawAudioFallbacks/);
  assert.match(code, /\.play\(\)/);
  assert.ok(
    /played\.then\(/.test(code) || /played\.catch\(/.test(code),
    'play() 返回的 Promise 必须被处理，不能出现未处理拒绝'
  );
});

test('静音解锁 wav 是合法的 data URI（RIFF 头 + audio/wav）', () => {
  const code = readFileSync(SRC, 'utf8');
  const m = code.match(/const SILENT_WAV_URL\s*=\s*\n?\s*'([^']+)'/);
  assert.ok(m, '找不到 SILENT_WAV_URL 常量');
  const uri = m[1];
  assert.ok(uri.startsWith('data:audio/wav;base64,'), '必须是 audio/wav 的 data URI');
  const bytes = Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
  assert.ok(bytes.length > 44, 'wav 至少要有 44 字节文件头');
  assert.equal(bytes.toString('latin1', 0, 4), 'RIFF');
  assert.equal(bytes.toString('latin1', 8, 12), 'WAVE');
  // RIFF 块大小字段要和数据长度自洽，防止手滑写错导致浏览器拒载
  const riffSize = bytes.readUInt32LE(4);
  assert.equal(riffSize, bytes.length - 8, 'RIFF 大小字段与实际数据长度不一致');
});

test('台词清单键 speaker|text 无重复（单元素换 src 的查找依据）', () => {
  const keys = LINES.map((l) => `${l.speaker}|${l.text}`);
  assert.equal(new Set(keys).size, keys.length, 'speaker|text 键重复会让换 src 播错句子');
});
