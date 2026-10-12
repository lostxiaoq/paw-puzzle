// 语音（任务卡 002）：speechSynthesis + zh-CN 语音。
// 说新的一句会打断上一句；浏览器不支持时整个模块静默降级。

let zhVoice = null;
let checked = false;

// 挑一个中文语音：优先名字里带 Chinese / 中文 / zh 的
function pickVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const synth = window.speechSynthesis;
  try {
    const voices = synth.getVoices() || [];
    if (!voices.length) return null;
    const zh = voices.filter((v) => {
      const lang = String(v.lang || '').toLowerCase();
      const name = String(v.name || '').toLowerCase();
      return lang.startsWith('zh') || /chinese|中文|zh-/.test(name);
      // 说明：Ting-Ting / Sin-ji 等名字可能不含这些关键词，但 lang 一定是 zh-*
    });
    if (zh.length) return zh[0];
    return null;
  } catch {
    return null;
  }
}

// 声音列表常常是异步加载的，所以第一次要用到时再查，之后再缓存
function ensureVoice() {
  if (checked) return zhVoice;
  checked = true;
  zhVoice = pickVoice();
  return zhVoice;
}

export function say(text) {
  const t = String(text ?? '').trim();
  if (!t) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const synth = window.speechSynthesis;
  try {
    synth.cancel(); // 新的一句打断上一句
  } catch {
    /* 忽略 */
  }
  try {
    const voice = ensureVoice();
    if (!voice) {
      // 还没拿到语音列表？等下一帧再挑一次（Chrome 首次 getVoices() 常为空）
      setTimeout(() => {
        zhVoice = pickVoice();
        checked = true;
      }, 250);
    }
    const u = new SpeechSynthesisUtterance(t);
    if (voice) u.voice = voice;
    u.lang = 'zh-CN';
    u.rate = 0.9; // 语速放慢，小朋友听得清
    u.pitch = 1.1; // 音调稍高，更亲切
    synth.speak(u);
  } catch {
    /* 出错就当没说过 */
  }
}

// 页面加载后声音列表可能才到位，监听一下并刷新缓存
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    window.speechSynthesis.onvoiceschanged = () => {
      zhVoice = pickVoice();
      checked = true;
    };
    // 有些浏览器不触发 onvoiceschanged，主动等一次
    setTimeout(() => {
      zhVoice = pickVoice();
      checked = true;
    }, 400);
  } catch {
    /* 忽略 */
  }
}
