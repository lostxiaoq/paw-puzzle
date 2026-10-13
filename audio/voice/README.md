# audio/voice/ — 狗狗配音文件

这里放提前生成好的狗狗声音（mp3）。生成流程由 Claude 负责：

```
node src/voice/export-lines.mjs > lines.json   # 导出全部台词 [{ id, speaker, text }]
# 用本地 TTS 给每句生成 mp3（每只狗狗一个音色）
```

## manifest.json 格式

`audio/voice/manifest.json` 把「哪只狗狗说了哪句话」映射到音频文件：

```json
{
  "version": 1,
  "files": {
    "chase|帮阿奇找小猫！点箭头排路线，再出发": "chase/route-intro.mp3",
    "marshall|汪汪队集合！快挑一个游戏吧！": "marshall/home-welcome.mp3"
  }
}
```

- 键 = `<speaker>|<text>`，`speaker` 是狗狗 id（chase / marshall / skye / rubble / rocky / zuma），`text` 必须和 `src/voice/lines.js` 里的台词**一字不差**。
- 值 = 相对 `audio/voice/` 的 mp3 文件名（可以带子目录）。
- 拿不到清单、JSON 坏了或 `files` 不是对象 → 当成空清单，游戏照常运行，全部台词退回系统语音（`speechSynthesis`），**不会报错**。

## 文件命名建议

- 台词 id 里的 `.` 换成 `-`，例如 `common.praise.1` → `marshall/common-praise-1.mp3`。
- 数出声的台词（`cubes.count.1` … `cubes.count.16`）每句一个文件。
- 全部台词（不含占位）目前约 90 句；生成完把 mp3 放进本目录、写好 manifest.json 即可。

## 播放行为（src/core/speech.js）

- 清单命中 → 播 mp3；没命中 → 系统 TTS（优先 Tingting/婷婷，其次 Shelley/Flo/Sandy，再其次任意 zh-CN）。
- 新一句话会打断上一句（mp3 和系统语音互 相打断）。
- mp3 播放失败（比如自动播放被拦）时静默，不报错。
