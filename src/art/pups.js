// 汪汪队空间大冒险 — 狗狗形象（SPEC 第 2 节、5.5；任务卡 016）
//
// 六只汪汪队角色的「粉丝画风」SVG：胸像构图 ——
//   大脑袋（占画面 60% 以上）+ 一点肩膀 + 主色制服背心，
//   领口挂圆形徽章（pup tag：主色圆底 + 白/金色图案），
//   头上戴各自职业的帽子（帽檐 + 帽身 + 帽前徽标，略微歪向一侧）。
// 统一画风：大圆眼（深色瞳孔 + 一大一小两个白色高光 + 上眼睑弧线）、
//   小黑鼻子带高光、「ω」形小微笑、所有色块 2–3px 深色描边（同色系加深，不用纯黑）、
//   下半部分叠一层半透明深色浅阴影体现立体感。
// 全部用 SVG 基本图形（circle / ellipse / path / rect），不嵌入、不引用、不描摹任何图片。

// ———— 角色元数据（验收按这张表核对，勿改） ————
export const PUPS = [
  { id: 'chase', name: '阿奇', color: '#1f5fbf', role: '警察' },
  { id: 'marshall', name: '毛毛', color: '#d62828', role: '消防员' },
  { id: 'skye', name: '天天', color: '#ff6fa8', role: '飞行员' },
  { id: 'rubble', name: '小砾', color: '#f6c20b', role: '工程' },
  { id: 'rocky', name: '灰灰', color: '#3a9d4a', role: '环保' },
  { id: 'zuma', name: '路马', color: '#ff8c1a', role: '水上救援' },
];

// ———— 每只狗的毛色与配色 ————
// fur: 头身毛色；furDark: 同色系加深（描边/暗部）；muzzle: 口鼻浅色；
// chest: 胸前浅色毛；innerEar: 耳朵内侧；brow: 眉毛处的浅色毛点；
// bg: 背景圆的浅色底；iris: 虹膜颜色；vest / vestDark: 制服背心主色与暗部。
const LOOKS = {
  // 阿奇：暖棕色德牧，头顶和耳缘是更深的「马鞍」棕，口鼻/胸口浅黄褐，竖尖耳
  chase: {
    fur: '#c1854a', furDark: '#8a5a28', muzzle: '#efd7a8', chest: '#efd7a8',
    innerEar: '#eec9a2', brow: '#f2ddb4', bg: '#e3edfb', iris: '#5a3d1e',
    vest: '#1f5fbf', vestDark: '#17448c',
  },
  // 毛毛：白底黑斑点的斑点狗，软软的垂耳（左耳大块黑斑），蓝色眼睛
  marshall: {
    fur: '#ffffff', furDark: '#bfaea9', muzzle: '#ffffff', chest: '#ffffff',
    innerEar: '#f6d7d7', brow: '#ffffff', bg: '#ffe3e0', iris: '#4a8fe0',
    vest: '#d62828', vestDark: '#a31d1d',
  },
  // 天天：浅金奶油色可卡颇犬，长垂耳带卷卷浅色耳尖，粉紫色眼睛
  skye: {
    fur: '#f2cd8f', furDark: '#d8a95f', muzzle: '#f9e8c8', chest: '#f9e8c8',
    innerEar: '#f6ddb2', brow: '#f9e8c8', bg: '#ffe4ef', iris: '#c069d8',
    vest: '#ff6fa8', vestDark: '#d94f88',
  },
  // 小砾：浅棕米色英国斗牛犬，白口鼻白胸口，腮帮下垂、额头有褶皱
  rubble: {
    fur: '#e2b686', furDark: '#b98a55', muzzle: '#f7f3ea', chest: '#f7f3ea',
    innerEar: '#f3d9b6', brow: '#f3ddba', bg: '#fdf3d8', iris: '#5a3d1e',
    vest: '#f6c20b', vestDark: '#c99a06',
  },
  // 灰灰：灰色混种狗，白口鼻白胸口，帽子下翘出乱毛，一耳立一耳折
  rocky: {
    fur: '#bcc3c9', furDark: '#8f98a1', muzzle: '#eef1f3', chest: '#eef1f3',
    innerEar: '#dde3e7', brow: '#eef1f3', bg: '#e2f2e4', iris: '#5a3d1e',
    vest: '#3a9d4a', vestDark: '#2c7a38',
  },
  // 路马：巧克力色拉布拉多，口鼻稍浅、眉毛两点浅色，中等垂耳
  zuma: {
    fur: '#8a5a2e', furDark: '#6b421e', muzzle: '#c99a63', chest: '#d9b075',
    innerEar: '#6f451f', brow: '#d9b98a', bg: '#ffeeda', iris: '#4a3218',
    vest: '#ff8c1a', vestDark: '#d9710a',
  },
};

