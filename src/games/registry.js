// 游戏注册表（SPEC 5.4）。
// route 已有正式界面；mirror / rotate / cubes 仍是占位 view，
// 后续任务会陆续把 load 换成真实模块。

import { mount as placeholderMount } from './placeholder.js';
import { LEVELS as routeLevels } from './route/levels.js';

async function loadPlaceholder() {
  return { mount: placeholderMount };
}

async function loadRoute() {
  return import('./route/view.js');
}

export const GAMES = [
  { id: 'route', title: '阿奇巡逻', pup: 'chase', levelCount: routeLevels.length, load: loadRoute },
  { id: 'mirror', title: '天天的魔镜', pup: 'skye', levelCount: 12, load: loadPlaceholder },
  { id: 'rotate', title: '灰灰修零件', pup: 'rocky', levelCount: 12, load: loadPlaceholder },
  { id: 'cubes', title: '小砾搭积木', pup: 'rubble', levelCount: 12, load: loadPlaceholder },
];
