// 导出台词清单：node src/voice/export-lines.mjs > lines.json
// 输出 [{ id, speaker, text }, ...]（Claude 拿去批量生成 mp3）。
// 只用 Node 内置能力，浏览器模块一行都不碰。

import { LINES } from './lines.js';

const rows = LINES.map((l) => ({ id: l.id, speaker: l.speaker, text: l.text }));
process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