const MOODS = ['normal', 'happy', 'thinking'];

// 嘴巴/眼睛线条的深棕色（不用纯黑）
const INK = '#4a3220';
// 斑点狗的黑斑
const SPOT = '#2b2b2b';
const SPOT_DARK = '#161616';

// ———— 徽章（pup tag）图案：以徽章圆心为原点，尺寸约 ±9 ————

// 五角星路径（警察徽章里的星）
const STAR_PATH =
  'M0 -9 L2.35 -3.24 L8.56 -2.78 L3.8 1.24 L5.29 7.28 L0 4 ' +
  'L-5.29 7.28 L-3.8 1.24 L-8.56 -2.78 L-2.35 -3.24 Z';

// 盾牌路径（阿奇：警徽 = 盾牌里一颗星）
const SHIELD_PATH = 'M0 -8.5 L7 -5.8 L7 2 Q0 8.6 -7 2 L-7 -5.8 Z';

// 回收循环箭头的一段弧 + 箭头尖，复制旋转 3 次拼成循环三角（灰灰）
const RECYCLE_SEG =
  '<path d="M2.33 -8.69 A9 9 0 0 1 8.69 2.33" fill="none" stroke="COL" ' +
  'stroke-width="3.2" stroke-linecap="round"/>' +
  '<path d="M7.8 5.7 L11.1 3 L6.3 1.7 Z" fill="COL"/>';

const BADGE_ART = {
  // 阿奇：金色盾牌 + 蓝色小星（警察徽章）
  shieldStar: (accent) =>
    `<path d="${SHIELD_PATH}" fill="#ffd84d" stroke="#c99a06" stroke-width="1.8"/>` +
    `<g transform="scale(0.5)"><path d="${STAR_PATH}" fill="${accent}"/></g>`,

  // 毛毛：黄橙色火苗（消防员）
  flame: (accent) =>
    '<path d="M0 -9 C5 -5 7.5 -1.5 7.5 2 C7.5 6.4 4.2 9 0 9 ' +
    'C-4.2 9 -7.5 6.4 -7.5 2 C-7.5 -1.5 -5 -5 0 -9 Z" fill="#ffd84d"/>' +
    '<path d="M0 -2.5 C2.2 0 2.8 1.3 2.8 2.8 A2.8 2.8 0 1 1 -2.8 2.8 ' +
    'C-2.8 1.3 -2.2 0 0 -2.5 Z" fill="#ff8c1a"/>',

  // 天天：白色三叶螺旋桨（飞行员）
  propeller: (accent) =>
    ['0', '120', '240']
      .map(
        (r) =>
          `<g transform="rotate(${r})"><path d="M0 -2.2 Q3.6 -7 2 -10.2 Q-1.6 -11 -2.1 -6 Q-2.1 -3.2 0 -2.2 Z" fill="#ffffff"/></g>`
      )
      .join('') +
    '<circle cx="0" cy="0" r="2.6" fill="#ffffff"/>' +
    `<circle cx="0" cy="0" r="1.2" fill="${accent}"/>`,

  // 小砾：白色扳手 + 螺母（工程）
  wrenchNut: (accent) =>
    '<path d="M2.4 -2.4 L-6.4 8.6" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" fill="none"/>' +
    '<path d="M2 -11.4 A6.6 6.6 0 1 0 11 -2.2" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" fill="none"/>' +
    '<path d="M6 2.6 L8.9 4.3 L8.9 7.7 L6 9.4 L3.1 7.7 L3.1 4.3 Z" fill="#ffffff"/>' +
    `<circle cx="6" cy="6" r="1.5" fill="${accent}"/>`,

  // 灰灰：白色回收三箭头（环保）
  recycle: (accent) =>
    ['0', '120', '240']
      .map((r) => `<g transform="rotate(${r})">${RECYCLE_SEG.replaceAll('COL', '#ffffff')}</g>`)
      .join(''),

  // 路马：白色船锚（水上救援）
  anchor: (accent) =>
    '<circle cx="0" cy="-6.4" r="2.6" fill="none" stroke="#ffffff" stroke-width="2.2"/>' +
    '<path d="M0 -3.8 L0 8.4" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M-4.2 -1 L4.2 -1" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M-6.4 2.6 Q-6.4 9 0 9 Q6.4 9 6.4 2.6" fill="none" stroke="#ffffff" ' +
    'stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M-6.4 2.6 L-8.8 1" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M6.4 2.6 L8.8 1" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>',
};

