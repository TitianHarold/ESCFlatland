# ESCFlatland

90秒平面国交互短片。追光在全白视野中结束，最后以静止第一人称观察自己的双手。默认观看页每次点击播放一个完整动作情节，等待时内窗继续流动；追光时可以长按加速，松开恢复正常速度。右上几何图标打开工作台，工作台左上可返回观看页。

[分镜制作表](docs/storyboard-r2/分镜制作表.html)包含36个动作段、72张代码首尾帧、四套配色的24张代码预览，以及8个图对使用的14张唯一图片。图对包含直接生成的手绘图、纯白代码帧和批准双手素材的代码合成帧；具体来源保留在JSON与生成记录中。视频提示词始终整段显示，可复制或下载TXT/CSV。两个工作台在相同网站来源下使用`flatland.palette.v1`保存配色；双手结尾保持中性纯白，不随配色染色。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-notes.js` 只负责工作台分镜描述；`story-timing.js` 将既有动作和碰撞轨道剪辑成90秒，不把节奏写进角色或镜头逻辑。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光缝、空间转换；`camera.js` 独立控制取景。

小范围回归检查：`node check-player.cjs`、`node check-collision-world.cjs`。
