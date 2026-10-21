# ESCFlatland

平面国交互短片。自动预览第一版107.65秒、第二版118.7秒；互动时长随探索、等待和持续长按变化。观看页默认第二版与F2配色，两版共享家庭、内心探索和追光结尾。

家庭中点击地面，孩子会从当前位置实时寻路；点击父亲或母亲则绕开障碍前往真实接触，顺序自由，途中可以更换目标。双方回应结束后，孩子保持朝向退回房间中心，停留0.9秒。检察官再从画外缓慢进入并观察，士兵错峰连续入场。家庭等待时孩子轻摇、慢慢探索，父母保持小幅沉稳动作；退避快速起动再减速，母亲同时向内收紧。押送点击时孩子立即缩紧，再缓慢停步、后挣；镜头稍滞后地减速和小幅回移。三名士兵近距交错催促并把孩子送入门内，检察官留在门旁。恢复前行不补速。士兵沿真正入口曲线和接收段转向；进入工厂时清除门外抵抗状态，再由传送带接管。

所有家庭院落的房门都从真实入口通过带障碍间距约束的 A* 搜索连到可达街网，再对路径简化、圆滑并检验通路。房屋、道路和街区负形共用连续平面，避免断路或尖锐接缝。

工厂采用较近全景，让几条完整生产线清楚可读，更多轨道和机构按可见范围延伸至画面四边，实际生产角色仍为A版19排、B版12排。门口拉远与随后推近使用连续构图，不在切入全景时重新居中。B版完整全景停留3秒，再一次平滑推近；停留时角色与机器仍继续前行。开放输送段在自动和互动模式下均放慢：B三段为5.4、6、6秒，A接近首夹具、去旋转和去判定各4秒。持续长按时主角保持朝向，收紧并左右向后摆动，逆着输送方向退行。消耗圆环按用力时长填满，满格变红后失力；之后只按带速前行，保留已落后的距离，工序等真正到站再接触，不加速追赶。耗尽时点击仅无力抽搐、向后挪一点，长按只显示红圈，松手休息后才能恢复。角色能在画面软区内逆行，镜头不会把整座工厂一起拖走。

B版三个节点分别响应方向点击逃离封边、中心内长按收紧挣扎、逆着机器旋转抗拒喷漆；操作只改变角色与对应夹具，不拖动整座工厂。每完成一节点，圆环累计变红三分之一。

工作时点击逐次加快所有工位的循环并拉远镜头；达到最远取景后自动连续变黑，无须额外点击。基础变黑约4.5秒，高频点击仍可平滑加速。内心从黑暗和微光开始，首次出现两个游动微光，之后每次只补一个。捕捉六处后，亮区沿捕捉位置扩散连通，1.44秒照亮整个内心；全亮后等待点击中央柔光，确认后用1.96秒收回身体内的同一颗光种子。自动预览以0.60秒亮场停留代替确认，点空处不推进，等待时暗线和微光继续运动。

追光保留原有速度、路程与两侧参照物的联动形变：松手低速，长按明显加速并蓄满圆环，持续长按4.5秒后，接续1.6秒冲刺收尾再进入白场；松手0.6秒圆环退空。B版每次短点击剥落一块黑漆；蓄满后按顺序剥完余片，最后0.4秒归白。低速使用较舒展的视角，随着实际速度升高渐变为贴近主角的强透视镜头。引导光使用柔和渐变光晕，在稍远前方轻盈漂浮；主角朝向带轻微反应延迟。

白场与追光的同一颗光位置连续衔接。四次点击依次张手、半握、中央光晕展开为左手调色盘与右手画笔，最后由第四次点击淡入白场、进入内心世界。工具画面等待最后一次点击，光点化为工具后不再单独出现。内心世界先后显示 `Welcome to explore new dimensional` 与 `Alice escape flatland`。全部动作结束后才显示标准重新播放图标。工作台提供真正的播放／暂停，暂停同时冻结角色、机器、镜头和过渡。