// 每只狗的徽章图案
const BADGE_OF = {
  chase: 'shieldStar',
  marshall: 'flame',
  skye: 'propeller',
  rubble: 'wrenchNut',
  rocky: 'recycle',
  zuma: 'anchor',
};

// 每只狗帽子的歪的方向和角度（更生动）
const HAT_TILT = { chase: -6, marshall: 5, skye: -5, rubble: 4, rocky: -6, zuma: 5 };

// ———— 背景：浅色圆盘当「相框」 ————
function backdrop(look) {
  return `<circle cx="100" cy="100" r="95" fill="${look.bg}"/>`;
}

// ———— 身体：小肩膀 + 主色制服背心 + 浅色胸毛 ————
function torso(look, id) {
  const strap =
    id === 'zuma'
      ? // 路马：救生衣，胸前两道深色带子
        `<rect x="72" y="150" width="9" height="44" rx="4.5" fill="${look.vestDark}"/>` +
        `<rect x="119" y="150" width="9" height="44" rx="4.5" fill="${look.vestDark}"/>`
      : '';
  return (
    // 肩膀和脖子（毛色）
    `<path d="M54 196 Q52 152 80 142 Q100 136 120 142 Q148 152 146 196 Z" ` +
    `fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/>` +
    // 制服背心（主色）
    `<path d="M60 196 Q58 158 84 148 Q100 142.5 116 148 Q142 158 140 196 Z" ` +
    `fill="${look.vest}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
    // 背心下摆的浅阴影
    `<path d="M61 186 Q100 197 139 186 L140 196 L60 196 Z" fill="rgba(0,0,0,0.10)"/>` +
    // 领口露出的浅色胸毛
    `<ellipse cx="100" cy="161" rx="16" ry="12.5" fill="${look.chest}"/>` +
    strap
  );
}

// ———— 领口的圆形徽章（pup tag）：主色圆底 + 白/金色图案 ————
function pupTag(id, look) {
  const art = BADGE_OF[id];
  return (
    `<circle cx="100" cy="172" r="15.5" fill="${look.vest}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
    '<circle cx="100" cy="172" r="12.2" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.9"/>' +
    `<g transform="translate(100 172) scale(0.86)">${BADGE_ART[art](look.vest)}</g>`
  );
}

