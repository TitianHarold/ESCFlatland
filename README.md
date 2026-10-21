# ESCFlatland

最长90秒的平面国交互短片。追光在全白视野中结束，最后以静止第一人称观察自己的双手。观看页任意点击画面，依次让孩子靠近父亲、母亲；不操作时孩子在家观察走动。点击时出现好奇符号，接触后变为叹号，直到下一次点击；父母在接触瞬间快速非线性内凹收紧，再连续退开，叹号保留到反应之后；母亲退开后，孩子保持原朝向受挫退回房间中心，再让检察官进入。执政官到来后流程持续前进，点击可让孩子颤抖、押送时迟疑、在传送带上保持朝向短暂逆行；重复反抗会疲惫，最终仍被送入工位。工作时点击逐次加快所有工位的循环并拉远镜头；拉到最远后再点击一次，开始连续变黑，此后无需继续点击。基础连续变黑约4.5秒完成，更密集的点击会平滑加快变黑。追光时松手保持基础低速，长按明显加速并蓄满圆环，持续长按4.5秒后才进入白场双手；松手0.6秒圆环退空。两版追光路程扩大为原来的4.75倍，沿途图形加速后掠，角色与两侧参考图形共同随实际速度沿行进方向拉伸。右上几何图标打开工作台，工作台左上可返回观看页。

两版的内心世界都从黑暗和微光开始。点击微光后局部色带持续可见，六处发现积累后，亮区沿真实捕捉位置的轮廓扩散连通、照亮整个内心；随后收回身体内的同一颗光种子，再飞出引导追光；点空处不推进剧情，等待时暗线继续运动，亮点带着短光迹游动，可按实时位置捕捉。空格或回车可点亮下一处微光。自动播放沿同一发现顺序预览；交互等待时长不限。

观看页默认第二版与 F2 配色；URL 可显式选择其他版本和配色。工作台底部可切换两版：`?version=rhythm` 是四组夹具错拍夹压，每组0.5秒夹紧、3秒回收、1.5秒等待，相邻夹具错开0.5秒；`?version=routine` 是套标准框、压实、逐边喷黑、按视野持续生成的密集办公格网、外景变暗并进入内心世界，光点引向追光。第一版79秒，第二版90秒；两版押送只保留主角队伍，第二版工厂Overview完整停留3秒后才开始推近。观看页链接保留版本和播放进度。

[分镜制作表](docs/storyboard-r2/分镜制作表.html)包含两版完整的细分动作段、对应代码首尾帧、四套配色对照，以及已选手绘图对。图对包含直接生成的手绘图、纯白代码帧和批准双手素材的代码合成帧；具体来源保留在JSON与生成记录中。视频提示词始终整段显示，可复制或下载TXT/CSV。两个工作台在相同网站来源下使用`flatland.palette.v1`保存配色；双手结尾保持中性纯白，不随配色染色。少女与双手的肤色新图保留在 `-fair-r19.png`，原图均保留，编辑提示词与来源记录见 `docs/assets/skin-edit-r19.json`。

[角色素材](docs/storyboard-r2/#character-assets)可预览、放大并下载持笔少女奔跑、停下喘气、几何转人形、平面弯折和白场双手原图。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-versions.js` 选择两版的场景、独立取景、各版剪辑与工作台说明。`story-timing.js`、`camera.js`、`story-notes.js` 保留共用原轨道，版本配置在其上选择，切镜不重置角色时钟。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光种子、空间转换；`camera.js` 独立控制取景。`inner-discovery.js`：内心发现状态、光点命中与局部破雾；其行动时钟与剧情时钟分离。
- `correction-rules.js`：夹具接触、受力与四工位累计处理；`factory-routine.js`：第二版外壳、逐边喷漆和工作轨迹，与第一版的失败判定分开。`office-world.js`：固定世界格网、通行墙体、同一工作时钟与远景绘制。`encounter-interaction.js` / `action-input.js`：角色意图、反抗与疲劳、工作速度；`interaction-progress.js`：工作点击进度与追光长按圆环，保持环境循环和叙事推进独立。镜头独立运行。

本轮定向检查：`node check-mechanics.cjs`、`node check-routine.cjs`、`node check-office.cjs`、`node check-chase.cjs`、`node check-player.cjs`、`node check-inner-player.cjs`、`node check-inner-discovery.cjs`、`node check-action-input.cjs`、`node check-encounter.cjs`、`node check-speed-response.cjs`、`node check-reference-sides.cjs`、`node check-interaction-progress.cjs`。街区碰撞检查：`node check-collision-world.cjs`。
