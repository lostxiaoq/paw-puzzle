// 汪汪队空间大冒险 — 狗狗形象（SPEC 第 2 节、5.5）
//
// 6 只我们自己的原创卡通小狗，统一画风：
//   大圆脑袋 + 两只耳朵 + 大眼睛（带高光）+ 小鼻子 + 嘴巴，
//   脖子上项圈 + 圆形徽章，徽章里画各自职业的图案。
// 每只狗靠「耳朵形状 / 毛色 / 帽子款式 / 徽章图案」一眼区分，
// 主色只用在项圈、徽章和帽子上（SPEC 要求）。
// 全部用 SVG 基本图形（circle / ellipse / path / rect），不嵌任何图片。

// ———— 角色元数据（验收按这张表核对） ————
export const PUPS = [
  { id: 'chase', name: '阿奇', color: '#1f5fbf', role: '警察' },
  { id: 'marshall', name: '毛毛', color: '#d62828', role: '消防员' },
  { id: 'skye', name: '天天', color: '#ff6fa8', role: '飞行员' },
  { id: 'rubble', name: '小砾', color: '#f6c20b', role: '工程' },
  { id: 'rocky', name: '灰灰', color: '#3a9d4a', role: '环保' },
  { id: 'zuma', name: '路马', color: '#ff8c1a', role: '水上救援' },
];

// ———— 每只狗的毛色与配色 ————
// fur: 头身毛色；furDark: 描边/暗部；muzzle: 嘴筒浅色；
// bg: 背景圆的浅色底；hatDark: 帽檐暗色；sym: 徽章图案用色。
const LOOKS = {
  // 阿奇：棕色德牧，竖尖耳
  chase: {
    fur: '#b0793f', furDark: '#94612f', innerEar: '#e6c296',
    muzzle: '#e9c99d', bg: '#e3edfb', hatDark: '#17498f', sym: '#1f5fbf',
  },
  // 毛毛：白底黑斑点的斑点狗，圆垂耳
  marshall: {
    fur: '#ffffff', furDark: '#d9d9d9', innerEar: '#f7c9c9',
    muzzle: '#f6f6f6', bg: '#ffe1e1', hatDark: '#a91f1f', sym: '#d62828',
  },
  // 天天：浅金色可卡犬，长垂耳
  skye: {
    fur: '#f2cd8f', furDark: '#d8a95f', innerEar: '#dcab5e',
    muzzle: '#fbe9c8', bg: '#ffe4ef', hatDark: '#de5390', sym: '#ff6fa8',
  },
  // 小砾：浅棕色斗牛犬，小折耳
  rubble: {
    fur: '#e5b585', furDark: '#c69463', innerEar: '#f3d9b6',
    muzzle: '#f5ddb9', bg: '#fdf3d8', hatDark: '#cfa100', sym: '#a87f00',
  },
  // 灰灰：灰色毛，一只立耳一只折耳
  rocky: {
    fur: '#bcc3c9', furDark: '#99a1a8', innerEar: '#dfe4e8',
    muzzle: '#e8ecef', bg: '#e2f2e4', hatDark: '#2c7a38', sym: '#3a9d4a',
  },
  // 路马：巧克力色拉布拉多，宽垂耳
  zuma: {
    fur: '#9a6838', furDark: '#7c5229', innerEar: '#6f451f',
    muzzle: '#d3a874', bg: '#ffeeda', hatDark: '#d97000', sym: '#ff8c1a',
  },
};

const MOODS = ['normal', 'happy', 'thinking'];

// ———— 徽章图案（以徽章圆心为原点，尺寸约 ±9） ————

// 五角星（阿奇：警察）
const STAR_PATH =
  'M0 -9 L2.35 -3.24 L8.56 -2.78 L3.8 1.24 L5.29 7.28 L0 4 ' +
  'L-5.29 7.28 L-3.8 1.24 L-8.56 -2.78 L-2.35 -3.24 Z';

// 回收三角的一段弧 + 箭头（灰灰：环保），复制旋转 3 次拼成循环箭头
const RECYCLE_SEG =
  '<path d="M2.33 -8.69 A9 9 0 0 1 8.69 2.33" fill="none" stroke="COL" ' +
  'stroke-width="3.4" stroke-linecap="round"/>' +
  '<path d="M7.8 5.7 L11.1 3 L6.3 1.7 Z" fill="COL"/>';