// ———— 脑袋 + 每只狗独有的头部花纹 ————
function head(look, id) {
  let marks = '';
  // 阿奇：头顶「马鞍」深棕色块 + 眉毛处两小点浅色毛
  if (id === 'chase') {
    marks +=
      `<path d="M45.3 96 A55 55 0 0 1 154.7 96 Q100 74 45.3 96 Z" fill="${look.furDark}"/>` +
      `<ellipse cx="75.5" cy="70.5" rx="7.5" ry="4.2" fill="${look.brow}"/>` +
      `<ellipse cx="124.5" cy="70.5" rx="7.5" ry="4.2" fill="${look.brow}"/>`;
  }
  // 毛毛：白底 + 大小不一的黑斑（头顶、脸颊）
  if (id === 'marshall') {
    marks +=
      `<ellipse cx="68" cy="56" rx="9" ry="7" fill="${SPOT}" transform="rotate(-15 68 56)"/>` +
      `<ellipse cx="139" cy="68" rx="6.5" ry="5.5" fill="${SPOT}"/>` +
      `<ellipse cx="57" cy="100" rx="4.5" ry="4" fill="${SPOT}"/>` +
      `<ellipse cx="146" cy="102" rx="4" ry="3.6" fill="${SPOT}"/>`;
  }
  // 小砾：额头一两道褶皱（胖胖的）
  if (id === 'rubble') {
    marks +=
      `<path d="M76 56 Q100 66 124 56" fill="none" stroke="${look.furDark}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M81 64 Q100 72 119 64" fill="none" stroke="${look.furDark}" stroke-width="2" stroke-linecap="round"/>`;
  }
  // 路马：眉毛处两点浅色
  if (id === 'zuma') {
    marks +=
      `<ellipse cx="75.5" cy="70.5" rx="7" ry="4" fill="${look.brow}"/>` +
      `<ellipse cx="124.5" cy="70.5" rx="7" ry="4" fill="${look.brow}"/>`;
  }
  // 下半部分的浅阴影（立体感）
  const shade =
    '<path d="M46.3 104 A55 55 0 0 0 153.7 104 Q100 136 46.3 104 Z" fill="rgba(0,0,0,0.07)"/>';
  return (
    `<circle cx="100" cy="92" r="55" fill="${look.fur}" stroke="${look.furDark}" stroke-width="3"/>` +
    marks +
    shade
  );
}

// ———— 口鼻 + 小黑鼻子（带高光） ————
function muzzle(look, id) {
  const jowls =
    id === 'rubble'
      ? // 小砾：两侧鼓起的下垂腮帮
        `<ellipse cx="71" cy="122" rx="13" ry="10" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/>` +
        `<ellipse cx="129" cy="122" rx="13" ry="10" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/>`
      : '';
  return (
    `<ellipse cx="100" cy="116" rx="26" ry="18.5" fill="${look.muzzle}" stroke="${look.furDark}" stroke-width="2"/>` +
    jowls +
    // 小黑鼻子 + 高光
    '<path d="M92.5 106.5 Q100 102.5 107.5 106.5 Q108.5 112.5 100 116.5 Q91.5 112.5 92.5 106.5 Z" ' +
    'fill="#3a2a1c"/>' +
    '<ellipse cx="96.3" cy="107.8" rx="1.9" ry="1.3" fill="#ffffff" opacity="0.75"/>'
  );
}

