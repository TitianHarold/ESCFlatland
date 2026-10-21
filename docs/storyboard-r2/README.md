# 平面国 · 分镜制作表

打开 `index.html` 或 `分镜制作表.html`。默认 B「例行塑形」与 F2 配色，可切换 A「四组夹具」及四套配色。

- A 37段、自动预览79秒；B 37段、自动预览90秒。互动版本允许等待、反抗、点击工作和长按追逐，总时长随操作变化。
- 每段给出完整剧情、场景角色、画风颜色、动作节奏、机位、首帧、尾帧和连续性要求；同一大框可一次复制。
- 148张当前程序首尾帧，四配色×两版×六场景，共48张配色对照。程序帧为离线Canvas采样，不是新手绘图或浏览器截图。
- 原有手绘图对与全部角色原图保留。画面选择只切换参考图片，不覆盖当前完整剧情与视频提示词。
- 少女与双手当前展示偏白肤色版本；素材区分别保留当前PNG与原图PNG下载，布局不变。

`shots-detailed.json` 保存两版镜头和真实时间映射。`frames/detailed/manifest.json` 与 `frames/palette-preview/manifest.json` 保存采样来源；各版 CSV/TXT 可离线使用。无版本后缀的导出默认为B版。

维护命令：

```sh
node render-code-frames.cjs all
python3 build_board_r2.py
```

`build_board_r2.py` 只重建表格和导出，不生成或覆盖角色原图。`art-pairs.json` 与图像生成原词保留为历史来源；旧专用fullPrompt不参与当前剧情复制。
