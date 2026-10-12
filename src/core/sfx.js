// 音效（任务卡 002）：WebAudio 现场合成，没有任何音频文件。
// AudioContext 很懒：第一次用户点击（pointerdown/keydown）之后才创建/恢复，
// 在那之前 play() 只是安静地忽略，不会报错。

const store = {
  ctx: null, // AudioContext，点击后才创建
  unlocked: false, // 是否已经发生过用户手势
};

// ———— 音效定义：每种是一串「音符」 ————
// f: 频率(Hz)；t: 开始时间(秒)；d: 音长(秒)；v: 音量(0~1)；type: 波形。
// ding=true 额外叠一条 2 倍频泛音，更像铃铛；triad=true 在该音下面叠和弦垫。
const NOTES = {
  // 轻快的小弹跳「啵」
  tap: [
    { f: 660, t: 0, d: 0.07, v: 0.22, type: 'sine' },
    { f: 880, t: 0.055, d: 0.09, v: 0.18, type: 'sine' },
  ],
  // 小脚步「哒哒」：短促的三角波低音
  step: [
    { f: 220, t: 0, d: 0.06, v: 0.25, type: 'triangle' },
    { f: 175, t: 0.09, d: 0.07, v: 0.2, type: 'triangle' },
  ],
  // 上行三和弦 do-mi-so（C5-E5-G5），最后一音带和弦垫，庆祝用
  success: [
    { f: 523.25, t: 0, d: 0.14, v: 0.18, type: 'sine' },
    { f: 659.25, t: 0.09, d: 0.14, v: 0.18, type: 'sine' },
    { f: 783.99, t: 0.18, d: 0.4, v: 0.18, type: 'sine', triad: true },
  ],
  // 叮～的高音（星星出现时）
  star: [
    { f: 1567.98, t: 0, d: 0.5, v: 0.16, type: 'sine', ding: true },
    { f: 2093.0, t: 0.02, d: 0.3, v: 0.08, type: 'sine', ding: true },
  ],
  // 温柔的下行两音（做错了）：so→mi，正弦波软软的，不刺耳
  oops: [
    { f: 392, t: 0, d: 0.18, v: 0.16, type: 'sine' },
    { f: 329.63, t: 0.14, d: 0.26, v: 0.14, type: 'sine' },
  ],
};

// ———— 播放单个音符 ————
function playNote(ctx, { f, t, d, v, type = 'sine', ding = false, triad = false }) {
  const at = ctx.currentTime + t;
  const dest = ctx.destination;

  // 主音：起音 5ms，之后指数衰减
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(v, at + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + d);
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, at);
  osc.connect(gain).connect(dest);
  osc.start(at);
  osc.stop(at + d + 0.05);

  // 「叮」声：叠一条 2 倍频泛音，衰减更快
  if (ding) {
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.0001, at);
    hg.gain.linearRampToValueAtTime(v * 0.35, at + 0.005);
    hg.gain.exponentialRampToValueAtTime(0.0001, at + d * 0.6);
    const h = ctx.createOscillator();
    h.type = 'sine';
    h.frequency.setValueAtTime(f * 2, at);
    h.connect(hg).connect(dest);
    h.start(at);
    h.stop(at + d * 0.6 + 0.05);
  }

  // 和弦垫：在旋律音下面轻轻叠 C4、E4，制造「成功」的宽度感
  if (triad) {
    for (const hf of [261.63, 329.63]) {
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, at);
      g2.gain.linearRampToValueAtTime(v * 0.5, at + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, at + d);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(hf, at);
      o2.connect(g2).connect(dest);
      o2.start(at);
      o2.stop(at + d + 0.05);
    }
  }
}

// ———— 对外接口：play('tap' | 'step' | 'success' | 'star' | 'oops') ————
export function play(name) {
  // 还没解锁（没有用户点击过）或还没建 AudioContext：安静地忽略
  if (!store.unlocked || !store.ctx) return;
  const spec = NOTES[name];
  if (!spec) return;
  try {
    const ctx = store.ctx;
    if (ctx.state === 'suspended') ctx.resume();
    for (const note of spec) playNote(ctx, note);
  } catch {
    /* 音频出问题也不能弄崩游戏 */
  }
}

// ———— 第一次用户点击后创建/恢复 AudioContext ————
function unlock() {
  if (store.unlocked) return;
  store.unlocked = true;
  try {
    if (!store.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) store.ctx = new Ctx();
    }
    if (store.ctx && store.ctx.state === 'suspended') store.ctx.resume();
  } catch {
    store.ctx = null;
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}
