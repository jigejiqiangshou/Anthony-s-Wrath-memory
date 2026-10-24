# 027 — US3 实现（T021~T024）：入手即判负、本体失败落点、一次性守卫与终局短路

日期：2026-10-24 21:44 起
状态：T021~T024 实现完成——JDK8 `javac` 全量编译 exit 0、离线 MTS 目标自检 **22/22**、一次性守卫离线测试 **8/8**；**T025 游戏内实测待用户执行**（步骤见 `specs/001-anthonys-wrath/quickstart.md` §4 的 2026-10-24 US3 段）。
依据：`memory/state.json` 的 `next`（US2 验收通过、下会话进入 US3）与 `tasks.md` Phase 5；research §R-005 已定稿的两个判定点。

## 1. 冷启动核对

- 读 `AGENTS.md`（`state_root = memory/`；spec 在 `.specify/memory/constitution.md` 与 `specs/001-anthonys-wrath/`）、`memory/state.json`、`coldStart: true` 事实（f001 / f003 / f005 / f007 / f008），以及 spec / plan / tasks / research / data-model / quickstart。
- `check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks` → `FEATURE_DIR=specs/001-anthonys-wrath`、`AVAILABLE_DOCS=[research, data-model, quickstart, tasks]`。
- `.specify/extensions.yml` 不存在，因此未触发任何 before/after implement 钩子。
- `checklists/requirements.md` 机械扫描：16/16 已勾选（PASS），无需询问即可继续。
- 用户口述「重建和放置已完成」的核对：`target/anthonyswrath.jar` 与游戏目录 `mods/anthonyswrath.jar` 均为 2026-10-24 21:43:04、49117 bytes、SHA256 `6AE796FC…19912C` 完全一致，且 `ProbeLog.class` 内含完整 `anthonyswrath:AnthonysWrath`（TRACKED 修复已生效）⇒ 该前置步骤确实完成；但它是 **US2 版本的 jar**，本身不含 US3 代码，T025 前仍需再重建一次。

## 2. 实现内容

### T021 判负落点 `run/DefeatOnDraw.java`（新建）

- `onCurseEnteredHand(AbstractCard)`：只处理 `CARD_ID` 命中本牌且本局尚未判负的调用；`AbstractDungeon.player` / `getCurrRoom()` / `getMonsters()` 缺失时不动（无战斗上下文不判负）。
- 置一次性守卫后执行本体的死亡分支（**不调用 `player.damage(...)`**）：
  1. `player.isDead = true`
  2. `AbstractDungeon.deathScreen = new DeathScreen(AbstractDungeon.getMonsters())`
  3. `player.currentHealth = 0`
  4. `if (currentBlock > 0) player.loseBlock()`
- 落点依据（`javap -c -p` V2.3.4）：`AbstractPlayer.damage` 的死亡分支在偏移 **1102~1136**；复活分支在偏移 **960~1101**（Lizard Tail / FairyPotion / Mark of the Bloom）。走 `damage()` 会让复活资源把致命伤变成回复，判负不成立（违反 FR-008），并引入受伤类遗物/能力副作用。
- `DeathScreen` 构造器承担全部失败结算副作用（`screen=DEATH`、`incrementDeath`、`submitDefeatMetrics`、`deleteSave`、返回主菜单按钮等）；`AbstractDungeon.update` 在 `screen==DEATH` 时只调 `DeathScreen.update()`，战斗/动作队列/操作全部冻结 ⇒ FR-009 与「判负后不再接受可操作结果」由本体保证。结论升为 **f020**。

### T022 入手判定 `patches/vanilla/CardGroupHandEntryPatch.java`（新建）

- 两个 postfix 静态内部类（各一个 `@SpirePatch`，沿用 R-005 / f013 的最小判定点集）：
  - `AddToHand`：`@SpirePatch(clz = CardGroup.class, method = "addToHand", paramtypez = {AbstractCard.class})`——覆盖普通抽牌、临时牌、弃牌堆取牌（Meditate）；
  - `AddToTopHand`：`@SpirePatch(clz = CardGroup.class, method = "addToTop", paramtypez = {AbstractCard.class})` + `__instance == player.hand` 身份过滤——覆盖抽牌堆检索（Secret Technique）与 Retain。
- 两处只把命中本牌的调用交给 `DefeatOnDraw`，其它卡牌与其它目标组不受影响；不产生玩家可见文本。

### T023 一次性守卫 + 终局短路

- `run/RunState.java`：新增 `defeated` / `defeatGuard` 运行期字段与 `isDefeated()` / `tryMarkDefeated()` / `resetDefeatState()`；`tryMarkDefeated()` 首次返回 true，之后一律 false（多副本同时刻入手只结算一次，FR-010）。
- `patches/vanilla/AbstractPlayerDrawPatch.java`（新建）：`@SpirePrefixPatch` 返回 `SpireReturn`，`isDefeated()` 时跳过整个 `AbstractPlayer.draw(int)` 方法体（EC-004 的入口级短路）。MTS 3.30.3 的 `SpireReturn` 对 void 目标的取消语义经 `ParameterPatchInfo.doPatch` 字节码复核，结论升为 **f021**；`draw()` 无参重载只有 1 次 `draw(1)` 委托，因此只挂 `draw(int)` 即可覆盖。
- 说明：触发判负的那一次 `draw(int)` 已经进入循环，剩余迭代不会再次经过本 prefix；但由于 `screen=DEATH`，下一帧起动作队列不再更新，不会再有抽牌动作执行。该边界写进 `DefeatOnDraw` / `AbstractPlayerDrawPatch` 的 javadoc 与 quickstart 的 T025 判读说明。

