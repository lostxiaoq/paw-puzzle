// 天天的魔镜：游戏逻辑（SPEC 5.7）。
// 纯函数、不碰 DOM，Node 里可以直接 import。
// 网格约定：grid[r][c]，r 是行（向下增大），c 是列（向右增大），
// 值是颜色编号（1..colors.length），0 表示空格。
// 两种镜子：'vertical' = 竖线镜子（左右对称），'horizontal' = 横线镜子（上下对称）。

/**
 * 沿镜子翻转网格，返回新数组，不修改原数组。
 * vertical：每行左右翻转；horizontal：行的顺序上下翻转。
 */
export function reflect(grid, axis) {
  if (axis === 'vertical') {
    return grid.map((row) => [...row].reverse());
  }
  if (axis === 'horizontal') {
    return [...grid].reverse();
  }
  throw new Error(`未知的镜子方向: ${axis}`);
}

/** grid 和自己的镜像完全一样，就算对称。 */
export function isSymmetric(grid, axis) {
  const a = JSON.stringify(grid);
  const b = JSON.stringify(reflect(grid, axis));
  return a === b;
}

/**
 * 找出两个同尺寸网格不同的格子，按行优先（先 r 后 c）排列。
 * 对 8×8 网格用双重循环逐格比较，避免字符串化后的下标对不齐。
 */
export function diffCells(a, b) {
  const cells = [];
  const rows = a.length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) cells.push({ r, c });
    }
  }
  return cells;
}

/**
 * 开局给孩子的「半张图」。
 * 竖线镜子：左半边保留 solution 的颜色，右半边全为 0；
 * 横线镜子：上半边保留，下半边全为 0。
 * 返回和 solution 同尺寸的新数组。
 */
export function givenHalf(level) {
  const { axis, solution } = level;
  return solution.map((row, r) =>
    row.map((v, c) => {
      const keep = axis === 'vertical' ? c < row.length / 2 : r < solution.length / 2;
      return keep ? v : 0;
    })
  );
}
