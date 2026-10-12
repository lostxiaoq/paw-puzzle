// 游戏注册表（SPEC 5.4）。四个游戏的正式界面都已完成。

import { mount as placeholderMount } from './placeholder.js';
import { LEVELS as routeLevels } from './route/levels.js';
import { LEVELS as mirrorLevels } from './mirror/levels.js';
import { LEVELS as rotateLevels } from './rotate/levels.js';
import { LEVELS as cubesLevels } from './cubes/levels.js';

async function loadPlaceholder() {
  return { mount: placeholderMount };
}

async function loadRoute() {
  return import('./route/view.js');
}

async function loadMirror() {
  return import('./mirror/view.js');
}

async function loadRotate() {
  return import('./rotate/view.js');
}

async function loadCubes() {
  return import('./cubes/view.js');
}

export const GAMES = [
  { id: 'route', title: '阿奇巡逻', pup: 'chase', levelCount: routeLevels.length, load: loadRoute },
  { id: 'mirror', title: '天天的魔镜', pup: 'skye', levelCount: mirrorLevels.length, load: loadMirror },
  { id: 'rotate', title: '灰灰修零件', pup: 'rocky', levelCount: rotateLevels.length, load: loadRotate },
  { id: 'cubes', title: '小砾搭积木', pup: 'rubble', levelCount: cubesLevels.length, load: loadCubes },
];