### T024 入口类接入 `AnthonysWrathMod.java`

- 判定与短路都是原版方法拦截，按约定放 `patches/vanilla/`，由 ModTheSpire 扫描 `@SpirePatch` 自动应用——入口类不注册额外订阅（与 US2 相同理由）。
- 入口类唯一变更是 `implements StartGameSubscriber`，`receiveStartGame()` 调 `RunState.resetDefeatState()`：R-007 已实测新档与读档都触发该钩子，故它是运行期终局标志的唯一重置点；T027 将在此钩子追加诅咒池排除。
- 同步更新 `patches/vanilla/package-info.java` 的 US3 条目与入口类 javadoc（US2 段落之后补 US3 分工段）。

### 探针扩展（服务 T025，T035 整体删除）

- `probe/ProbePatches.java` 新增 `DeathScreenCtor`：`@SpirePatch(clz = DeathScreen.class, method = SpirePatch.CONSTRUCTOR, paramtypez = {MonsterGroup.class})`，prefix 记 `patch.deathScreen.before`（`isDead` / `hp` / 牌堆 / 手牌 / caller），postfix 记 `patch.deathScreen.after`（`screen` / 怪物数）——这是「判负被结算、且只结算一次」的直接日志证据。

## 3. 本地验证（沙箱内可做的全部）

- JDK8 `javac -encoding UTF-8 -source 1.8 -target 1.8` 编译 `src/main/java` 全部 18 个源文件：**exit 0**，产出 37 个 class（`target/classes-javac8-us3/`，target 已忽略）。
- 离线补丁目标自检（复刻 MTS `paramtypez` / handler 形状校验；本轮给 `PatchCheck` 增加了构造器支持）：**checked=22 failed=0**——含 3 条新补丁（`AbstractPlayer.draw[int]` 前缀、`CardGroup.addToHand` / `addToTop` postfix）与 `DeathScreen` 构造器探针；两条旧 shuffle 补丁仍命中。
- 一次性守卫离线测试（`target/us3-test/Us3States.java`，不入库）：初始未判负 → 首次结算 true → 第二次 false → 重置后可再次结算 → `DefeatOnDraw.onCurseEnteredHand(null)` 静默，**failed=0**。
- **未做**：`mvn package`（沙箱 Maven 不可用，f008）、游戏内实测（T025，需用户普通终端构建并进游戏）。

## 4. 文档回写

- `research.md` §R-005：新增 **Implemented（2026-10-24，T021~T024）**——入手判定、判负落点（含否决 `damage()` 的理由）、守卫/短路、离线自检与转 T025 的 Remaining；Alternatives 增补「`player.damage(...)` 触发判负（否决）」。
- `tasks.md`：T021~T024 勾选并写入完成说明（含落点字节码偏移与否决理由）；T025 保持未勾选并注明「待用户实测」；Phase 5 实现段落与 Checkpoint 同步。
- `quickstart.md` §4：新增 2026-10-24 US3 段（T025 的六步操作：QS-06 自然抽到、QS-07 两种搜寻取牌、QS-09 多副本只结算一次+短路、QS-15 失败记录、QS-16 主动放弃、QS-01 文案复核），含 `patch.deathScreen.*` 判读线与「US3 后耗尽重洗须先 Scry」的可行域说明。
- `plan.md`：`patches/vanilla/` 结构注释补「入手判定与终局短路」。

## 5. 决策

- **DEC-026（US3 实现口径：本体失败落点 + 两判定点 + 前缀短路）**：
  - 判负 = 复刻本体的死亡分支（`isDead` → `new DeathScreen(getMonsters())` → `currentHealth=0`），不调用 `player.damage(...)`；
  - 入手判定 = `CardGroup.addToHand` postfix + 目标为手牌的 `addToTop` postfix（R-005 最小集）；
  - 终局短路 = `AbstractPlayer.draw(int)` 的 `SpireReturn` 前缀（判负后整段跳过）；
  - 状态归属 = `RunState.defeated/defeatGuard` 运行期字段，`StartGame` 重置。
  - 否决：① `player.damage(huge HP_LOSS)`——复活资源会拦下判负；② 只在 `PostDrawSubscriber` 判定——覆盖不了取牌（EC-008）；③ 回合结束扫描手牌——不满足「同一瞬间」；④ 把判负逻辑塞进入口类订阅——判定点没有可用订阅（f013）。

## 6. 本轮本地提交（未推送，推送顺序 src → specs → memory → 顶层）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `src` | US3：`DefeatOnDraw`、`CardGroupHandEntryPatch`、`AbstractPlayerDrawPatch`、`RunState` 守卫、入口类 `StartGame` 订阅、探针 `deathScreen` 日志、package-info |
| 2 | `specs` | R-005 Implemented、tasks T021~T024 + T025 待测注记、quickstart US3 段、plan 结构注释 |
| 3 | `memory` | 本记录 + f020 + f021 + INDEX + state.json |
| 4 | 顶层 | 推进 gitlink（src / specs / memory → 本轮） |

## 7. 下一步（用户）

1. 普通终端 `mvn package`，把 `target/anthonyswrath.jar` 覆盖到游戏目录 `mods/`（本次构建才含 US3 代码），删除旧 `awprobe.log`。
2. 按 `quickstart.md` §4 的 2026-10-24 US3 段执行 T025（QS-06 / QS-07 / QS-09 / QS-15 / QS-16），把 `awprobe.log` 交回。
3. 收到日志后：判定 T025、写 `memory/log/028` 并在 tasks.md 勾选、更新 state.json；随后进入 US4（T026~T028）。
