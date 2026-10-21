# ESCFlatland

最长90秒的平面国交互短片。追光在全白视野中结束，最后以静止第一人称观察自己的双手。观看页点击父亲、母亲让孩子寻路靠近；不操作时孩子在家观察走动。执政官到来后流程持续前进，点击可让孩子颤抖、押送时迟疑、在传送带上短暂逆行；重复反抗会疲惫，最终仍被送入工位。工作时点击让所有工位一起加速，并更快变暗。追光时可以长按加速，松开回到持续加速的基础速度。两版追光路程扩大为原来的4.75倍，沿途图形加速后掠，角色随速度拉伸。右上几何图标打开工作台，工作台左上可返回观看页。

两版的内心世界都从黑暗和微光开始。点击微光后局部色带持续可见，六处发现积累后破雾并连续进入追光；点空处不推进剧情，等待时暗线和微光继续运动。空格或回车可点亮下一处微光。自动播放沿同一发现顺序预览；交互等待时长不限。

工作台底部可切换两版：`?version=rhythm` 是四组夹具错拍夹压，每组0.5秒夹紧、3秒回收、1.5秒等待，相邻夹具错开0.5秒；`?version=routine` 是套标准框、压实、逐边喷黑、按视野持续生成的密集办公格网、外景变暗并进入内心世界，光点引向追光。第一版79秒，第二版90秒；观看页链接保留版本和播放进度。

[分镜制作表](docs/storyboard-r2/分镜制作表.html)包含36个动作段、72张代码首尾帧、四套配色的24张代码预览，以及8个图对使用的14张唯一图片。图对包含直接生成的手绘图、纯白代码帧和批准双手素材的代码合成帧；具体来源保留在JSON与生成记录中。视频提示词始终整段显示，可复制或下载TXT/CSV。两个工作台在相同网站来源下使用`flatland.palette.v1`保存配色；双手结尾保持中性纯白，不随配色染色。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-versions.js` 选择两版的场景、独立取景、各版剪辑与工作台说明。`story-timing.js`、`camera.js`、`story-notes.js` 保留共用原轨道，版本配置在其上选择，切镜不重置角色时钟。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光缝、空间转换；`camera.js` 独立控制取景。`inner-discovery.js`：内心发现状态、光点命中与局部破雾；其行动时钟与剧情时钟分离。
- `correction-rules.js`：夹具接触、受力与四工位累计处理；`factory-routine.js`：第二版外壳、逐边喷漆和工作轨迹，与第一版的失败判定分开。`office-world.js`：固定世界格网、通行墙体、同一工作时钟与远景绘制。`encounter-interaction.js` / `action-input.js`：角色意图、反抗与疲劳、工作速度；镜头独立运行。

本轮定向检查：`node check-mechanics.cjs`、`node check-routine.cjs`、`node check-office.cjs`、`node check-chase.cjs`、`node check-player.cjs`、`node check-inner-player.cjs`、`node check-inner-discovery.cjs`、`node check-action-input.cjs`、`node check-encounter.cjs`、`node check-speed-response.cjs`。街区碰撞检查：`node check-collision-world.cjs`。
