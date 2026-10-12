// 小砾搭积木：游戏逻辑（SPEC 5.9）。
// 纯函数、不碰 DOM，Node 里可以直接 import。
//
// 高度图 h[row][col]：row 0 在最后面，row 越大越靠近观察者；col 从左到右。
// view 用等轴测投影画积木（观察者在「右前上方」）：
//   屏幕 x = (col − row) · W / 2
//   屏幕 y = (col + row) · H / 2 − z · H
// 所以 row、col 越大的格子越靠前，要越晚画（画家算法）。

/**
 * countCubes：一共有几块积木。
 * 高度图里每个格子的数字就是这一摞积木的块数，全部加起来即可。
 */
export function countCubes(h) {
  let total = 0;
  for (const row of h) {
    for (const v of row) total += v;
  }
  return total;
}

/**
 * frontHeights：从前面看，每一列的高度。
 * 从前面只看得到每列「最高」的那一摞，所以取每列的最大值。
 * 返回数组长度 = 列数，第 c 个值是第 c 列从前面看的高度。
 */
export function frontHeights(h) {
  const cols = h[0].length;
  const out = [];
  for (let c = 0; c < cols; c++) {
    let best = 0;
    for (const row of h) {
      if (row[c] > best) best = row[c];
    }
    out.push(best);
  }
  return out;
}

/**
 * leftHeights：从左侧看，每一行的高度。
 * 从左边只看得到每行「最高」的那一摞，取每行的最大值。
 * 按 row 从后到前的顺序排列（row 0 最后面，排最前面）。
 */
export function leftHeights(h) {
  return h.map((row) => row.reduce((a, b) => (b > a ? b : a), 0));
}

/**
 * topView：从上面看，哪些格子有积木。
 * 返回和高度图同尺寸的布尔二维数组，h[r][c] > 0 就是 true。
 */
export function topView(h) {
  return h.map((row) => row.map((v) => v > 0));
}

/**
 * numberChoices：给「数一数」玩法出三个数字按钮。
 * 返回 3 个互不相同的正整数（包含正确答案 n），顺序已打乱。
 * 干扰项和 n 相差不超过 3——太远了孩子闭着眼都能排除，就没有思考价值了。
 * rng 是返回 [0,1) 的函数，同一串随机数必然得到同一份题目。
 */
export function numberChoices(n, rng) {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('numberChoices 需要正整数 n');
  }
  // 候选池：n±1、n±2、n±3，去掉小于 1 的（积木数不可能为 0 或负数）
  const pool = [];
  for (let d = 1; d <= 3; d++) {
    if (n - d >= 1) pool.push(n - d);
    pool.push(n + d);
  }
  // 从候选池里不重复地抽 2 个干扰项（抓阄式：抽一个拿走一个）
  const options = [n];
  for (let k = 0; k < 2 && pool.length > 0; k++) {
    const i = Math.floor(rng() * pool.length);
    options.push(pool.splice(i, 1)[0]);
  }
  // Fisher–Yates 洗牌，决定正确答案落在第几个按钮上（还是用同一个 rng）
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
