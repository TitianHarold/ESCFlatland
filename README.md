# ESCFlatland

平面国交互短片。默认观看页每次点击播放一个完整动作情节，等待时内窗继续流动；追光时可以长按加速，松开恢复正常速度。右上几何图标打开工作台，工作台左上可返回观看页。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-notes.js` 只负责工作台分镜描述。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光缝、空间转换；`camera.js` 独立控制取景。

小范围回归检查：`node check-player.cjs`、`node check-collision-world.cjs`。
