# 汪汪队空间大冒险

给一年级小朋友玩的空间思维益智游戏（家庭自用）。需求见 [docs/SPEC.md](docs/SPEC.md)。

```bash
python3 -m http.server 8765   # 然后打开 http://localhost:8765
```

开发方式：Claude 写需求、验收测试和任务卡，Hermes（GLM）实现，调度器在 `../hermes-forge`。