const BADGE_ART = {
  star: (c) => `<path d="${STAR_PATH}" fill="${c}"/>`,

  // 火苗（毛毛：消防员），外圈火舌 + 内芯浅色
  flame: (c) =>
    '<path d="M0 -9 C5 -5 7.5 -1.5 7.5 2 C7.5 6.4 4.2 9 0 9 ' +
    `C-4.2 9 -7.5 6.4 -7.5 2 C-7.5 -1.5 -5 -5 0 -9 Z" fill="${c}"/>` +
    '<path d="M0 -2.5 C2.2 0 2.8 1.3 2.8 2.8 A2.8 2.8 0 1 1 -2.8 2.8 ' +
    'C-2.8 1.3 -2.2 0 0 -2.5 Z" fill="#ffffff" opacity="0.85"/>',

  // 一对小翅膀（天天：飞行员），上下两根羽毛一笔
  wings: (c) =>
    `<path d="M-1 0 Q-9 -6.5 -16 -2.5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M-1 2 Q-8 -1 -14 3" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M1 0 Q9 -6.5 16 -2.5" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M1 2 Q8 -1 14 3" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,

  // 开口扳手（小砾：工程），斜柄 + 带缺口的圆头
  wrench: (c) =>
    `<path d="M2.5 -2.5 L-6.5 9" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>` +
    `<path d="M2.2 -12 A7 7 0 1 0 12 -2.2" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>`,

  // 循环箭头三角（灰灰：环保）
  recycle: (c) =>
    ['0', '120', '240']
      .map((r) => `<g transform="rotate(${r})">${RECYCLE_SEG.replaceAll('COL', c)}</g>`)
      .join(''),

  // 水滴（路马：水上救援），带一点高光
  drop: (c) =>
    '<path d="M0 -9 C4.5 -3.5 6.5 -0.5 6.5 2.5 A6.5 6.5 0 1 1 -6.5 2.5 ' +
    `C-6.5 -0.5 -4.5 -3.5 0 -9 Z" fill="${c}"/>` +
    '<ellipse cx="-2" cy="2.5" rx="1.7" ry="2.6" fill="#ffffff" opacity="0.75"/>',
};

// ———— 身体：小圆身板 + 浅色肚皮 ————
function body(look, spots) {
  const spot = spots ? '<ellipse cx="118" cy="176" rx="6" ry="4.5" fill="#2b2b2b"/>' : '';
  return (
    `<path d="M72 192 L72 174 Q72 154 100 154 Q128 154 128 174 L128 192 Z" ` +
    `fill="${look.fur}" stroke="${look.furDark}" stroke-width="2"/>` +
    `<ellipse cx="100" cy="184" rx="16" ry="8" fill="${look.muzzle}"/>` +
    spot
  );
}