// ———— 三种表情的眼睛 ————
function eyes(mood, look) {
  if (mood === 'happy') {
    // 开心：眯成弯弯的缝 + 腮红
    return (
      '<path d="M63.5 90 Q75.5 77 87.5 90" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M112.5 90 Q124.5 77 136.5 90" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="59" cy="106" rx="8" ry="5" fill="#ff9eb0" opacity="0.65"/>' +
      '<ellipse cx="141" cy="106" rx="8" ry="5" fill="#ff9eb0" opacity="0.65"/>'
    );
  }
  const dx = mood === 'thinking' ? 3 : 1.5; // 想问题时眼睛看向一边
  const dy = mood === 'thinking' ? -1.5 : 2;
  const eye = (cx, dir) => {
    const ix = cx + dir * dx;
    const iy = 88 + dy;
    return (
      `<circle cx="${cx}" cy="88" r="12" fill="#ffffff" stroke="rgba(0,0,0,0.08)" stroke-width="1"/>` +
      `<circle cx="${ix}" cy="${iy}" r="6.8" fill="${look.iris}"/>` +
      `<circle cx="${ix}" cy="${iy + 0.5}" r="3.6" fill="#241a10"/>` +
      // 两个白色高光：一大一小
      `<circle cx="${ix - 2.5}" cy="${iy - 3.5}" r="2.3" fill="#ffffff"/>` +
      `<circle cx="${ix + 2.5}" cy="${iy + 3}" r="1.2" fill="#ffffff" opacity="0.9"/>` +
      // 上眼睑弧线
      `<path d="M${cx - 12} 83 Q${cx} 72.5 ${cx + 12} 83" fill="none" stroke="${look.furDark}" stroke-width="3" stroke-linecap="round"/>`
    );
  };
  const base = eye(75.5, 1) + eye(124.5, -1);
  if (mood !== 'thinking') return base;
  // 想问题：旁边飘一个问号泡泡
  const c = '#7a5aa0';
  return (
    base +
    '<circle cx="162" cy="30" r="13" fill="#ffffff" opacity="0.95" stroke="' + c + '" stroke-width="2"/>' +
    '<path d="M157.5 26.5 a5.5 5.5 0 1 1 7.5 5 q-2.5 1.2 -2.5 4" fill="none" stroke="' + c + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="162.5" cy="40.5" r="2.3" fill="' + c + '"/>'
  );
}

// ———— 嘴巴：小小的「ω」形微笑 ————
function mouth(mood, id, look) {
  const wide = id === 'rubble'; // 小砾嘴巴更宽
  const x0 = wide ? 86 : 91;
  const x2 = wide ? 114 : 109;
  if (mood === 'happy') {
    // 开心：张开的小嘴 + 吐出的舌头
    const tongue = id === 'marshall' ? 8 : 6.5;
    return (
      '<path d="M87 120 Q100 142 113 120 Q100 129 87 120 Z" fill="#7c3a2c" ' +
      'stroke="#5d2b20" stroke-width="2" stroke-linejoin="round"/>' +
      `<ellipse cx="100" cy="131.5" rx="${tongue}" ry="4.4" fill="#ff8fa0" stroke="#e0788d" stroke-width="1.5"/>`
    );
  }
  const smile =
    `<path d="M${x0} 124 Q${(x0 + 100) / 2} 130.5 100 124 Q${(x2 + 100) / 2} 130.5 ${x2} 124" ` +
    `fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  if (mood === 'thinking') {
    // 想问题：嘴巴抿成小小一条
    return '<path d="M96 126 Q100 129 104 126" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
  }
  // 毛毛平常也调皮地吐一点点舌头
  const tongue =
    id === 'marshall'
      ? '<path d="M96.5 126.5 Q100 136 103.5 126.5 Q100 129.5 96.5 126.5 Z" fill="#ff8fa0" stroke="#e0788d" stroke-width="1.4"/>'
      : '';
  // 小砾笑起来露出一颗小牙
  const tooth =
    id === 'rubble'
      ? `<rect x="95.5" y="125.5" width="9" height="6.5" rx="2.2" fill="#ffffff" stroke="${look.furDark}" stroke-width="1.4"/>`
      : '';
  return smile + tongue + tooth;
}

// ———— 耳朵（画在脑袋后面：竖起的尖耳） ————
function earsBack(look, id) {
  if (id === 'chase') {
    // 阿奇：又大又尖、竖立的耳朵（外缘深棕、内侧浅粉棕）
    return (
      `<path d="M64 56 Q46 26 30 16 Q30 40 52 58 Z" fill="${look.fur}" stroke="${look.furDark}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M59 51 Q49 33 40 25 Q42 40 55 51 Z" fill="${look.innerEar}"/>` +
      `<path d="M136 56 Q154 26 170 16 Q170 40 148 58 Z" fill="${look.fur}" stroke="${look.furDark}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M141 51 Q151 33 160 25 Q158 40 145 51 Z" fill="${look.innerEar}"/>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：左耳竖起（右耳折下来，画在前面那层）—— 不对称很有个性
    return (
      `<path d="M62 58 Q48 32 36 24 Q38 44 58 58 Z" fill="${look.fur}" stroke="${look.furDark}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M58 53 Q50 38 44 32 Q46 44 56 52 Z" fill="${look.innerEar}"/>`
    );
  }
  return '';
}

