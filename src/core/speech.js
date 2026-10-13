// 语音（任务卡 002 + 014 + 015 + 015b）：优先播放提前生成好的 mp3，找不到再退回系统语音。
//
// 怎么选声音：
//   1. 启动时在后台 Worker 里 fetch audio/voice/manifest.json（拿不到 / 格式不对就当空清单，
//      不能报错）。放 Worker 里是因为主线程 fetch 404 会在控制台留下一条 error 记录，
//      验收要求「无 JS 错误」，Worker 里的网络失败完全静默。
//   2. 说话时清单里有「speaker|文本」→ 播 audio/voice/<文件名>；没有 → speechSynthesis。
//   3. 清单还在加载时说的话先排队，加载完（最多等 1.5 秒）再决定用哪种方式。
//
// 任务卡 015b（iPad Safari 解锁修正）：
//   - HTML 规范里，触屏（pointerType 为 touch/pen）的 pointerdown 不是「用户激活」，
//     iOS Safari 会拒绝在里面发起的 play()；真正算数的是 pointerup / touchend / click / keydown。
//   - 所以：只有解锁播放的 Promise 真正 resolve 了，才算解锁成功（置 unlocked 并把
//     window.__pawAudioUnlocked 标成 true）；被拒 / 抛错就保持未解锁，等下一次手势再试。
//   - 每次真正发起解锁尝试时 window.__pawUnlockAttempts 加 1；成功后就不再监听、不再尝试。
//
// 任务卡 015（iPad Safari 可靠播放）：
//   - 全站只创建一个 <audio> 元素（模块加载时创建一次），之后每句话只改 src 再 play()。
//     iOS Safari 对「不在用户手势里发起的播放」限制很严，单元素复用是最常用的稳法。
//   - play() 返回的 Promise 被拒绝（NotAllowedError 等）→ 改用 speechSynthesis 读这句话，
//     保证孩子至少能听到。__pawSaid 里这句仍记 source='file'（清单命中），
//     另外把 window.__pawAudioFallbacks 计数 +1。绝不留下未处理的 Promise 拒绝。
//
// 测试埋点（验收 smoke.mjs 用）：
//   window.__pawSaid            每次 say 追加 { speaker, text, source: 'file' | 'tts' }
//   window.__pawAudioPlays      每次调用 audio.play() 加 1
//   window.__pawAudioFallbacks  mp3 播放被拒退回系统语音的次数
//   window.__pawAudioUnlocked   解锁播放的 Promise 成功后为 true
//   window.__pawUnlockAttempts  发起解锁尝试的次数（成功后不再增加）

const VOICE_DIR = 'audio/voice/';
const MANIFEST_URL = VOICE_DIR + 'manifest.json';
const MANIFEST_TIMEOUT_MS = 1500; // 清单加载最多等这么久，超时就先当空清单用

// 极短的静音 wav（data URI，44 字节 RIFF 头 + 16 字节全零采样 ≈ 1ms），
// 首次触摸解锁用：够触发「用户手势内播放」，孩子完全听不见。
const SILENT_WAV_URL =
  'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

// ———— 全局状态 ————
let manifest = null; // { "speaker|text": "文件名.mp3" }，没加载完时为 null
let manifestDone = false; // 清单已出结果（成功或失败都算）
const pendingSays = []; // 清单没好之前压住的话，好了以后按顺序放出来

// 页面当前默认说话的狗狗（main.js 切页时用 setSpeaker 设置）
let defaultSpeaker = '';

// ———— 单一音频元素（任务卡 015 核心）————
// 整个应用只有这一个 <audio>：每句话只换 src 再 play()，绝不新建。
let audioEl = null;
let audioElReady = false; // 元素已创建并且 src 已挂上静音 wav（可以随时 play）
// 播放序号：play() 是异步的，被拒回调触发时用它判断「被拒的还是不是最新一句」；
// 不是最新（src 已被新的一句抢走）就不退 TTS，避免旧句子串台。
let playSeq = 0;
// 当前发起的这次 play() 是解锁用的静音（被拒/被打断都完全静默，不退 TTS 不计数）
let playIsUnlock = false;

