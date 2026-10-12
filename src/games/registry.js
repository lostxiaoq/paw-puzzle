// 游戏注册表（SPEC 5.4）。
// 四个游戏的 view 还没写，load() 统一返回占位 view；
// levelCount 暂时都是 12，后续任务会改成读真实关卡数。

import { mount } from './placeholder.js';

async function loadPlaceholder() {
  return { mount };
}

export const GAMES = [
  { id: 'route', title: '阿奇巡逻', pup: 'chase', levelCount: 12, load: loadPlaceholder },
  { id: 'mirror', title: '天天的魔镜', pup: 'skye', levelCount: 12, load: loadPlaceholder },
  { id: 'rotate', title: '灰灰修零件', pup: 'rocky', levelCount: 12, load: loadPlaceholder },
  { id: 'cubes', title: '小砾搭积木', pup: 'rubble', levelCount: 12, load: loadPlaceholder },
];