// ———— 耳朵（画在脑袋前面：垂耳、折耳） ————
function earsFront(look, id) {
  if (id === 'marshall') {
    // 毛毛：软软下垂的耳朵，左耳几乎全黑，右耳白色带耳尖黑斑
    return (
      '<g transform="rotate(16 46 88)">' +
      `<ellipse cx="46" cy="88" rx="14" ry="26" fill="${SPOT}" stroke="${SPOT_DARK}" stroke-width="2.5"/></g>` +
      '<g transform="rotate(-16 154 88)">' +
      `<ellipse cx="154" cy="88" rx="14" ry="26" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/>` +
      `<ellipse cx="156" cy="104" rx="6" ry="7" fill="${SPOT}"/></g>`
    );
  }
  if (id === 'skye') {
    // 天天：长长下垂的耳朵，末端是卷卷的浅色毛（波浪边）
    const ear = (m, cx, tipX) =>
      `<g transform="rotate(${m} ${cx} 88)">` +
      `<path d="M${cx - 4} 52 Q${cx - 26} 60 ${cx - 28} 94 Q${cx - 29} 116 ${cx - 14} 124 ` +
      `Q${cx - 19} 114 ${cx - 10} 110 Q${cx - 18} 103 ${cx - 8} 99 Q${cx - 14} 91 ${cx - 4} 88 ` +
      `Q${cx - 12} 68 ${cx - 4} 52 Z" fill="${look.innerEar}" stroke="${look.furDark}" stroke-width="2.5" stroke-linejoin="round"/>` +
      // 耳尖的两团小卷毛
      `<circle cx="${cx - 17}" cy="114" r="4.6" fill="${look.muzzle}" stroke="${look.furDark}" stroke-width="1.6"/>` +
      `<circle cx="${cx - 8}" cy="119" r="4" fill="${look.muzzle}" stroke="${look.furDark}" stroke-width="1.6"/></g>`;
    return ear(10, 60, 32) + ear(-10, 140, 168);
  }
  if (id === 'rubble') {
    // 小砾：小小的耳朵贴在头两侧往外翻
    return (
      `<ellipse cx="47" cy="66" rx="12" ry="8" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5" transform="rotate(-36 47 66)"/>` +
      `<ellipse cx="153" cy="66" rx="12" ry="8" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5" transform="rotate(36 153 66)"/>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：右耳折下来
    return (
      `<ellipse cx="150" cy="86" rx="12" ry="20" fill="${look.furDark}" stroke="${look.furDark}" stroke-width="2" transform="rotate(-24 150 86)"/>`
    );
  }
  if (id === 'zuma') {
    // 路马：中等长度、下垂的耳朵
    return (
      '<g transform="rotate(16 48 88)">' +
      `<ellipse cx="48" cy="88" rx="13" ry="23" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/></g>` +
      '<g transform="rotate(-16 152 88)">' +
      `<ellipse cx="152" cy="88" rx="13" ry="23" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2.5"/></g>`
    );
  }
  return '';
}

