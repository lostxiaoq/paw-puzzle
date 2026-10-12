// route 设计台 v7：l10-v6 (12,10,+2) 差一步；l11/l12 的骨头绕路不亏步 →
// 原因：骨头放在「反正要路过」的地方。把骨头放到墙后的「口袋」里才有 diff。
import { solve } from '../../src/games/route/logic.js';

const show = (tag, lv) => {
  const w = solve(lv);
  const nw = solve({ ...lv, walls: [] });
  console.log(
    tag,
    JSON.stringify({
      withWalls: w && w.length, noWalls: nw && nw.length,
      diff: w && nw ? nw.length - w.length : null,
      lenOk: !!w && w.length <= 11,
    }),
  );
};

// —— 第 10 关：竖墙 x=1 封 y=1..2，骨头 (0,2) 贴左上口袋 + (4,2) ——
// v6 是 12 步：把第二根骨头从 (4,2) 挪到 (3,1)（少绕）
show('l10-v7', {
  id: 'route-10', theme: 'park',
  cols: 6, rows: 6,
  start: { x: 0, y: 0 }, goal: { x: 5, y: 5 },
  walls: [{ x: 1, y: 1 }, { x: 1, y: 2 }],
  bones: [{ x: 0, y: 2 }, { x: 3, y: 1 }],
});
// 或者墙只封 1 格：(1,2)，骨头 (0,2)
show('l10-v7b', {
  id: 'route-10', theme: 'park',
  cols: 6, rows: 6,
  start: { x: 0, y: 0 }, goal: { x: 5, y: 5 },
  walls: [{ x: 1, y: 2 }],
  bones: [{ x: 0, y: 2 }, { x: 4, y: 2 }],
});

// —— 第 11 关：骨头必须绕路才吃得到。树墙 y=1 留口 (5,1)，终点 (5,0)；
// 骨头放 (1,3) 和 (3,3)：从口下来先吃 (3,3) 再吃 (1,3) 再回口 ——
// v6 里 13 步 = 无障碍也是 13，说明骨头布局让无障碍解也得绕。
// 改：无障碍最短变短 → 骨头往下挪一格，无障碍 11
show('l11-v7', {
  id: 'route-11', theme: 'beach',
  cols: 6, rows: 6,
  start: { x: 0, y: 0 }, goal: { x: 5, y: 0 },
  walls: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }],
  bones: [{ x: 2, y: 4 }, { x: 4, y: 3 }],
});

// —— 第 12 关：圈口朝上、起点右上。v6 里骨头 (0,1) 让无障碍也 14。
// 骨头 2 改 (1,4)（终点旁边），无障碍 = 9 → 绕圈后 12——还超。
// 换思路：把圈缩小成 3 格 L 形，骨头圈里，整体步数就小：
show('l12-v7', {
  id: 'route-12', theme: 'city',
  cols: 6, rows: 6,
  start: { x: 5, y: 0 }, goal: { x: 0, y: 5 },
  walls: [
    { x: 2, y: 2 }, { x: 4, y: 2 },
    { x: 2, y: 3 }, { x: 4, y: 3 },
    { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
  ],
  bones: [{ x: 3, y: 3 }, { x: 1, y: 1 }],
});
