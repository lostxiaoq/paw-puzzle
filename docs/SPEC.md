# 汪汪队空间大冒险 — 需求规格

给一年级小朋友（6–7 岁）玩的空间思维益智游戏。孩子喜欢汪汪队。仅在家里自用，不公开发布。

## 1. 设计原则

- **不依赖阅读**：每个画面进入时用语音（`speechSynthesis`，`zh-CN`）读出指令；右上角固定一个 🔊 按钮可以重听。界面文字只做辅助，句子短。
- **只鼓励不惩罚**：做错了不扣分、不出现红叉大字，只是轻轻抖动 + 柔和提示音，然后让孩子再试。连续错 2 次后 💡 提示按钮开始闪烁。
- **大按钮**：所有可点元素最小 64×64 CSS 像素；首要适配横屏平板（1024×768），也要在电脑浏览器（1280×800）上好看；手机竖屏能用即可。
- **离线运行**：纯静态网页，零依赖，不用 CDN、不用构建工具，原生 ES modules。全部图形用代码画（SVG/CSS），全部声音用 WebAudio 合成，没有图片和音频文件。
- **护眼**：连续游玩 20 分钟弹出「休息一下眼睛吧」（任务 011 实现）。

## 2. 角色

狗狗形象是**汪汪队角色的粉丝画风 SVG**：抓住每只狗的品种、毛色、帽子、制服和项圈徽章等标志性特征，让孩子一眼认出是谁；用代码重新绘制，不使用、不描摹任何官方图片或素材（详见任务卡 016）。

| id | 名字 | 主色 | 职业 | 徽章图案 |
|---|---|---|---|---|
| chase | 阿奇 | #1f5fbf | 警察 | 警徽 |
| marshall | 毛毛 | #d62828 | 消防员 | 火苗（身上有斑点） |
| skye | 天天 | #ff6fa8 | 飞行员 | 螺旋桨 |
| rubble | 小砾 | #f6c20b | 工程 | 扳手和螺母 |
| rocky | 灰灰 | #3a9d4a | 环保 | 回收三角 |
| zuma | 路马 | #ff8c1a | 水上救援 | 船锚 |

## 3. 四个小游戏

| gameId | 名称 | 主持狗狗 | 练的能力 |
|---|---|---|---|
| route | 阿奇巡逻 | chase | 方位、路线规划、顺序（编程启蒙） |
| mirror | 天天的魔镜 | skye | 对称 |
| rotate | 灰灰修零件 | rocky | 心理旋转 |
| cubes | 小砾搭积木 | rubble | 立体想象、三视图 |

### 3.1 阿奇巡逻（route）
网格地图上有阿奇、终点（走丢的小猫 🐱）、障碍（树/石头）、可选的骨头 🦴。孩子把方向卡（↑↓←→）依次放进「指令槽」，按「出发」后阿奇一步一步走。撞墙/出界就停下并轻轻抖动；走完没到终点就提示「还差一点点」。要求先吃掉所有骨头再到终点。

### 3.2 天天的魔镜（mirror）
网格中间有一条魔镜线（竖线或横线）。一侧已经涂好颜色，孩子在另一侧点格子涂色，使两边对称。底部有色板（关卡用到几种颜色就显示几种），点一下格子涂上当前颜色，再点一下擦掉。按「检查」判定。

### 3.3 灰灰修零件（rotate）
两种玩法：
- **转一转**：上面是零件的「影子」轮廓，下面是零件本身。孩子点 ⟳ 按钮让零件顺时针转 90°，转到和影子一模一样时自动成功。
- **找一找**：给一个零件，下面 3 个选项，只有一个是它转过去的样子，其余是镜像（翻面）或别的形状。

### 3.4 小砾搭积木（cubes）
用等轴测视角画一堆积木（高度图，最大 4×4、最高 4 层，不会悬空）。两种玩法：
- **数一数**：一共几块积木？三个数字按钮选一个。（要想到被挡住的积木）
- **从前面看**：从前面看是什么样子？三个选项选一个。

## 4. 技术约束

```
index.html
styles/main.css
src/main.js                 入口：根据路由渲染页面
src/core/router.js          路由（纯函数 parseRoute + 监听 hashchange）
src/core/storage.js         进度存储
src/core/scoring.js         星级规则
src/core/speech.js          语音
src/core/sfx.js             音效（WebAudio 合成）
src/art/pups.js             狗狗 SVG
src/games/registry.js       游戏注册表
src/games/<gameId>/logic.js  纯逻辑（不碰 DOM，Node 里能直接 import）
src/games/<gameId>/levels.js 关卡数据
src/games/<gameId>/view.js   界面
tests/unit/                 你自己写的单元测试（node:test）
tests/accept/               验收测试 —— 由调度器维护，禁止修改
```

