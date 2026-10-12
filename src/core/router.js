// 路由（SPEC 5.1）：把地址栏的 hash 解析成页面对象。
// parseRoute / toHash 是纯函数，Node 里可以直接测；watch 负责 hashchange 监听。

// gameId 只允许「小写字母开头 + 小写字母/数字」，挡掉奇怪输入
const GAME_ID_RE = /^[a-z][a-z0-9]*$/;

// 关卡号：纯数字、不能带符号或前导奇怪的写法
const LEVEL_RE = /^(0|[1-9][0-9]*)$/;

export function parseRoute(hash) {
  const h = String(hash ?? '');

  if (h === '' || h === '#' || h === '#/') return { name: 'home' };
  if (h === '#/badges') return { name: 'badges' };

  // #/game/<gameId>          → 选关页
  // #/game/<gameId>/<level>  → 游戏页（level 从 0 开始）
  const m = /^#\/game\/([a-z][a-z0-9]*)(?:\/(0|[1-9][0-9]*))?$/.exec(h);
  if (m) {
    const gameId = m[1];
    if (m[2] === undefined) return { name: 'levels', gameId };
    return { name: 'play', gameId, level: Number(m[2]) };
  }

  // 其他任何输入都回首页
  return { name: 'home' };
}

export function toHash(route) {
  if (!route || typeof route !== 'object') return '#/';
  if (route.name === 'levels' && GAME_ID_RE.test(String(route.gameId || ''))) {
    return `#/game/${route.gameId}`;
  }
  if (
    route.name === 'play' &&
    GAME_ID_RE.test(String(route.gameId || '')) &&
    Number.isInteger(route.level) &&
    route.level >= 0
  ) {
    return `#/game/${route.gameId}/${route.level}`;
  }
  if (route.name === 'badges') return '#/badges';
  return '#/';
}

// 监听路由变化：注册后立即回调一次，之后每次 hashchange 都回调。
// 返回取消监听的函数。
export function watch(onRoute) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  const handler = () => onRoute(parseRoute(window.location.hash));
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