工作台可切换版本：`?version=rhythm` 是四组夹具错拍夹压，每组0.5秒夹紧、3秒回收、1.5秒等待，相邻组错开0.5秒；`?version=routine` 是套标准框、压实、逐边喷黑、机械工作、内心探索与追光。URL可显式选择版本与配色，观看页链接保留播放进度。

[分镜制作表](docs/storyboard-r2/index.html)包含两版完整的细分动作段、对应代码首尾帧、四套配色对照，以及已选手绘图对。结尾细分四次点击、工具显现与白场进入内心，两版各38段、共152张程序首尾帧。图对包含直接生成的手绘图、纯白代码帧和批准双手素材的代码合成帧；具体来源保留在JSON与生成记录中。视频提示词始终整段显示，可复制或下载TXT/CSV。两个工作台在相同网站来源下使用`flatland.palette.v1`保存配色；双手结尾保持中性纯白，不随配色染色。少女与双手的肤色新图保留在 `-fair-r19.png`，原图均保留；新增工具姿态在 `docs/assets/pov-hands-tools-r24.png`，生成提示词与来源见 `docs/assets/tools-r24.json`；旧握笔姿态保留在 `docs/assets/pov-hands-brush-r23.png`，不覆盖既有六项角色素材。编辑提示词与来源记录见 `docs/assets/skin-edit-r19.json`。

[角色素材](docs/storyboard-r2/#character-assets)可预览、放大并下载持笔少女奔跑、停下喘气、几何转人形、平面弯折和白场双手原图。

Published with GitHub Pages from `main` / `docs`.

代码入口：`docs/app.js` 连接播放器、镜头和绘制；`story-versions.js` 选择两版的场景、独立取景、各版剪辑与工作台说明。`story-timing.js`、`camera.js`、`story-notes.js` 保留共用原轨道，版本配置在其上选择，切镜不重置角色时钟。

- `character-geometry.js`：同一角色轮廓用于绘制和碰撞。
- `portals.js` / `city-map.js`：同一房屋资产生成开口、墙体及绘制几何。
- `collision-world.js`：移动、旋转和形变沿途检查墙体及其他角色。
- `district.js`：生成移动意图与共用出口队列，再以固定步长求解碰撞；缓存使拖动回看可重复。
- `factory.js` / `restraint.js` / `inner-world.js` / `dimension.js`：表演、束缚、暗层与光种子、空间转换；`story-versions.js` 保留各版构图，`camera.js` 的 `Follow` 负责安全区、软区和阻尼跟随；全景、办公拉远和追光保留各自轴线。`inner-discovery.js`：内心发现状态、光点命中与局部破雾；其行动时钟与剧情时钟分离。
- `correction-rules.js`：夹具接触、受力与四工位累计处理；`factory-routine.js`：第二版外壳、逐边喷漆和工作轨迹，与第一版的失败判定分开。`office-world.js`：固定世界格网、通行墙体、同一工作时钟与远景绘制。`family-navigation.js`：房屋内实时寻路和真实接触，复用轮廓碰撞；`encounter-interaction.js` / `action-input.js`：角色意图、反抗与疲劳、工作速度；`interaction-progress.js`：工作点击进度、黑漆逐点击剥落与追光长按圆环；`ending-progress.js`：白场四次点击、画笔调色盘与新维度结尾。环境循环与叙事推进保持独立。机器持续运行，跟随镜头不代替角色运动。

本轮定向检查：`node check-mechanics.cjs`、`node check-routine.cjs`、`node check-office.cjs`、`node check-chase.cjs`、`node check-player.cjs`、`node check-inner-player.cjs`、`node check-inner-discovery.cjs`、`node check-action-input.cjs`、`node check-encounter.cjs`、`node check-speed-response.cjs`、`node check-reference-sides.cjs`、`node check-interaction-progress.cjs`。实时交互与镜头检查：`node check-family-navigation.cjs`、`node check-hero-camera.cjs`、`node check-factory-effort.cjs`、`node check-factory-overview.cjs`、`node check-app-interaction.cjs`（应用级Canvas检查需本机已配置的 `@napi-rs/canvas`）。街区碰撞检查：`node check-collision-world.cjs`。
