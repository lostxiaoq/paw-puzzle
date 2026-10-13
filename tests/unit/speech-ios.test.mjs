// 语音模块单元测试（任务卡 015 + 015b）：Node 里能 import 不炸，台词文本与清单语义正确。
//
// speech.js 的浏览器行为（单元素复用 / 首次触摸解锁 / 被拒退回系统语音 / 失败重试）由
// tests/accept/smoke.mjs 的 voice-unlock / voice-ios / voice-play 场景在真实浏览器里验收；
// Node 里没有 window，模块会走「空清单」分支，这里只做静态 + 纯数据 + 模拟行为校验。
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
  // 015b：解锁监听覆盖 pointerdown / pointerup / touchend / click / keydown（经 UNLOCK_EVENTS 挂载）
  const unlockEvents = code.match(/const UNLOCK_EVENTS = \[([^\]]*)\]/);
  assert.ok(unlockEvents, '找不到 UNLOCK_EVENTS 常量');
  for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    assert.ok(unlockEvents[1].includes(`'${t}'`), `UNLOCK_EVENTS 里缺 ${t}`);
  }
  assert.match(code, /for \(const type of UNLOCK_EVENTS\) window\.addEventListener\(type, unlockAudio, \{ capture: true \}\)/);
  // 解锁监听不能再用 once —— 失败后要能重试（once 会让监听摘掉，永远解不了锁）
  const unlockAdds = code.match(/addEventListener\((?:'(?:pointerdown|pointerup|touchend|click|keydown)'[^)]*)?\)/g) || [];
  for (const a of unlockAdds) assert.ok(!a.includes('once'), `解锁监听不允许 once：${a}`);
  // 被拒退回：__pawAudioFallbacks 计数存在，且 play() 的 Promise 一定接了 catch/第二参数
  assert.match(code, /__pawAudioFallbacks/);
  assert.match(code, /\.play\(\)/);
  assert.ok(
    /played\.then\(/.test(code) || /played\.catch\(/.test(code),
    'play() 返回的 Promise 必须被处理，不能出现未处理拒绝'
  );
});

test('015b 核心：只有播放 Promise resolve 后才标记解锁，失败等下一次手势重试', () => {
  const code = readFileSync(SRC, 'utf8');
  // 解锁成功标记必须出现在 Promise 的成功回调里（played.then( 的第一个函数体内）
  const thenBlock = code.match(/played\.then\(\s*\(\)\s*=>\s*\{[\s\S]*?\n\s*\},/);
  assert.ok(thenBlock, '找不到 play() Promise 的成功回调');
  assert.match(thenBlock[0], /unlocked = true/, '成功回调里才允许 unlocked = true');
  assert.match(thenBlock[0], /__pawAudioUnlocked = true/, '成功回调里设置 __pawAudioUnlocked');
  assert.match(thenBlock[0], /removeUnlockListeners\(\)/, '成功回调里摘掉解锁监听');
  // 函数入口处不能再提前标记
  const fnBody = code.match(/function unlockAudio\(\) \{[\s\S]*?\n\}/);
  assert.ok(fnBody, '找不到 unlockAudio 函数');
  const entry = fnBody[0].split('played.then(')[0]; // 发起 play 之前的代码
  assert.ok(!/unlocked = true/.test(entry), '发起 play() 前不能提前标记 unlocked');
  assert.ok(!/__pawAudioUnlocked/.test(entry), '发起 play() 前不能提前设置 __pawAudioUnlocked');
  // 空 utterance（解锁系统语音）只在激活事件处理函数里发一次
  assert.match(code, /if \(!ttsUnlockDone\)/, '空 utterance 解锁只做一次（ttsUnlockDone 标志）');
});

test('模拟行为：pointerdown(touch) 被拒 → touchend 重试成功 → 成功后不再尝试', async () => {
  // 用一个极小的假 DOM 跑真实的 unlockAudio 代码路径（从源码里抠出相关函数执行）
  const raw = readFileSync(SRC, 'utf8');
  // 剥掉注释后截取「解锁」相关代码段（ensureAudioEl 到解锁监听挂载为止）
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/[^\n]*$/gm, '');
  const start = code.indexOf('function ensureAudioEl()');
  const end = code.indexOf('function playAudioFile(');
  assert.ok(start > 0 && end > start, '找不到解锁相关代码段');
  let snippet = code.slice(start, end);
  snippet = snippet.replace(/speakWithTTS\(''\);/g, '/* 不在 Node 里真说话 */;');
  // 这几个模块级状态声明在 ensureAudioEl 之前，补进来
  snippet = 'let audioEl = null;\nlet audioElReady = false;\nlet playSeq = 0;\nlet playIsUnlock = false;\n' + snippet;

  // —— 假 DOM ——
  const listeners = {};
  const windowObj = {
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      const arr = listeners[type] || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    dispatchEvent(type, ev) { for (const fn of [...(listeners[type] || [])]) fn(ev || {}); },
  };
  let playCalls = 0;
  let blockPlay = true; // 模拟 iOS：一开始 play 全被拒
  const audioEl = {
    preload: '',
    src: '',
    play() {
      playCalls++;
      return blockPlay ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve();
    },
    pause() {}, // 台词路径会用到的空实现
  };
  windowObj.Audio = function () { return audioEl; };

  const makeUnlock = new Function(
    'window',
    'Audio',
    `'use strict';
     ${snippet}
     return { unlockAudio, addUnlockListeners };`
  );
  const api = makeUnlock(windowObj, windowObj.Audio);

  api.addUnlockListeners();
  // 第一次：触屏 pointerdown（iOS 不认）——发起尝试但播放被拒，不能标记解锁
  windowObj.dispatchEvent('pointerdown', { pointerType: 'touch' });
  assert.equal(playCalls, 1, '触屏 pointerdown 发起了一次解锁播放');
  assert.equal(windowObj.__pawUnlockAttempts, 1, '__pawUnlockAttempts = 1');
  await new Promise((r) => setTimeout(r, 10)); // 等 Promise 拒绝回调
  assert.notEqual(windowObj.__pawAudioUnlocked, true, '播放被拒时不能标记为已解锁');

  // 第二次：touchend（iOS 认）——再试一次，这次放行
  blockPlay = false;
  windowObj.dispatchEvent('touchend', {});
  assert.equal(playCalls, 2, 'touchend 上再次发起播放');
  assert.equal(windowObj.__pawUnlockAttempts, 2, '__pawUnlockAttempts = 2');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(windowObj.__pawAudioUnlocked, true, '成功后 __pawAudioUnlocked = true');

  // 成功后：再触摸不重复尝试，监听已摘掉
  windowObj.dispatchEvent('touchend', {});
  windowObj.dispatchEvent('click', {});
  windowObj.dispatchEvent('keydown', {});
  windowObj.dispatchEvent('pointerup', {});
  windowObj.dispatchEvent('pointerdown', {});
  assert.equal(playCalls, 2, '成功后不再发起播放');
  assert.equal(windowObj.__pawUnlockAttempts, 2, '成功后 __pawUnlockAttempts 不再增加');
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