// ———— 耳朵（画在脑袋后面，只露尖尖） ————
function earsBack(look, id) {
  if (id === 'chase') {
    // 阿奇：两只竖起的尖耳朵
    return (
      `<path d="M50 62 L18 30 L70 44 Z" fill="${look.furDark}"/>` +
      `<path d="M52 56 L32 36 L64 46 Z" fill="${look.innerEar}"/>` +
      `<path d="M150 62 L182 30 L130 44 Z" fill="${look.furDark}"/>` +
      `<path d="M148 56 L168 36 L136 46 Z" fill="${look.innerEar}"/>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：左耳立起（右耳折下来，画在前面那层）
    return (
      `<path d="M52 60 L28 36 L74 46 Z" fill="${look.furDark}"/>` +
      `<path d="M54 55 L38 42 L66 48 Z" fill="${look.innerEar}"/>`
    );
  }
  return '';
}

// ———— 脑袋（毛毛加黑斑点） ————
function head(look, spots) {
  const spotDefs = spots
    ? '<ellipse cx="72" cy="66" rx="10" ry="8" fill="#2b2b2b" transform="rotate(-18 72 66)"/>' +
      '<ellipse cx="134" cy="82" rx="6" ry="5" fill="#2b2b2b"/>' +
      '<ellipse cx="64" cy="106" rx="5" ry="4" fill="#2b2b2b"/>'
    : '';
  return (
    `<circle cx="100" cy="100" r="58" fill="${look.fur}" ` +
    `stroke="${look.furDark}" stroke-width="2.5"/>` +
    spotDefs
  );
}

// ———— 嘴筒 + 鼻子 ————
function muzzleNose(look, freckles) {
  const dots = freckles
    ? '<g fill="#c69a5f" opacity="0.6">' +
      '<circle cx="84" cy="121" r="1.4"/><circle cx="80" cy="127" r="1.4"/><circle cx="87" cy="130" r="1.4"/>' +
      '<circle cx="116" cy="121" r="1.4"/><circle cx="120" cy="127" r="1.4"/><circle cx="113" cy="130" r="1.4"/>' +
      '</g>'
    : '';
  return (
    `<ellipse cx="100" cy="124" rx="25" ry="17" fill="${look.muzzle}" ` +
    `stroke="${look.furDark}" stroke-width="1.5"/>` +
    `<ellipse cx="100" cy="115" rx="7.5" ry="5.5" fill="#35281e"/>` +
    dots
  );
}

// ———— 耳朵（画在脑袋前面：垂耳、折耳） ————
function earsFront(look, id) {
  if (id === 'marshall') {
    // 毛毛：白色圆垂耳，左耳带一个斑点
    return (
      '<g transform="rotate(16 42 84)">' +
      `<ellipse cx="42" cy="84" rx="16" ry="28" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2"/>` +
      '<ellipse cx="40" cy="98" rx="5.5" ry="7" fill="#2b2b2b"/></g>' +
      '<g transform="rotate(-16 158 84)">' +
      `<ellipse cx="158" cy="84" rx="16" ry="28" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2"/></g>`
    );
  }
  if (id === 'skye') {
    // 天天：长长的大垂耳，一直垂到脸旁
    return (
      '<g transform="rotate(12 38 98)">' +
      `<ellipse cx="38" cy="98" rx="15" ry="33" fill="${look.innerEar}" stroke="${look.furDark}" stroke-width="2"/></g>` +
      '<g transform="rotate(-12 162 98)">' +
      `<ellipse cx="162" cy="98" rx="15" ry="33" fill="${look.innerEar}" stroke="${look.furDark}" stroke-width="2"/></g>`
    );
  }
  if (id === 'rubble') {
    // 小砾：斗牛犬的小折耳
    return (
      `<ellipse cx="55" cy="55" rx="13" ry="9" fill="${look.furDark}" stroke="${look.furDark}" stroke-width="1.5" transform="rotate(-26 55 55)"/>` +
      `<ellipse cx="145" cy="55" rx="13" ry="9" fill="${look.furDark}" stroke="${look.furDark}" stroke-width="1.5" transform="rotate(26 145 55)"/>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：右耳折下来（左耳已在后面画过）
    return (
      `<ellipse cx="145" cy="66" rx="11" ry="18" fill="${look.furDark}" stroke="${look.furDark}" stroke-width="1.5" transform="rotate(42 145 66)"/>`
    );
  }
  if (id === 'zuma') {
    // 路马：贴着脑袋的宽垂耳
    return (
      '<g transform="rotate(-14 40 88)">' +
      `<ellipse cx="40" cy="88" rx="16" ry="27" fill="${look.innerEar}" stroke="${look.furDark}" stroke-width="2"/></g>` +
      '<g transform="rotate(14 160 88)">' +
      `<ellipse cx="160" cy="88" rx="16" ry="27" fill="${look.innerEar}" stroke="${look.furDark}" stroke-width="2"/></g>`
    );
  }
  return '';
}

// ———— 三种表情 ————
function face(mood, color) {
  if (mood === 'happy') {
    // 开心：眯眼大笑 + 张嘴露舌头 + 腮红
    return (
      '<path d="M68 92 Q79 80 90 92" fill="none" stroke="#2f2418" stroke-width="4.5" stroke-linecap="round"/>' +
      '<path d="M110 92 Q121 80 132 92" fill="none" stroke="#2f2418" stroke-width="4.5" stroke-linecap="round"/>' +
      '<ellipse cx="62" cy="112" rx="9" ry="5.5" fill="#ff9eb0" opacity="0.7"/>' +
      '<ellipse cx="138" cy="112" rx="9" ry="5.5" fill="#ff9eb0" opacity="0.7"/>' +
      '<path d="M84 120 Q100 146 116 120 Q100 132 84 120 Z" fill="#8c3a2e"/>' +
      '<ellipse cx="100" cy="130.5" rx="7.5" ry="4.8" fill="#ff7d8a"/>' +
      '<path d="M84 120 Q100 146 116 120" fill="none" stroke="#8c3a2e" stroke-width="2" stroke-linecap="round"/>'
    );
  }
  if (mood === 'thinking') {
    // 想问题：眼睛看向右边 + 嘴巴小小 + 头上问号气泡
    return (
      '<circle cx="79" cy="90" r="11" fill="#ffffff" stroke="rgba(0,0,0,0.10)"/>' +
      '<circle cx="84.5" cy="87" r="5.6" fill="#2f2418"/>' +
      '<circle cx="86.5" cy="84.8" r="1.9" fill="#ffffff"/>' +
      '<circle cx="121" cy="90" r="11" fill="#ffffff" stroke="rgba(0,0,0,0.10)"/>' +
      '<circle cx="126.5" cy="87" r="5.6" fill="#2f2418"/>' +
      '<circle cx="128.5" cy="84.8" r="1.9" fill="#ffffff"/>' +
      '<path d="M96 129 Q100 132.5 105 129" fill="none" stroke="#35281e" stroke-width="3" stroke-linecap="round"/>' +
      `<circle cx="154" cy="34" r="16" fill="#ffffff" opacity="0.95" stroke="${color}" stroke-width="2"/>` +
      `<path d="M149 28 a6.5 6.5 0 1 1 9 6 q-3 1.5 -3 5" fill="none" stroke="${color}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<circle cx="155" cy="45" r="2.6" fill="${color}"/>`
    );
  }
  // 平常：圆圆的大眼睛带高光 + 微笑
  return (
    '<circle cx="79" cy="90" r="11" fill="#ffffff" stroke="rgba(0,0,0,0.10)"/>' +
    '<circle cx="80.5" cy="92" r="5.6" fill="#2f2418"/>' +
    '<circle cx="82.6" cy="89.6" r="2" fill="#ffffff"/>' +
    '<circle cx="77.8" cy="94.4" r="1.2" fill="#ffffff" opacity="0.85"/>' +
    '<circle cx="121" cy="90" r="11" fill="#ffffff" stroke="rgba(0,0,0,0.10)"/>' +
    '<circle cx="119.5" cy="92" r="5.6" fill="#2f2418"/>' +
    '<circle cx="117.4" cy="89.6" r="2" fill="#ffffff"/>' +
    '<circle cx="122.2" cy="94.4" r="1.2" fill="#ffffff" opacity="0.85"/>' +
    '<path d="M91 128 Q100 136 109 128" fill="none" stroke="#35281e" stroke-width="3" stroke-linecap="round"/>'
  );
}