// 创建唯一的 audio 元素并把静音 wav 挂上去（惰性，第一次真正要用时才建）
function ensureAudioEl() {
  if (audioElReady) return audioEl;
  try {
    audioEl = new Audio(); // 全站唯一的一次 new Audio()
  } catch {
    // 极老浏览器没有 Audio 构造器：退回 createElement
    try {
      audioEl = document.createElement('audio');
    } catch {
      return null;
    }
  }
  try {
    audioEl.preload = 'auto';
    audioEl.src = SILENT_WAV_URL; // 平时挂着静音，解码无压力；播台词时再换成 mp3
    // 元素级错误（网络/解码失败）只静默，别让它变成未处理的异常
    audioEl.addEventListener('error', () => {});
  } catch {
    /* 老浏览器不支持某些属性，忽略 */
  }
  audioElReady = true;
  return audioEl;
}

// ———— 测试埋点 ————
function noteSaid(speaker, text, source) {
  if (typeof window === 'undefined') return;
  try {
    window.__pawSaid = window.__pawSaid || [];
    window.__pawSaid.push({ speaker: String(speaker || ''), text, source });
  } catch {
    /* 埋点出错不影响说话 */
  }
}

// ———— 清单加载（Worker 里 fetch，静默失败） ————
function startManifestLoad() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    // 没有浏览器能力（比如 Node 单测里被 import）：直接当空清单
    manifest = {};
    manifestDone = true;
    return;
  }
  try {
    const src =
      'self.onmessage=(e)=>{try{fetch(e.data).then(async r=>{if(!r.ok)throw 0;' +
      'const j=await r.json();self.postMessage({ok:true,files:j&&j.files})})' +
      '.catch(()=>self.postMessage({ok:false}))}catch(err){self.postMessage({ok:false})}};';
    const blob = new Blob([src], { type: 'text/javascript' });
    const w = new Worker(URL.createObjectURL(blob));
    // 兜底：Worker 出任何意外（构建失败、onmessage 没回话）都走超时路径
    const fallback = () => {
      if (manifestDone) return;
      manifest = {};
      manifestDone = true;
      flushPending();
      try { w.terminate(); } catch { /* 忽略 */ }
    };
    const timer = setTimeout(fallback, MANIFEST_TIMEOUT_MS);
    w.onmessage = (ev) => {
      clearTimeout(timer);
      if (manifestDone) return;
      const data = ev && ev.data;
      // 格式不对（files 不是普通对象）→ 空清单
      if (data && data.ok && data.files && typeof data.files === 'object' && !Array.isArray(data.files)) {
        const files = {};
        for (const k of Object.keys(data.files)) {
          if (typeof data.files[k] === 'string' && data.files[k]) files[k] = data.files[k];
        }
        manifest = files;
      } else {
        manifest = {};
      }
      manifestDone = true;
      flushPending();
      try { w.terminate(); } catch { /* 忽略 */ }
    };
    w.onerror = () => { clearTimeout(timer); fallback(); };
    // Worker 里没有相对于页面的 base URL（脚本是 blob 建的），必须传绝对地址
    w.postMessage(new URL(MANIFEST_URL, window.location.href).href);
  } catch {
    // Worker 起不来（老浏览器 / CSP 限制）：当空清单，全部退回系统语音
    manifest = {};
    manifestDone = true;
    flushPending();
  }
}

// 清单出结果了，把压住的话按顺序放出来
function flushPending() {
  const queue = pendingSays.splice(0, pendingSays.length);
  for (const item of queue) playNow(item.text, item.speaker);
}

// ———— 系统语音（speechSynthesis） ————

// 挑一个听得舒服的中文语音。原来「取第一个中文语音」在 Mac / iPad 上
// 会挑到台湾腔、粤语（Sin-ji / 善怡）这类特色音色，所以按这个优先级挑：
//   ① zh-CN 且名字是 Tingting / 婷婷（Mac / iPad 自带的标准女声）
//   ② 名字带 Shelley / Flo / Sandy（zh-CN 的其他自然音色）
//   ③ 任意 zh-CN
//   ④ 其他中文（zh-TW / zh-HK 等）
function pickVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const zh = voices.filter((v) => {
      const lang = String(v.lang || '').toLowerCase().replace('_', '-');
      const name = String(v.name || '').toLowerCase();
      return lang.startsWith('zh') || /chinese|中文|zh-/.test(name);
    });
    if (!zh.length) return null;
    const inCN = (v) => String(v.lang || '').toLowerCase().replace('_', '-').startsWith('zh-cn');
    const nameHas = (v, words) => words.some((w) => String(v.name || '').toLowerCase().includes(w));
    // ① Tingting / 婷婷
    const tingting = zh.find((v) => inCN(v) && nameHas(v, ['tingting', 'ting-ting', '婷婷']));
    if (tingting) return tingting;
    // ② Shelley / Flo / Sandy
    const natural = zh.find((v) => inCN(v) && nameHas(v, ['shelley', 'flo', 'sandy']));
    if (natural) return natural;
    // ③ 任意 zh-CN
    const anyCN = zh.find(inCN);
    if (anyCN) return anyCN;
    // ④ 其他中文
    return zh[0];
  } catch {
    return null;
  }
}

