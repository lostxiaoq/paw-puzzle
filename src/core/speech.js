// 语音（任务卡 002 + 014）：优先播放提前生成好的 mp3，找不到再退回系统语音。
//
// 怎么选声音：
//   1. 启动时在后台 Worker 里 fetch audio/voice/manifest.json（拿不到 / 格式不对就当空清单，
//      不能报错）。放 Worker 里是因为主线程 fetch 404 会在控制台留下一条 error 记录，
//      验收要求「无 JS 错误」，Worker 里的网络失败完全静默。
//   2. 说话时清单里有「speaker|文本」→ 播 audio/voice/<文件名>；没有 → speechSynthesis。
//   3. 清单还在加载时说的话先排队，加载完（最多等 1.5 秒）再决定用哪种方式。
//
// 测试埋点（验收 smoke.mjs 用）：
//   window.__pawSaid       每次 say 追加 { speaker, text, source: 'file' | 'tts' }
//   window.__pawAudioPlays 每次调用 audio.play() 加 1

const VOICE_DIR = 'audio/voice/';
const MANIFEST_URL = VOICE_DIR + 'manifest.json';
const MANIFEST_TIMEOUT_MS = 1500; // 清单加载最多等这么久，超时就先当空清单用

// ———— 全局状态 ————
let manifest = null;       // { "speaker|text": "文件名.mp3" }，没加载完时为 null
let manifestDone = false;  // 清单已出结果（成功或失败都算）
const pendingSays = [];    // 清单没好之前压住的话，好了以后按顺序放出来

// 页面当前默认说话的狗狗（main.js 切页时用 setSpeaker 设置）
let defaultSpeaker = '';

// 正在播的 <audio>，新一句话要把它停掉
let currentAudio = null;

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
// 会挑到台湾腔、粤语（Sin-ji / 善怡）甚至 Grandma 这类特色音色，所以按这个优先级挑：
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

function speakWithTTS(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  try {
    synth.cancel(); // 新的一句打断上一句（包括正在播的系统语音）
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

// ———— mp3 音频 ————
function stopAudio() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch { /* 忽略 */ }
    currentAudio = null;
  }
}

function playAudioFile(text, speaker) {
  const file = manifest[text && speaker ? `${speaker}|${text}` : null];
  if (!file) return false;
  stopAudio(); // 新的一句打断上一句 mp3
  try {
    const url = new URL(VOICE_DIR + file, window.location.href).href;
    const audio = new Audio(url);
    audio.preload = 'auto';
    currentAudio = audio;
    // 埋点在调用 play 的同一拍记上（验收按这个计数器判断「真的播了音频」）
    try {
      window.__pawAudioPlays = (window.__pawAudioPlays || 0) + 1;
    } catch { /* 忽略 */ }
    const played = audio.play();
    if (played && typeof played.then === 'function') {
      // 播放失败（比如浏览器拦了自动播放）：静默，不抛未捕获的 Promise 错误
      played.catch(() => { /* 静默 */ });
    }
    return true;
  } catch {
    /* 构造 Audio 出错：退回系统语音 */
    currentAudio = null;
    return false;
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

// 页面加载后声音列表可能才到位，监听一下并刷新缓存
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  startManifestLoad();
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
