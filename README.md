# ESCFlatland

平面国交互短片。自动预览第一版93.65秒、第二版104.7秒；互动时长随探索、等待和持续长按变化。观看页默认第二版与F2配色，两版共享家庭、内心探索和追光结尾。

家庭中点击地面，孩子会从当前位置实时寻路；点击父亲或母亲则绕开障碍前往真实接触，顺序自由，途中可以更换目标。双方回应结束后，孩子保持朝向退回房间中心，停留0.9秒。检察官再从画外缓慢进入并观察，士兵错峰连续入场。押送中孩子反复收紧、停步和后挣，三名士兵近距交错催促；点击会加强抗拒，镜头始终读取碰撞修正后的真实主角位置。

工厂采用较近全景，让几条完整生产线清楚可读，更多轨道和机构按可见范围延伸至画面四边，实际生产角色仍为A版19排、B版12排。B版完整全景停留3秒，再一次平滑推近；切换景别不重启机器。开放输送段在自动和互动模式下均放慢：B三段为5.4、6、6秒，A接近首夹具、去旋转和去判定各4秒。持续长按时主角保持朝向，收紧并左右向后摆动，逆着输送方向退行。消耗圆环按用力时长填满，满格变红后失力；耗尽时点击仅无力抽搐、向后挪一点，松手休息后才能恢复。

工作时点击逐次加快所有工位的循环并拉远镜头；达到最远取景后自动连续变黑，无须额外点击。基础变黑约4.5秒，高频点击仍可平滑加速。内心从黑暗和微光开始，实际捕捉六处游动微光后，亮区沿捕捉位置扩散连通、照亮整个内心，再收回身体内的同一颗光种子；点空处不推进，等待时暗线和微光继续运动。

追光的运动、路程与速度形变保持原样：松手低速，长按明显加速并蓄满圆环，持续长按4.5秒才进入白场双手；松手0.6秒圆环退空。主角与两侧参考物共同随实际速度沿行进方向拉伸。唯一的引导光有明亮亮芯与柔和渐变光晕，轻盈漂浮，白场双手旁继续保留同一颗光。标准重新播放图标只在最后一幕完整结束后出现，按下会重置本次角色、互动与剧情；工作台保留独立网址。

工作台可切换版本：`?version=rhythm` 是四组夹具错拍夹压，每组0.5秒夹紧、3秒回收、1.5秒等待，相邻组错开0.5秒；`?version=routine` 是套标准框、压实、逐边喷黑、机械工作、内心探索与追光。URL可显式选择版本与配色，观看页链接保留播放进度。

[分镜制作表](docs/storyboard-r2/index.html)包含两版完整的细分动作段、对应代码首尾帧、四套配色对照，以及已选手绘图对。图对包含直接生成的手绘图、纯白代码帧和批准双手素材的代码合成帧；具体来源保留在JSON与生成记录中。视频提示词始终整段显示，可复制或下载TXT/CSV。两个工作台在相同网站来源下使用`flatland.palette.v1`保存配色；双手结尾保持中性纯白，不随配色染色。少女与双手的肤色新图保留在 `-fair-r19.png`，原图均保留，编辑提示词与来源记录见 `docs/assets/skin-edit-r19.json`。

[角色素材](docs/storyboard-r2/#character-assets)可预览、放大并下载持笔少女奔跑、停下喘气、几何转人形、平面弯折和白场双手原图。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-versions.js` 选择两版的场景、独立取景、各版剪辑与工作台说明。`story-timing.js`、`camera.js`、`story-notes.js` 保留共用原轨道，版本配置在其上选择，切镜不重置角色时钟。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光种子、空间转换；`story-versions.js` 中的 `camera.track` 用实际角色位置取景，全景、办公拉远和追光保留各自构图。`inner-discovery.js`：内心发现状态、光点命中与局部破雾；其行动时钟与剧情时钟分离。
- `correction-rules.js`：夹具接触、受力与四工位累计处理；`factory-routine.js`：第二版外壳、逐边喷漆和工作轨迹，与第一版的失败判定分开。`office-world.js`：固定世界格网、通行墙体、同一工作时钟与远景绘制。`family-navigation.js`：房屋内实时寻路和真实接触，复用轮廓碰撞；`encounter-interaction.js` / `action-input.js`：角色意图、反抗与疲劳、工作速度；`interaction-progress.js`：工作点击进度与追光长按圆环，保持环境循环和叙事推进独立。机器持续运行，跟随镜头不代替角色运动。

本轮定向检查：`node check-mechanics.cjs`、`node check-routine.cjs`、`node check-office.cjs`、`node check-chase.cjs`、`node check-player.cjs`、`node check-inner-player.cjs`、`node check-inner-discovery.cjs`、`node check-action-input.cjs`、`node check-encounter.cjs`、`node check-speed-response.cjs`、`node check-reference-sides.cjs`、`node check-interaction-progress.cjs`。实时交互与镜头检查：`node check-family-navigation.cjs`、`node check-hero-camera.cjs`、`node check-factory-effort.cjs`、`node check-factory-overview.cjs`、`node check-app-interaction.cjs`（应用级Canvas检查需本机已配置的 `@napi-rs/canvas`）。街区碰撞检查：`node check-collision-world.cjs`。