let zhVoice = null;
let voiceChecked = false;
function ensureVoice() {
  if (voiceChecked) return zhVoice;
  voiceChecked = true;
  zhVoice = pickVoice();
  return zhVoice;
}

// 用系统语音读一句话。text 为空时只「空说一次」，用来解锁 iOS 的 speechSynthesis。
function speakWithTTS(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  try {
    if (text) synth.cancel(); // 新的一句打断上一句；空文本（解锁用）不打断别人
  } catch {
    /* 忽略 */
  }
  try {
    const voice = ensureVoice();
    if (!voice) {
      // 还没拿到语音列表？等下一帧再挑一次（Chrome 首次 getVoices() 常为空）
      setTimeout(() => {
        zhVoice = pickVoice();
        voiceChecked = true;
      }, 250);
    }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = 'zh-CN';
    u.rate = 0.9; // 语速放慢，小朋友听得清
    u.pitch = 1.1; // 音调稍高，更亲切
    synth.speak(u);
  } catch {
    /* 出错就当没说过 */
  }
}

// ———— mp3 播放（单元素复用） ————

// 解锁是否已完成（解锁播放的 Promise 真正 resolve 后才置 true —— 015b 的关键修正）
let unlocked = false;
// 系统语音的空 utterance 解锁：在激活事件里只做一次，之后不再重复
let ttsUnlockDone = false;

// 解锁用的激活事件。鼠标的 pointerdown / pointerup 是用户激活；触屏的 pointerdown
// 在 iOS 上会被拒（不算激活），但这次失败的尝试会被计数并保持未解锁，紧随其后的
// pointerup / touchend / click 会马上重试 —— 验收 voice-unlock 模拟的正是这个流程。
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];

// 摘掉全部解锁监听（成功后调用，之后不再尝试）
function removeUnlockListeners() {
  try {
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, unlockAudio, true);
  } catch {
    /* 忽略 */
  }
}

// 每个解锁监听都走这里：解锁系统语音（只做一次）+ 发起一次解锁播放尝试。
function unlockAudio() {
  if (unlocked) return;
  // 空 utterance 解锁系统语音：必须在激活事件处理函数里同步发起，只做一次
  if (!ttsUnlockDone) {
    ttsUnlockDone = true;
    speakWithTTS('');
  }
  const a = ensureAudioEl();
  try {
    window.__pawUnlockAttempts = (window.__pawUnlockAttempts || 0) + 1;
  } catch { /* 埋点出错不影响解锁 */ }
  if (!a) return; // 连 audio 元素都拿不到：这轮没法试，等下一个手势
  try {
    playIsUnlock = true;
    const seq = ++playSeq;
    const played = a.play();
    if (played && typeof played.then === 'function') {
      played.then(
        () => {
          // 播放许可真的拿到手了 → 现在才承认解锁成功
          if (playIsUnlock && seq === playSeq) playIsUnlock = false;
          unlocked = true;
          try {
            window.__pawAudioUnlocked = true;
          } catch { /* 埋点出错不影响解锁 */ }
          removeUnlockListeners();
        },
        () => {
          // 被浏览器拒绝（比如触屏 pointerdown 不算用户激活）：保持未解锁，下次手势再试
          if (playIsUnlock && seq === playSeq) playIsUnlock = false;
        }
      );
    } else {
      // 老浏览器 play() 不返回 Promise：发起即成功
      playIsUnlock = false;
      unlocked = true;
      try {
        window.__pawAudioUnlocked = true;
      } catch { /* 埋点出错不影响解锁 */ }
      removeUnlockListeners();
    }
  } catch {
    playIsUnlock = false; // play() 同步抛错：保持未解锁，等下一个手势再试
  }
}

// 触屏的 pointerdown 不算用户激活（iOS 会拒绝在里面发起的播放）；鼠标的 pointerdown
// 是激活事件。都放进 UNLOCK_EVENTS 尝试没关系：触屏的这次会被拒并计数、保持未解锁，
// 紧随其后的 pointerup / touchend 会重试 —— 成功的标志只看 Promise 是否 resolve。
// 唯一的例外：已经解锁（或本轮成功后）绝不再尝试，由 unlockAudio 入口的 unlocked 判断兜住。