// ———— 帽子：帽檐 + 帽身 + 帽前徽标，略微歪向一侧 ————
function hat(id, look) {
  const c = PUPS.find((p) => p.id === id).color;
  let art = '';
  if (id === 'chase') {
    // 阿奇：蓝色警帽（大檐帽）+ 金色警徽
    art =
      // 帽身（帽顶圆顶）
      `<path d="M52 42 Q56 10 100 10 Q144 10 148 42 Q100 32 52 42 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      // 帽檐（深蓝，向前伸出）
      '<path d="M56 44 Q100 58 144 44 Q118 63 100 63 Q82 63 56 44 Z" fill="' + look.vestDark + '" stroke="#12366f" stroke-width="2"/>' +
      // 帽箍
      `<path d="M52 40 Q100 50 148 40 L148 48 Q100 58 52 48 Z" fill="${look.vestDark}" stroke="#12366f" stroke-width="1.5"/>` +
      // 帽前徽标：金色警徽（盾牌里一颗星）
      `<g transform="translate(100 28) scale(0.92)">${BADGE_ART.shieldStar(c)}</g>`;
  } else if (id === 'marshall') {
    // 毛毛：红色消防头盔（前高后低 + 一圈帽檐）+ 黄色盾形徽标
    art =
      `<ellipse cx="100" cy="46" rx="53" ry="9" fill="${look.vestDark}" stroke="#8a1616" stroke-width="2"/>` +
      `<path d="M56 44 Q54 14 84 10 Q100 8 116 10 Q146 14 144 44 Q100 36 56 44 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      `<path d="M96 9 Q100 6 104 9 L104 34 Q100 36 96 34 Z" fill="${look.vestDark}"/>` +
      `<g transform="translate(100 26) scale(0.85)"><path d="${SHIELD_PATH}" fill="#ffd84d" stroke="#c99a06" stroke-width="2"/>` +
      `<g transform="translate(0 1) scale(0.5)">${BADGE_ART.flame(c)}</g></g>`;
  } else if (id === 'skye') {
    // 天天：粉色飞行员头盔 + 头盔上方架一副护目镜
    art =
      `<path d="M56 46 Q58 12 100 12 Q142 12 144 46 Q100 38 56 46 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      `<path d="M100 13 Q100 26 100 39" fill="none" stroke="${look.vestDark}" stroke-width="2"/>` +
      // 护目镜：桥 + 两个圆镜片（粉色镜框、浅蓝镜面带高光）
      '<path d="M91 22 L109 22" stroke="' + look.vestDark + '" stroke-width="4"/>' +
      '<circle cx="80" cy="22" r="11.5" fill="#cfe9ff" opacity="0.95" stroke="' + look.vestDark + '" stroke-width="4"/>' +
      '<circle cx="120" cy="22" r="11.5" fill="#cfe9ff" opacity="0.95" stroke="' + look.vestDark + '" stroke-width="4"/>' +
      '<circle cx="76.5" cy="18.5" r="3" fill="#ffffff" opacity="0.85"/>' +
      '<circle cx="116.5" cy="18.5" r="3" fill="#ffffff" opacity="0.85"/>';
  } else if (id === 'rubble') {
    // 小砾：黄色安全帽（帽顶一道凸起的棱 + 一圈帽檐）
    art =
      `<path d="M58 44 Q58 10 100 10 Q142 10 142 44 Q100 36 58 44 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      `<ellipse cx="100" cy="46" rx="54" ry="9" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      `<rect x="92" y="8" width="16" height="32" rx="8" fill="${c}" stroke="${look.vestDark}" stroke-width="2"/>` +
      // 帽前徽标：白色小爪印
      '<circle cx="100" cy="28" r="3.6" fill="#ffffff"/>' +
      '<circle cx="95.2" cy="23.6" r="1.7" fill="#ffffff"/>' +
      '<circle cx="100" cy="22.4" r="1.7" fill="#ffffff"/>' +
      '<circle cx="104.8" cy="23.6" r="1.7" fill="#ffffff"/>';
  } else if (id === 'rocky') {
    // 灰灰：绿色鸭舌帽（棒球帽，帽檐朝前）
    art =
      `<path d="M54 44 Q56 12 100 12 Q144 12 146 44 Q100 36 54 44 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      '<circle cx="100" cy="13" r="4" fill="' + look.vestDark + '"/>' +
      // 帽檐（朝前弯下来）
      '<path d="M56 44 Q100 58 144 44 Q146 54 136 57 Q100 66 64 57 Q54 54 56 44 Z" fill="' + look.vestDark + '" stroke="#1f5f2b" stroke-width="2"/>' +
      // 帽前徽标：白色小爪印
      '<circle cx="100" cy="28" r="3.6" fill="#ffffff"/>' +
      '<circle cx="95.2" cy="23.6" r="1.7" fill="#ffffff"/>' +
      '<circle cx="100" cy="22.4" r="1.7" fill="#ffffff"/>' +
      '<circle cx="104.8" cy="23.6" r="1.7" fill="#ffffff"/>';
  } else {
    // 路马：橙色圆顶头盔 + 侧面深色条纹 + 额前小护目镜
    art =
      `<path d="M56 46 Q58 10 100 10 Q142 10 144 46 Q100 38 56 46 Z" fill="${c}" stroke="${look.vestDark}" stroke-width="2.5"/>` +
      '<path d="M124 16 Q140 28 143 44" fill="none" stroke="' + look.vestDark + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M91 24 L109 24" stroke="' + look.vestDark + '" stroke-width="3.5"/>' +
      '<circle cx="83" cy="24" r="8" fill="#cfe9ff" opacity="0.95" stroke="' + look.vestDark + '" stroke-width="3.5"/>' +
      '<circle cx="117" cy="24" r="8" fill="#cfe9ff" opacity="0.95" stroke="' + look.vestDark + '" stroke-width="3.5"/>' +
      '<circle cx="80.5" cy="21.5" r="2" fill="#ffffff" opacity="0.85"/>' +
      '<circle cx="114.5" cy="21.5" r="2" fill="#ffffff" opacity="0.85"/>';
  }
  const tilt = HAT_TILT[id];
  return `<g transform="rotate(${tilt} 100 44)">${art}</g>`;
}

// ———— 帽子下面的毛 ————
function tuft(id, look) {
  if (id === 'skye') {
    // 天天：头顶一撮翘起的刘海（从头盔前面翘出来）
    return (
      `<g transform="rotate(-5 100 40)">` +
      `<path d="M96 14 Q89 6 95 1 Q100 6 99 13 Z" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2" stroke-linejoin="round"/>` +
      `<path d="M100 13 Q100 2 107 1 Q108 8 102 14 Z" fill="${look.fur}" stroke="${look.furDark}" stroke-width="2" stroke-linejoin="round"/>` +
      `</g>`
    );
  }
  if (id === 'rocky') {
    // 灰灰：一撮乱糟糟的毛从帽檐下面翘出来
    return (
      '<path d="M84 52 L90 66 L96 53 L102 68 L108 53 L114 66 L118 51 Z" ' +
      `fill="${look.fur}" stroke="${look.furDark}" stroke-width="2" stroke-linejoin="round"/>`
    );
  }
  return '';
}

// ———— 对外接口：pupSVG(id, { size, mood }) ————
export function pupSVG(id, { size = 120, mood = 'normal' } = {}) {
  const pup = PUPS.find((p) => p.id === id);
  if (!pup) {
    throw new Error(`pupSVG: 未知的小狗 id "${id}"`);
  }
  const look = LOOKS[id];
  const m = MOODS.includes(mood) ? mood : 'normal';
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${pup.name}">`,
    backdrop(look),
    torso(look, id),
    earsBack(look, id),
    head(look, id),
    muzzle(look, id),
    eyes(m, look),
    mouth(m, id, look),
    earsFront(look, id),
    hat(id, look),
    tuft(id, look),
    pupTag(id, look),
    '</svg>',
  ];
  return parts.join('');
}
