// 灰灰修零件：游戏逻辑（SPEC 5.8）。
// 纯函数、不碰 DOM，Node 里可以直接 import。
// 形状用格子坐标数组 [[x, y], ...] 表示：x 向右增大，y 向下增大（屏幕坐标）。

// —— 内部小工具 ——————————————————————————————————————

// 比较器：按 (y, x) 升序。先比行、再比列，像读书一样从上到下、从左到右。
function byYX(a, b) {
  return a[1] - b[1] || a[0] - b[0];
}

// 形状连通性：从第一格出发，一步一步能走到所有格子吗？
// 只在出干扰项的兜底搜索里用，保证给孩子的每个零件都是完整一块。
function isConnected(cells) {
  const keys = new Set(cells.map(([x, y]) => `${x},${y}`));
  const seen = new Set([`${cells[0][0]},${cells[0][1]}`]);
  const stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (keys.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([x + dx, y + dy]);
      }
    }
  }
  return seen.size === keys.size;
}

/**
 * normalize：把形状平移到左上角（最小 x、最小 y 都归 0），
 * 再按 (y, x) 升序排序。这样同一个形状不管原来摆在哪、格子按什么顺序给，
 * 都有唯一的「标准写法」，方便比较两个形状是否一样。
 * 返回全新数组，不修改传入的 cells。
 */
export function normalize(cells) {
  if (cells.length === 0) return [];
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of cells) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }
  // map 先复制出一组新坐标，sort 只会动这份副本，不会碰调用方的数组。
  return cells.map(([x, y]) => [x - minX, y - minY]).sort(byYX);
}

/**
 * rotate：顺时针旋转 turns 个 90°。
 * 屏幕坐标（y 向下）下，顺时针转 90° 的单格变换是 (x, y) → (-y, x)。
 * turns 可以是任意整数，负数表示逆时针；转 4 次等于没转。
 * 结果经过 normalize，返回新数组。
 */
export function rotate(cells, turns = 1) {
  // 把 turns 归一到 0–3：比如 -1 次和 3 次是同一个动作。
  const t = ((turns % 4) + 4) % 4;
  let out = cells.map(([x, y]) => [x, y]);
  for (let i = 0; i < t; i++) {
    out = out.map(([x, y]) => [-y, x]);
  }
  return normalize(out);
}

/**
 * mirror：左右翻转（照镜子），(x, y) → (-x, y)，结果经过 normalize。
 */
export function mirror(cells) {
  return normalize(cells.map(([x, y]) => [-x, y]));
}

/**
 * sameShape：两个形状是否一模一样。
 * 只比平移后的标准写法，不允许旋转——转一转才算另一种摆法。
 */
export function sameShape(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  return (
    na.length === nb.length &&
    na.every(([x, y], i) => x === nb[i][0] && y === nb[i][1])
  );
}

/**
 * rotationsNeeded：把 from 顺时针最少转几个 90° 能变成 to（0–3）。
 * 转不出来返回 -1（比如 to 是 from 的镜像，怎么转都翻不过去）。
 */
export function rotationsNeeded(from, to) {
  for (let n = 0; n < 4; n++) {
    if (sameShape(rotate(from, n), to)) return n;
  }
  return -1;
}

/**
 * isChiral：手性形状——镜像没法靠旋转变回自己，
 * 就像左手的手套套不到右手上。
 */
export function isChiral(cells) {
  return rotationsNeeded(cells, mirror(cells)) === -1;
}

// 一个形状的 4 个旋转方向里，去掉转完重样的，剩几个「长得不一样」的写法。
function distinctRotations(cells) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const r = rotate(cells, k);
    if (!out.some((s) => sameShape(s, r))) out.push(r);
  }
  return out;
}

// 兜底干扰项：把 base（某个镜像旋转）掰动一个格子，造一个
// 格子数相同、外形相近、但既不是原形旋转、也不和已有选项重样的新形状。
// 确定性搜索（固定方向顺序），不用随机数，保证同一输入同一结果。
function bentVariant(shape, base, taken) {
  for (let i = 0; i < base.length; i++) {
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const moved = base.map(([x, y], j) => (j === i ? [x + dx, y + dy] : [x, y]));
      // 掰到已占的格子上会少一格，不要
      const uniq = new Set(moved.map(([x, y]) => `${x},${y}`));
      if (uniq.size !== shape.length) continue;
      const cand = normalize(moved);
      if (!isConnected(cand)) continue; // 零件不能散成两块
      if (taken.some((t) => sameShape(t, cand))) continue;
      if (rotationsNeeded(shape, cand) !== -1) continue;
      return cand;
    }
  }
  return null;
}

/**
 * makeChoices：给「找一找」玩法出题。
 * 返回 { options: [cells, cells, cells], answer }：
 *   - options[answer] 是正确答案：原形顺时针转 1–3 次的样子
 *     （跳过「转完和原样重合」的次数，比如 S 形转 180° 还是 S）；
 *   - 两个干扰项对原形的 rotationsNeeded 都是 -1（绝不是原形转出来的），
 *     其中至少一个是镜像的某个旋转——这是最容易看走眼的「翻面零件」；
 *   - 另一个干扰项优先选「镜像的另一个旋转」（长得不一样的那几个里挑），
 *     镜像自己太对称、转不出第二种样子时，才掰格子造同格数的近似形状；
 *   - rng 是返回 [0,1) 的函数，同一串随机数必然得到同一份题目。
 * shape 必须是手性形状，否则抛 Error（非手性的形状分不清「转」和「翻」）。
 */
export function makeChoices(shape, rng) {
  if (!isChiral(shape)) {
    throw new Error('makeChoices 需要手性形状：镜像能转回去的形状没法出「找一找」题');
  }
  const base = normalize(shape);

  // 1) 正确答案：转 1–3 次，排除转完重样的次数
  const ks = [1, 2, 3].filter((k) => !sameShape(rotate(base, k), base));
  const kList = ks.length > 0 ? ks : [1, 2, 3]; // 理论兜底：4 重对称的手性形状极罕见
  const correct = rotate(base, kList[Math.floor(rng() * kList.length)]);

  // 2) 干扰项一号：镜像的某个旋转（随机挑一个方向）
  const mirrorRots = distinctRotations(mirror(base));
  const first = Math.floor(rng() * mirrorRots.length);
  const d1 = mirrorRots[first];

  // 3) 干扰项二号：优先「镜像的另一个旋转」
  const rest = mirrorRots.filter((_, i) => i !== first);
  let d2 = rest.length > 0 ? rest[Math.floor(rng() * rest.length)] : null;
  // 镜像自己对称、只有一种样子时，掰格子造一个近似形状
  if (!d2) d2 = bentVariant(base, d1, [correct, d1]);
  // 理论兜底（真实多格骨牌到不了这里）：再转一次镜像，保证 d2 一定存在
  if (!d2) d2 = rotate(d1, 1);

  // 4) Fisher–Yates 洗牌，决定正确答案落在第几个位置（还是用同一个 rng）
  const options = [correct, d1, d2];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  const answer = options.indexOf(correct);
  return { options, answer };
}