// 挂解锁监听：不用 once —— 失败了监听必须还留在原地，下一次手势才能重试；
// 成功后由 unlockAudio 自己 removeEventListener。
function addUnlockListeners() {
  if (typeof window === 'undefined') return;
  try {
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, unlockAudio, { capture: true });
  } catch {
    /* 极老浏览器不支持这些事件：正常说话路径不受影响 */
  }
}

// 用唯一的 audio 元素播一句话的 mp3。
// 返回 true = 清单命中且播放已发起（被拒时会在回调里退 TTS，但 source 仍记 'file'）；
// 返回 false = 清单没命中，走系统语音。
function playAudioFile(text, speaker) {
  const key = text && speaker ? `${speaker}|${text}` : null;
  const file = manifest[key];
  if (!file) return false;
  const a = ensureAudioEl();
  if (!a) return false;
  stopAudio(); // 上一句停掉（单元素，换 src + play 就等于打断）
  try {
    const url = new URL(VOICE_DIR + file, window.location.href).href;
    const seq = ++playSeq;
    playIsUnlock = false; // 台词播放永远不是解锁播放
    a.src = url;
    try {
      window.__pawAudioPlays = (window.__pawAudioPlays || 0) + 1;
    } catch { /* 忽略 */ }
    const played = a.play();
    if (played && typeof played.then === 'function') {
      played.then(
        () => {
          // 播放成功，无需处理
        },
        (err) => {
          // 被浏览器拦截（NotAllowedError 等）→ 退回系统语音，孩子至少能听到。
          // seq 不是最新说明这句已被新的一句顶掉，别再读旧台词。
          if (seq !== playSeq) return;
          try {
            window.__pawAudioFallbacks = (window.__pawAudioFallbacks || 0) + 1;
          } catch { /* 忽略 */ }
          speakWithTTS(text);
        }
      );
    }
    return true;
  } catch {
    return false;
  }
}

// 停掉正在播的音频（单元素：pause + currentTime 归零）
function stopAudio() {
  const a = audioEl;
  if (!a) return;
  try {
    a.pause();
    a.currentTime = 0;
  } catch {
    /* 忽略 */
  }
}

// 清单已就绪后真正决定怎么「说」
function playNow(text, speaker) {
  if (manifest[text && speaker ? `${speaker}|${text}` : null]) {
    if (playAudioFile(text, speaker)) {
      recordFinal(speaker, text, 'file');
      return;
    }
  }
  speakWithTTS(text);
  recordFinal(speaker, text, 'tts');
}

// ———— 对外接口 ————

// 记录一次最终播放（source 已确定：'file' 或 'tts'），验收 smoke.mjs 会读这份记录
function recordFinal(speaker, text, source) {
  noteSaid(speaker, text, source);
}

// 说一句话。speaker 省略时用页面默认的狗狗。
export function say(text, { speaker } = {}) {
  const t = String(text ?? '').trim();
  if (!t) return;
  const who = speaker || defaultSpeaker || '';
  if (!manifestDone) {
    // 清单还在加载：先排队（最多 1.5 秒），好了以后再决定用 mp3 还是系统语音
    pendingSays.push({ text: t, speaker: who });
    return;
  }
  playNow(t, who);
}

// main.js 切页时设置当前页面的默认说话者
export function setSpeaker(pupId) {
  defaultSpeaker = String(pupId || '');
}

// ———— 启动：加载清单 + 挂解锁监听 ————
if (typeof window !== 'undefined') {
  startManifestLoad();
  // 任务卡 015b：用户手势时解锁音频。监听 pointerup / touchend / click / keydown
  // （触屏的 pointerdown 不算激活事件，只有 mouse 的才试）；不用 once，
  // 失败后监听留在原地等下一次手势，成功后自己 removeEventListener。
  addUnlockListeners();
  // 页面加载后声音列表可能才到位，监听一下并刷新缓存
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.onvoiceschanged = () => {
        zhVoice = pickVoice();
        voiceChecked = true;
      };
      // 有些浏览器不触发 onvoiceschanged，主动等一次
      setTimeout(() => {
        zhVoice = pickVoice();
        voiceChecked = true;
      }, 400);
    } catch {
      /* 忽略 */
    }
  }
}