- `package.json` 已有 `"type": "module"`，不要加任何依赖。
- 逻辑模块必须是纯函数，不能在 import 时访问 `window` / `document` / `localStorage`。
- 每个 view 模块导出 `mount(container, ctx)`，返回 `unmount()` 函数。游戏页的外框（顶栏的返回 / 关卡号 / 🔊 / 💡、`play-area` 容器、过关弹层）由 `src/main.js` 统一负责，view 只在 `container`（即 `play-area`）里画游戏内容。`ctx` 提供：
  - `gameId`、`levelIndex`、`level`（该关的关卡数据对象）
  - `setInstruction(text)`：设置本关指令并立即朗读；🔊 按钮重读最近一次指令
  - `say(text)`：只朗读，不改变指令
  - `sfx(name)`：播放音效，`name ∈ 'tap' | 'success' | 'oops' | 'star' | 'step'`
  - `fail()`：记一次失败（外框负责计数，失败 ≥2 次后 💡 按钮闪烁）
  - `complete()`：本关成功。外框按 `starsFor(失败次数 + 1)` 算星、写进度、显示过关弹层（开心的主持狗狗 + 星星 + 下一关按钮）
  - `onHint(fn)`：注册提示回调，点 💡 时调用
- 本地预览：`python3 -m http.server 8765` 后打开 `http://localhost:8765`。

## 5. 接口契约（验收测试按这里写，名字和语义必须完全一致）

### 5.1 src/core/router.js
- `parseRoute(hash)` → 对象：
  - `''`、`'#'`、`'#/'` → `{ name: 'home' }`
  - `'#/game/route'` → `{ name: 'levels', gameId: 'route' }`
  - `'#/game/route/3'` → `{ name: 'play', gameId: 'route', level: 3 }`（level 为数字，从 0 开始）
  - `'#/badges'` → `{ name: 'badges' }`
  - 其他任何输入 → `{ name: 'home' }`
- `toHash(route)`：`parseRoute` 的逆运算，`toHash({name:'play',gameId:'route',level:3}) === '#/game/route/3'`，home 返回 `'#/'`。

### 5.2 src/core/scoring.js
- `starsFor(attempts)`：第 1 次就成功 → 3 星；第 2 次 → 2 星；3 次及以上 → 1 星。attempts < 1 时按 1 处理。

### 5.3 src/core/storage.js
- `createStore(backend)`：`backend` 是类似 localStorage 的对象（`getItem/setItem`）。省略时尝试用 `globalThis.localStorage`；backend 不存在或任何调用抛异常时，退回内存存储，**永不抛错**。数据存在单个 key `'paw-puzzle:v1'` 下，JSON 格式。
- 返回对象的方法：
  - `getProgress(gameId)` → `{ unlocked: number, stars: { [levelIndex]: 1|2|3 } }`。从没玩过时为 `{ unlocked: 1, stars: {} }`（只解锁第 1 关）。
  - `completeLevel(gameId, levelIndex, stars)`：记录星数（只保留最高值），并把 `unlocked` 提升到至少 `levelIndex + 2`。
  - `totalStars()` → 所有游戏星数之和。
  - `reset()` 清空全部进度。

### 5.4 src/games/registry.js
- `export const GAMES`：长度为 4 的数组，顺序为 route、mirror、rotate、cubes，每项 `{ id, title, pup, levelCount, load }`。`title` 为中文名（见第 3 节），`pup` 为狗狗 id，`levelCount` 为关卡数，`load()` 返回 `Promise`，resolve 为该游戏的 view 模块（用动态 `import()`）。view 还没写好时 `load` 可以返回一个占位 view。

### 5.5 src/art/pups.js
- `export const PUPS`：6 个元素的数组 `{ id, name, color, role }`，取值见第 2 节表格。
- `pupSVG(id, { size = 120, mood = 'normal' } = {})` → SVG 字符串，以 `<svg` 开头，带 `viewBox`，宽高等于 `size`。`mood` 取 `'normal' | 'happy' | 'thinking'`，三种表情要有可见区别。未知 id 抛 `Error`。

### 5.6 src/games/route/logic.js
坐标：`x` 是列（向右增大），`y` 是行（向下增大），左上角 `(0,0)`。
- 关卡对象：`{ id, cols, rows, start: {x,y}, goal: {x,y}, walls: [{x,y}], bones: [{x,y}], maxCards }`
- 指令：`'up' | 'down' | 'left' | 'right'`，每条移动一格。
- `runProgram(level, program)` → `{ status, path, failedAt, collected }`
  - `path`：经过的格子数组，第一个是起点，每走成功一步追加一格。
  - 遇到出界：停止，`status: 'outOfBounds'`，`failedAt` = 出错指令下标。
  - 遇到墙：停止，`status: 'blocked'`，`failedAt` = 出错指令下标。
  - 指令全部执行完：在终点且骨头全部吃到 → `'success'`；在终点但骨头没吃完 → `'missedBones'`；不在终点 → `'notReached'`。这三种情况 `failedAt` 为 `-1`。
  - 中途路过终点不算结束，只看最后停在哪。
  - `collected`：吃到的骨头数（经过骨头格就算吃到，同一根只算一次）。
- `solve(level)` → 最短的成功指令数组（BFS，状态 = 位置 + 已吃骨头集合）；无解返回 `null`。
- `levels.js`：`export const LEVELS`，至少 12 关，`id` 唯一，全部有解，且 `solve(level).length <= level.maxCards`。第 1 关 3×3 以内、不超过 3 步；难度逐步提高，最后几关 6×6 以上、带骨头和障碍。

