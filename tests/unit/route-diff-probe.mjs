// 临时分析脚本：算 route 每关「有障碍 vs 无障碍」最短步数差 + 关卡难度（不进验收）。
import { solve } from '../../src/games/route/logic.js';
import { LEVELS } from '../../src/games/route/levels.js';

for (const lv of LEVELS) {
  const withWalls = solve(lv);
  const noWalls = solve({ ...lv, walls: [] });
  const diff = withWalls === null ? '无解!' : noWalls === null ? '?' : noWalls.length - withWalls.length;
  const okLen = withWalls && withWalls.length <= 11;
  console.log(
    `${lv.id}  有障碍=${withWalls && withWalls.length}  无障碍=${noWalls && noWalls.length}  差=${diff}`
    + `  maxCards=${lv.maxCards}  ≤11步:${okLen ? 'OK' : '超标'}`,
  );
}
