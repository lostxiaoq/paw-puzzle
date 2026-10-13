// 台词清单（任务卡 014）：游戏里可能说出的每一句话都在这里。
//
// 格式：{ id, speaker, text }
//   speaker = 狗狗 id（chase / marshall / skye / rubble / rocky / zuma）
//   每句不超过 30 个字；带变量的句子已展开成全部具体句子。
//
// 用法：view 里写 say(LINES_GAME.route.intro) 这样取，不再写死字符串。
// 导出脚本 node src/voice/export-lines.mjs > lines.json 会把它交给 Claude 批量配音。
//
// 谁说话：
//   首页 / 过关夸奖 / 护眼提醒 → marshall（毛毛）
//   route = chase、mirror = skye、rotate = rocky、cubes = rubble（各游戏主持狗狗）
//   徽章墙上点某枚徽章 → 那只狗狗本人；新徽章提示 → 获得徽章的那只狗狗

// ———— 首页 / 选关页（毛毛主持） ————
export const LINES_HOME = {
  welcome: {
    id: 'home.welcome', speaker: 'marshall',
    text: '汪汪队集合！快挑一个游戏吧！',
  },
  levelsIntro: {
    id: 'levels.intro', speaker: 'marshall',
    text: '选一个亮晶晶的关卡出发喽！',
  },
};

// ———— 通用（过关夸奖 / 新徽章） ————
export const LINES_COMMON = {
  // 过关夸奖：随机说一句，每一句都要在这里
  praise: [
    { id: 'common.praise.1', speaker: 'marshall', text: '哇！太棒啦！' },
    { id: 'common.praise.2', speaker: 'marshall', text: '你真厉害！' },
    { id: 'common.praise.3', speaker: 'marshall', text: '汪汪！做对啦！' },
    { id: 'common.praise.4', speaker: 'marshall', text: '你真是小天才！' },
    { id: 'common.praise.5', speaker: 'marshall', text: '狗狗为你欢呼！' },
  ],
  // 新徽章提示：由获得徽章的那只狗狗自己说
  newBadge: [
    { id: 'common.newBadge.chase', speaker: 'chase', text: '我的徽章亮啦，谢谢！' },
    { id: 'common.newBadge.marshall', speaker: 'marshall', text: '新徽章到手，汪汪！' },
    { id: 'common.newBadge.skye', speaker: 'skye', text: '我的徽章飞来喽！' },
    { id: 'common.newBadge.rubble', speaker: 'rubble', text: '哇，我的徽章亮闪闪！' },
    { id: 'common.newBadge.rocky', speaker: 'rocky', text: '我的徽章修好啦！' },
    { id: 'common.newBadge.zuma', speaker: 'zuma', text: '我的徽章潜水来啦！' },
  ],
};

// ———— 阿奇巡逻（route，主持狗狗：chase） ————
export const LINES_ROUTE = {
  levelStart: { id: 'route.levelStart', speaker: 'chase', text: '阿奇准备好啦，出发！' },
  intro: { id: 'route.intro', speaker: 'chase', text: '帮阿奇找小猫！点箭头排路线，再出发' },
  introBones: { id: 'route.introBones', speaker: 'chase', text: '先吃光骨头，再去找小猫哦！' },
  hint: { id: 'route.hint', speaker: 'chase', text: '跟着蓝色虚线走一走！' },
  blocked: { id: 'route.blocked', speaker: 'chase', text: '哎呀，前面过不去啦！' },
  notReached: { id: 'route.notReached', speaker: 'chase', text: '还差一点点，再想想！' },
  missedBones: { id: 'route.missedBones', speaker: 'chase', text: '骨头还没吃完呢！' },
  noCards: { id: 'route.noCards', speaker: 'chase', text: '先点箭头排路线，再出发哦！' },
};

// ———— 天天的魔镜（mirror，主持狗狗：skye） ————
export const LINES_MIRROR = {
  levelStart: { id: 'mirror.levelStart', speaker: 'skye', text: '天天把魔镜擦亮啦！' },
  introVertical: {
    id: 'mirror.introVertical', speaker: 'skye',
    text: '把镜子那边涂成一模一样吧！',
  },
  introHorizontal: {
    id: 'mirror.introHorizontal', speaker: 'skye',
    text: '镜子横过来啦！上下要画一样哦！',
  },
  // 「你画出了一个 ××！」按每关 name 展开（14 关）
  doneByLevel: MIRROR_DONE(),
  hintPair: { id: 'mirror.hintPair', speaker: 'skye', text: '看看一起发光的两个格子！' },
  hintCheck: { id: 'mirror.hintCheck', speaker: 'skye', text: '涂好啦？快按检查！' },
  wrong: { id: 'mirror.wrong', speaker: 'skye', text: '有几个格子不对，再看看镜子！' },
};

