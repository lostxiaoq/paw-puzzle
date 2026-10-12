// 阿奇巡逻：游戏逻辑（SPEC 5.6）。
// 纯函数、不碰 DOM，Node 里可以直接 import。
// 坐标约定：x 是列（向右增大），y 是行（向下增大），左上角是 (0,0)。

// 四张方向卡：每张让阿奇移动一格。
const MOVES = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// BFS 按固定顺序展开方向，保证同一关卡求出的最短解是确定、可复现的。
const ORDER = ['up', 'down', 'left', 'right'];

const cellKey = (x, y) => `${x},${y}`;

/**
 * 执行孩子排好的指令，一步一步走。
 * 撞墙 / 出界立刻停下（后面的指令不再执行）；
 * 全部走完才看结果：到终点且骨头吃满 = success。
 * 不修改传入的 level，也不复用 level 里的对象。
 */
export function runProgram(level, program) {
  const walls = new Set(level.walls.map((w) => cellKey(w.x, w.y)));
  // 每根骨头记一个“吃到没”的标记，同一根踩多次只算一次。
  const bones = level.bones.map((b) => ({ x: b.x, y: b.y, got: false }));
  const path = [{ x: level.start.x, y: level.start.y }];
  let x = level.start.x;
  let y = level.start.y;
  let collected = 0;

  // 阿奇出发时脚下若压着骨头，也算吃到（和 solve() 的起点掩码保持一致）
  for (const b of bones) {
    if (b.x === x && b.y === y) {
      b.got = true;
      collected += 1;
    }
  }

  for (let i = 0; i < program.length; i++) {
    const move = MOVES[program[i]];
    if (!move) continue; // 未知指令防御：原地不动，不让程序崩掉
    const [dx, dy] = move;
    const nx = x + dx;
    const ny = y + dy;

    // 出界：停下，这一步不走进 path
    if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) {
      return { status: 'outOfBounds', path, failedAt: i, collected };
    }
    // 撞墙：同样停下
    if (walls.has(cellKey(nx, ny))) {
      return { status: 'blocked', path, failedAt: i, collected };
    }

    x = nx;
    y = ny;
    path.push({ x, y });
    for (const b of bones) {
      if (!b.got && b.x === x && b.y === y) {
        b.got = true;
        collected += 1;
      }
    }
  }

  // 指令走完了：中途路过终点不算，只看最后停在哪。
  const atGoal = x === level.goal.x && y === level.goal.y;
  const status = !atGoal
    ? 'notReached'
    : collected < bones.length
      ? 'missedBones'
      : 'success';
  return { status, path, failedAt: -1, collected };
}

/**
 * 求最短的成功指令序列（BFS）。
 * 状态 = (位置, 已吃骨头集合)，骨头用二进制位压缩成一个整数。
 * 无解返回 null；起点即终点且无骨头时返回 []。
 */
export function solve(level) {
  const walls = new Set(level.walls.map((w) => cellKey(w.x, w.y)));
  const boneKeys = level.bones.map((b) => cellKey(b.x, b.y));
  const fullMask = (1 << boneKeys.length) - 1;

  // 起点本身可能就压着一根骨头
  const startKey = cellKey(level.start.x, level.start.y);
  let startMask = 0;
  boneKeys.forEach((k, i) => {
    if (k === startKey) startMask |= 1 << i;
  });

  if (startKey === cellKey(level.goal.x, level.goal.y) && startMask === fullMask) {
    return [];
  }

  const seen = new Set([`${level.start.x},${level.start.y},${startMask}`]);
  // 队列元素：[x, y, 已吃骨头掩码, 走到这里的指令数组]
  const queue = [[level.start.x, level.start.y, startMask, []]];

  while (queue.length > 0) {
    const [x, y, mask, prog] = queue.shift();
    for (const cmd of ORDER) {
      const [dx, dy] = MOVES[cmd];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
      if (walls.has(cellKey(nx, ny))) continue;

      // 踩到新骨头就把它记进掩码
      let nmask = mask;
      boneKeys.forEach((k, i) => {
        if (k === cellKey(nx, ny)) nmask |= 1 << i;
      });
      const nprog = [...prog, cmd];

      // 到终点且骨头吃满：BFS 第一次到达就是最短
      if (nx === level.goal.x && ny === level.goal.y && nmask === fullMask) {
        return nprog;
      }

      const stateKey = `${nx},${ny},${nmask}`;
      if (seen.has(stateKey)) continue;
      seen.add(stateKey);
      queue.push([nx, ny, nmask, nprog]);
    }
  }
  return null;
}
