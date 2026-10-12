// 星级规则（SPEC 5.2）：第 1 次成功 3 星，第 2 次 2 星，3 次及以上 1 星。
// attempts 小于 1（0、负数、坏值）都按第 1 次算。

export function starsFor(attempts) {
  const n = Math.max(1, Math.round(Number(attempts) || 1));
  if (n <= 1) return 3;
  if (n === 2) return 2;
  return 1;
}