function MIRROR_DONE() {
  const NAMES = [
    '小房子', '爱心', '小树', '小花', '皇冠', '房子', '糖果', '沙漏',
    '大骨头', '狗爪印', '蝴蝶结', '花蝴蝶', '圣诞树', '汪汪盾牌',
  ];
  return NAMES.map((name, i) => ({
    id: `mirror.done.${i + 1}`,
    speaker: 'skye',
    text: `你画出了一个${name}！`,
  }));
}

// ———— 灰灰修零件（rotate，主持狗狗：rocky） ————
export const LINES_ROTATE = {
  levelStart: { id: 'rotate.levelStart', speaker: 'rocky', text: '灰灰带零件来修东西啦！' },
  introTurn: { id: 'rotate.introTurn', speaker: 'rocky', text: '点转一转，让零件和影子一样！' },
  introChoose: { id: 'rotate.introChoose', speaker: 'rocky', text: '哪个是零件转过去的样子？' },
  hintTurn: { id: 'rotate.hintTurn', speaker: 'rocky', text: '看影子，把它转成一样的！' },
  hintDim: { id: 'rotate.hintDim', speaker: 'rocky', text: '这个不对，看看别的吧！' },
  // 转一转过关：「零件修好啦！××装上了！」按每关 name 展开
  fixedByLevel: ROTATE_FIXED(),
  // 找一找过关：「找对啦！这就是 ×× 转过去的样子！」
  foundByLevel: ROTATE_FOUND(),
  wrongFlip: { id: 'rotate.wrongFlip', speaker: 'rocky', text: '这是翻面的，转不出来哦！' },
};

function ROTATE_FIXED() {
  // 转一转关卡（mode: 'turn'）的名字，顺序和 levels.js 一致
  // rotate-2 / rotate-3 都叫「拐角」，台词带序号区分（清单键 = speaker|text 不能重复）
  const NAMES = ['直条', '第 1 个拐角', '第 2 个拐角', '长椅', '小雨伞', '小椅子', '凹槽', '小台阶'];
  return NAMES.map((name, i) => ({
    id: `rotate.fixed.${i + 1}`,
    speaker: 'rocky',
    text: `修好啦！${name}装上啦！`,
  }));
}

function ROTATE_FOUND() {
  // 找一找关卡（mode: 'choose'）的名字，顺序和 levels.js 一致
  const NAMES = ['L 零件', 'J 零件', 'S 闪电', 'Z 闪电', '长梯子', '小树杈', '大闪电'];
  return NAMES.map((name, i) => ({
    id: `rotate.found.${i + 1}`,
    speaker: 'rocky',
    text: `找对啦！${name}转好了！`,
  }));
}

// ———— 小砾搭积木（cubes，主持狗狗：rubble） ————
export const LINES_CUBES = {
  levelStart: { id: 'cubes.levelStart', speaker: 'rubble', text: '小砾搭好了，来数积木！' },
  introCount: { id: 'cubes.introCount', speaker: 'rubble', text: '一共有几块积木？数一数！' },
  introFront: { id: 'cubes.introFront', speaker: 'rubble', text: '从前面看，积木是什么样？' },
  hintExplode: { id: 'cubes.hintExplode', speaker: 'rubble', text: '呼——拆开看看，藏着也要数！' },
  hintOutline: { id: 'cubes.hintOutline', speaker: 'rubble', text: '黄色虚线就是前面的样子！' },
  wrongCount: { id: 'cubes.wrongCount', speaker: 'rubble', text: '再数数，别忘了藏起来的！' },
  // 数一数答对后一块一块数出声：「1」「2」……最多 16 块
  count: COUNT_WORDS(16),
  countDone: { id: 'cubes.countDone', speaker: 'rubble', text: '全部数完啦，真棒！' },
  frontDone: { id: 'cubes.frontDone', speaker: 'rubble', text: '看！这就是前面的样子！' },
};

function COUNT_WORDS(max) {
  const out = [];
  for (let n = 1; n <= max; n++) {
    out.push({ id: `cubes.count.${n}`, speaker: 'rubble', text: String(n) });
  }
  return out;
}