// ———— 帽子（用各自的主色） ————
function hat(id, look) {
  const c = PUPS.find((p) => p.id === id).color;
  if (id === 'chase') {
    // 阿奇：警帽 + 金色小星星帽徽
    return (
      `<path d="M56 52 Q58 20 100 20 Q142 20 144 52 Q100 42 56 52 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
      `<ellipse cx="100" cy="54" rx="47" ry="8.5" fill="${look.hatDark}"/>` +
      '<circle cx="100" cy="35" r="6.5" fill="#ffd84d"/>' +
      `<g transform="translate(100 35) scale(0.42)"><path d="${STAR_PATH}" fill="#8a6a00"/></g>`
    );
  }
  if (id === 'marshall') {
    // 毛毛：消防头盔 + 白色小盾牌里一个火苗
    return (
      `<path d="M52 54 Q54 14 100 14 Q146 14 148 54 Q100 44 52 54 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
      `<ellipse cx="100" cy="56" rx="50" ry="8.5" fill="${look.hatDark}"/>` +
      `<rect x="90" y="24" width="20" height="21" rx="6" fill="#ffffff" stroke="${look.hatDark}" stroke-width="1.5"/>` +
      `<g transform="translate(100 34) scale(0.75)">${BADGE_ART.flame(c)}</g>`
    );
  }
  if (id === 'skye') {
    // 天天：飞行帽 + 挡风眼镜
    return (
      `<path d="M58 50 Q60 20 100 20 Q140 20 142 50 Q100 42 58 50 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
      '<path d="M92 44 L108 44" stroke="#7a4b22" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="82" cy="44" r="10" fill="#cfe9ff" opacity="0.92" stroke="#7a4b22" stroke-width="3.5"/>' +
      '<circle cx="118" cy="44" r="10" fill="#cfe9ff" opacity="0.92" stroke="#7a4b22" stroke-width="3.5"/>' +
      '<circle cx="85" cy="41" r="3" fill="#ffffff" opacity="0.8"/>' +
      '<circle cx="121" cy="41" r="3" fill="#ffffff" opacity="0.8"/>'
    );
  }
  if (id === 'rubble') {
    // 小砾：工程安全帽，中间一条帽脊
    return (
      `<path d="M56 52 Q58 16 100 16 Q142 16 144 52 Q100 42 56 52 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
      `<rect x="93" y="14" width="14" height="30" rx="7" fill="${look.hatDark}"/>` +
      `<ellipse cx="100" cy="54" rx="48" ry="8" fill="${look.hatDark}"/>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：小圆帽，顶上一个扣子
    return (
      `<path d="M58 50 Q60 18 100 18 Q140 18 142 50 Q100 42 58 50 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
      `<ellipse cx="100" cy="52" rx="42" ry="7.5" fill="${look.hatDark}"/>` +
      `<circle cx="100" cy="17" r="5" fill="${look.hatDark}"/>`
    );
  }
  // 路马：救援头盔，头顶带一个小鳍
  return (
    `<path d="M56 52 Q58 16 100 16 Q142 16 144 52 Q100 42 56 52 Z" fill="${c}" stroke="${look.hatDark}" stroke-width="2"/>` +
    `<path d="M94 17 Q98 2 112 10 Q107 17 100 18 Z" fill="${look.hatDark}"/>` +
    `<ellipse cx="100" cy="54" rx="47" ry="8" fill="${look.hatDark}"/>`
  );
}

