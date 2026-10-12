// 进度存储（SPEC 5.3）。
// 原则：永远不抛错。后端不可用 / 抛异常 / 数据损坏时，退回内存照常工作。

const KEY = 'paw-puzzle:v1';

export function createStore(backend) {
  // ———— 挑一个可用的后端：优先传入的，其次全局 localStorage ————
  let be = null;
  try {
    if (
      backend &&
      typeof backend.getItem === 'function' &&
      typeof backend.setItem === 'function'
    ) {
      be = backend;
    } else if (
      typeof globalThis !== 'undefined' &&
      globalThis.localStorage &&
      typeof globalThis.localStorage.getItem === 'function' &&
      typeof globalThis.localStorage.setItem === 'function'
    ) {
      be = globalThis.localStorage;
    }
  } catch {
    be = null;
  }

  const mem = new Map(); // 内存兜底（be 坏掉时数据还活着）

  function rawRead() {
    if (be) {
      try {
        return be.getItem(KEY);
      } catch {
        return null; // 后端读不了，当作没存过
      }
    }
    return mem.has(KEY) ? mem.get(KEY) : null;
  }

  // 把读到的 JSON 清洗成可信形状，坏数据一律丢掉
  function sanitize(data) {
    const out = {};
    if (!data || typeof data !== 'object') return out;
    for (const game of Object.keys(data)) {
      const entry = data[game];
      if (!entry || typeof entry !== 'object') continue;
      const unlocked = Number(entry.unlocked);
      const stars = {};
      if (entry.stars && typeof entry.stars === 'object') {
        for (const k of Object.keys(entry.stars)) {
          const v = Number(entry.stars[k]);
          if (Number.isInteger(v) && v >= 1 && v <= 3) stars[k] = v;
        }
      }
      out[game] = {
        unlocked: Number.isFinite(unlocked) && unlocked >= 1 ? Math.floor(unlocked) : 1,
        stars,
      };
    }
    return out;
  }

  function loadData() {
    const raw = rawRead();
    if (typeof raw !== 'string' || !raw) return {};
    try {
      return sanitize(JSON.parse(raw));
    } catch {
      return {}; // JSON 坏了就从头开始
    }
  }

  let state = loadData();

  function persist() {
    let json;
    try {
      json = JSON.stringify(state);
    } catch {
      return;
    }
    if (be) {
      try {
        be.setItem(KEY, json);
        return;
      } catch {
        // 后端写不进去就落到内存
      }
    }
    mem.set(KEY, json);
  }

  return {
    // 没玩过的游戏：只解锁第 1 关，没有任何星
    getProgress(gameId) {
      const entry = state[gameId];
      if (!entry) return { unlocked: 1, stars: {} };
      return { unlocked: entry.unlocked, stars: { ...entry.stars } };
    },

    // 记星数（只保留最高值），并把 unlocked 提到至少 levelIndex + 2
    completeLevel(gameId, levelIndex, stars) {
      const idx = Number(levelIndex);
      if (!Number.isInteger(idx) || idx < 0) return;
      const entry = state[gameId] || { unlocked: 1, stars: {} };
      const value = Math.min(3, Math.max(1, Math.round(Number(stars) || 1)));
      const best = entry.stars[idx];
      if (!best || value > best) entry.stars[idx] = value;
      const need = idx + 2;
      if (entry.unlocked < need) entry.unlocked = need;
      state[gameId] = entry;
      persist();
    },

    // 所有游戏加起来的星数
    totalStars() {
      let sum = 0;
      for (const entry of Object.values(state)) {
        for (const v of Object.values(entry.stars)) sum += v;
      }
      return sum;
    },

    // 清空全部进度
    reset() {
      state = {};
      persist();
    },
  };
}