// ———— 徽章墙（marshall 主持；点徽章 = 那只狗狗本人说话） ————
export const LINES_BADGES = {
  wallIntro: {
    id: 'badges.wallIntro', speaker: 'marshall',
    text: '这是你的徽章墙，好闪亮呀！',
  },
  // 点开已获得的徽章，狗狗本人道谢
  thanks: [
    { id: 'badge.thanks.chase', speaker: 'chase', text: '谢谢你帮我巡逻！汪！' },
    { id: 'badge.thanks.marshall', speaker: 'marshall', text: '哇，好多星星，谢谢！' },
    { id: 'badge.thanks.skye', speaker: 'skye', text: '谢谢你陪我照魔镜！' },
    { id: 'badge.thanks.rubble', speaker: 'rubble', text: '谢谢你陪我搭积木！' },
    { id: 'badge.thanks.rocky', speaker: 'rocky', text: '谢谢你帮我修零件！' },
    { id: 'badge.thanks.zuma', speaker: 'zuma', text: '每个游戏都玩过，真棒！' },
  ],
  // 点开还没获得的徽章，读解锁提示（狗狗本人说）
  hints: [
    { id: 'badge.hint.chase', speaker: 'chase', text: '巡逻过 5 关，我就能醒来啦！' },
    { id: 'badge.hint.marshall', speaker: 'marshall', text: '攒够 30 颗星星，我就来敬礼！' },
    { id: 'badge.hint.skye', speaker: 'skye', text: '照 5 关魔镜，我就飞来啦！' },
    { id: 'badge.hint.rubble', speaker: 'rubble', text: '搭 5 关积木，我就蹦出来！' },
    { id: 'badge.hint.rocky', speaker: 'rocky', text: '修好 5 个零件，徽章归你啦！' },
    { id: 'badge.hint.zuma', speaker: 'zuma', text: '四个游戏都玩玩，我来潜水艇！' },
  ],
};

// ———— 护眼提醒（毛毛） ————
export const LINES_BREAK = {
  timeUp: {
    id: 'break.timeUp', speaker: 'marshall',
    text: '玩了好久啦，看看远处歇歇眼睛！',
  },
  rested: {
    id: 'break.rested', speaker: 'marshall',
    text: '休息好啦，我们继续冒险吧！',
  },
};

// ———— 汇总 ————
export const LINES = [
  LINES_HOME.welcome,
  LINES_HOME.levelsIntro,
  ...LINES_COMMON.praise,
  ...LINES_COMMON.newBadge,
  ...LINES_ROUTE_LIST(), // 含 route.levelStart（Object.keys 展开）
  ...LINES_MIRROR.doneByLevel,
  LINES_MIRROR.levelStart,
  LINES_MIRROR.introVertical,
  LINES_MIRROR.introHorizontal,
  LINES_MIRROR.hintPair,
  LINES_MIRROR.hintCheck,
  LINES_MIRROR.wrong,
  ...LINES_ROTATE.fixedByLevel,
  ...LINES_ROTATE.foundByLevel,
  LINES_ROTATE.levelStart,
  LINES_ROTATE.introTurn,
  LINES_ROTATE.introChoose,
  LINES_ROTATE.hintTurn,
  LINES_ROTATE.hintDim,
  LINES_ROTATE.wrongFlip,
  ...LINES_CUBES.count,
  LINES_CUBES.levelStart,
  LINES_CUBES.introCount,
  LINES_CUBES.introFront,
  LINES_CUBES.hintExplode,
  LINES_CUBES.hintOutline,
  LINES_CUBES.wrongCount,
  LINES_CUBES.countDone,
  LINES_CUBES.frontDone,
  LINES_BADGES.wallIntro,
  ...LINES_BADGES.thanks,
  ...LINES_BADGES.hints,
  LINES_BREAK.timeUp,
  LINES_BREAK.rested,
];

function LINES_ROUTE_LIST() {
  return Object.keys(LINES_ROUTE).map((k) => LINES_ROUTE[k]);
}

// ———— 取台词的小工具 ————
// line('mirror.done.3') → 台词对象；找不到返回兜底句（永远不会念 undefined）
const BY_ID = new Map(LINES.map((l) => [l.id, l]));
export function line(id, fallbackText) {
  const found = BY_ID.get(id);
  if (found) return found;
  return { id: 'fallback', speaker: 'marshall', text: fallbackText || '汪汪！' };
}