### 5.7 src/games/mirror/logic.js
网格是二维数组 `grid[r][c]`，值为颜色编号，`0` 表示空。
- `reflect(grid, axis)`：`axis === 'vertical'`（竖线镜子）时每行左右翻转；`'horizontal'` 时行的顺序上下翻转。返回新数组，不修改原数组。
- `isSymmetric(grid, axis)`：`grid` 与 `reflect(grid, axis)` 完全相同。
- `diffCells(a, b)` → `[{ r, c }]`，按行优先列出两个同尺寸网格不相同的格子。
- `givenHalf(level)` → 和 solution 同尺寸的网格：竖线时左半边保留 solution 的颜色、右半边全为 0；横线时上半边保留、下半边为 0。
- `levels.js`：`export const LEVELS`，至少 10 关，每关 `{ id, axis, colors: ['#hex', ...], solution }`。`solution` 必须对称，镜子方向那一维必须是偶数，solution 里出现的颜色编号都在 `1..colors.length` 内。从 4×4、1 种颜色开始，逐步到 8×8、3 种颜色；至少 3 关用横线镜子。图案要有趣（小狗脸、骨头、房子、飞机……），不要随机噪点。

### 5.8 src/games/rotate/logic.js
形状是格子坐标数组 `[[x, y], ...]`，y 向下。
- `normalize(cells)`：平移使最小 x、最小 y 都为 0，再按 `(y, x)` 升序排序。返回新数组。
- `rotate(cells, turns = 1)`：顺时针旋转 `turns` 个 90°（屏幕坐标下，单格变换 `(x, y) → (-y, x)`），结果经过 normalize。`turns` 可以是任意整数（负数为逆时针）。
- `mirror(cells)`：左右翻转 `(x, y) → (-x, y)`，结果经过 normalize。
- `sameShape(a, b)`：normalize 后完全相同（不允许旋转）。
- `rotationsNeeded(from, to)` → 最小的 `n ∈ {0,1,2,3}` 使 `sameShape(rotate(from, n), to)`；不存在返回 `-1`。
- `isChiral(cells)`：镜像无法通过旋转得到时为 `true`。
- `makeChoices(shape, rng)` → `{ options: [cells, cells, cells], answer }`：`answer` 是正确选项下标；正确选项是 `rotate(shape, k)`（k 为 1–3）；另外两个选项对 `shape` 的 `rotationsNeeded` 必须是 `-1`，其中至少一个是 shape 镜像的某个旋转。`rng` 是返回 `[0,1)` 的函数，相同 rng 序列结果必须相同。要求 `shape` 是手性形状，否则抛 `Error`。
- `levels.js`：`export const LEVELS`，至少 12 关，每关 `{ id, mode: 'turn' | 'choose', shape, turns? }`。`turn` 关卡要有 `turns ∈ {1,2,3}`，目标影子是 `rotate(shape, turns)`，且该形状旋转 `turns` 次后要和原样不同。`choose` 关卡的 shape 必须是手性形状。从 3 格开始，最大 6 格。

### 5.9 src/games/cubes/logic.js
高度图 `h[row][col]`：row 0 在最后面，row 越大越靠近观察者；col 从左到右。
- `countCubes(h)` → 积木总数。
- `frontHeights(h)` → 从前面看每一列的高度：`[max over rows of h[r][c]]`，长度 = 列数。
- `leftHeights(h)` → 从左侧看每一行的高度：`[max over cols of h[r][c]]`，按 row 从后到前排列。
- `topView(h)` → 布尔二维数组，`h[r][c] > 0`。
- `numberChoices(n, rng)` → 3 个互不相同的正整数，包含 `n`，已打乱顺序，相同 rng 结果相同。
- `levels.js`：`export const LEVELS`，至少 12 关，每关 `{ id, mode: 'count' | 'front', heights }`。heights 最大 4×4，每格 0–4 的整数，至少有一格大于 0。`front` 关卡的 `frontHeights` 不能全部相同。从 3 块积木开始，逐步增加到有被挡住积木的情况。

## 6. 页面与测试标记

验收用浏览器自动测试，下面这些 `data-testid` 必须存在：

| 页面 | 元素 | data-testid |
|---|---|---|
| 首页 | 每个游戏入口 | `game-tile-<gameId>` |
| 首页 | 徽章墙入口 | `btn-badges` |
| 选关 | 第 n 关按钮（n 从 0 开始） | `level-btn-<n>`，锁住的关卡加属性 `data-locked="true"` |
| 游戏页 | 游戏区域容器 | `play-area` |
| 游戏页 | 返回 | `btn-back` |
| 游戏页 | 重听语音 | `btn-speak` |
| 游戏页 | 提示 | `btn-hint` |
| 过关弹层 | 弹层本身 | `success-overlay` |
| 过关弹层 | 下一关 | `btn-next` |

各游戏内部的测试标记写在对应任务卡里。

页面上不能有任何未捕获的 JS 错误或 `console.error`。
