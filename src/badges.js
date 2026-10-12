// 徽章规则（任务卡 011）。
// 「过关」= 该关在进度里有星数记录（stars 里有大于 0 的值）。
// earnedBadges 是纯函数：不碰 DOM / localStorage，Node 里可以直接测。

// 四个游戏对应的狗狗徽章 + 获得门槛
export const GAME_BADGES = [
  { pup: 'chase', game: 'route', need: 5 }, // 阿奇：巡逻过关 ≥ 5
  { pup: 'skye', game: 'mirror', need: 5 }, // 天天：魔镜过关 ≥ 5
  { pup: 'rocky', game: 'rotate', need: 5 }, // 灰灰：修零件过关 ≥ 5
  { pup: 'rubble', game: 'cubes', need: 5 }, // 小砾：搭积木过关 ≥ 5
];
const TOTAL_STAR_GOAL = 30; // 毛毛：总星数 ≥ 30

// 读取某游戏「过关数」（stars 里值 > 0 的关数），坏数据当 0
function playedCount(data, gameId) {
  const p = data ? data[gameId] : null;
  if (!p || typeof p !== 'object' || !p.stars || typeof p.stars !== 'object') return 0;
  let n = 0;
  for (const v of Object.values(p.stars)) {
    const num = Number(v);
    if (Number.isFinite(num) && num > 0) n += 1;
  }
  return n;
}

// 总星数 = 所有游戏所有关的星数之和
export function totalStarsOf(progressByGame) {
  const data = progressByGame && typeof progressByGame === 'object' ? progressByGame : {};
  let sum = 0;
  for (const b of GAME_BADGES) {
    const p = data[b.game];
    if (!p || typeof p !== 'object' || !p.stars || typeof p.stars !== 'object') continue;
    for (const v of Object.values(p.stars)) {
      const num = Number(v);
      if (Number.isFinite(num) && num > 0) sum += num;
    }
  }
  return sum;
}

// 主入口：progressByGame 形如 { route: { unlocked, stars: {0:3,...} }, ... }
// 返回 { chase: bool, skye: bool, rocky: bool, rubble: bool, marshall: bool, zuma: bool }
export function earnedBadges(progressByGame) {
  const data = progressByGame && typeof progressByGame === 'object' ? progressByGame : {};
  const result = {};
  // 四只狗狗：对应游戏过关数达到门槛
  for (const b of GAME_BADGES) {
    result[b.pup] = playedCount(data, b.game) >= b.need;
  }
  // 毛毛：总星数够多
  result.marshall = totalStarsOf(data) >= TOTAL_STAR_GOAL;
  // 路马：四个游戏都至少过 1 关
  result.zuma = GAME_BADGES.every((b) => playedCount(data, b.game) >= 1);
  return result;
}

// 未获得徽章时的提示语（点徽章朗读，也显示在卡片上）
export const BADGE_HINTS = {
  chase: '帮阿奇巡逻过 5 关，就能叫醒他啦',
  skye: '帮天天照 5 关魔镜，她就飞来啦',
  rocky: '帮灰灰修好 5 个零件，徽章就是你的啦',
  rubble: '和小砾搭 5 关积木，他就会蹦出来啦',
  marshall: '攒够 30 颗星星，毛毛就来敬礼啦',
  zuma: '四个游戏都玩一玩，路马就浮出水面啦',
};

// 已获得徽章时点一下，狗狗说谢谢
export const BADGE_THANKS = {
  chase: '阿奇说：谢谢你帮我巡逻！',
  skye: '天天说：谢谢你帮我照魔镜！',
  rocky: '灰灰说：谢谢你帮我修零件！',
  rubble: '小砾说：谢谢你陪我搭积木！',
  marshall: '毛毛说：哇，好多星星，谢谢你！',
  zuma: '路马说：每个游戏你都玩过，真厉害！',
};