// ———— 项圈 + 徽章 ————
function collarBadge(id, look) {
  const c = PUPS.find((p) => p.id === id).color;
  const art = BADGE_ART[look.badgeSym ?? BADGE_OF[id]](look.sym);
  return (
    `<rect x="68" y="146" width="64" height="13" rx="6.5" fill="${c}"/>` +
    `<circle cx="100" cy="171" r="14" fill="#ffffff" stroke="${c}" stroke-width="3.5"/>` +
    `<g transform="translate(100 171)">${art}</g>`
  );
}

// 每只狗的徽章图案
const BADGE_OF = {
  chase: 'star',
  marshall: 'flame',
  skye: 'wings',
  rubble: 'wrench',
  rocky: 'recycle',
  zuma: 'drop',
};

// ———— 对外接口：pupSVG(id, { size, mood }) ————
export function pupSVG(id, { size = 120, mood = 'normal' } = {}) {
  const pup = PUPS.find((p) => p.id === id);
  if (!pup) {
    throw new Error(`pupSVG: 未知的小狗 id "${id}"`);
  }
  const look = LOOKS[id];
  const m = MOODS.includes(mood) ? mood : 'normal';
  const spots = id === 'marshall';
  const freckles = id === 'skye';
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${pup.name}">`,
    `<circle cx="100" cy="100" r="93" fill="${look.bg}"/>`,
    // 狗狗本体整体上移 12px（任务卡 012-5）：身体底部（原 y=192）现在离
    // 背景圆盘下缘还有一段空隙，项圈徽章（原圆心 y=171）完整露在圆盘里。
    // 背景圆盘留在原位当「相框」。
    '<g transform="translate(0 -12)">',
    body(look, spots),
    earsBack(look, id),
    head(look, spots),
    muzzleNose(look, freckles),
    face(m, pup.color),
    earsFront(look, id),
    hat(id, look),
    collarBadge(id, look),
    '</g>',
    '</svg>',
  ];
  return parts.join('');
}
