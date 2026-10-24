# 023 — US2 实现（T016~T019）：洗牌后置底、多副本成组与静态路径清点

日期：2026-10-24 19:21–19:32
状态：T016~T019 实现完成，JDK8 `javac` 全量编译通过、离线补丁目标自检 18/18 通过；**T020 游戏内实测待用户执行**（步骤见 `specs/001-anthonys-wrath/quickstart.md` §4 的 2026-10-24 US2 段）。
依据：`memory/state.json` 的 `next`（US2 从 T016 开始）与 tasks.md Phase 4；research §R-004 已定稿的补丁路线。

## 1. 冷启动核对

- 读 `memory/state.json`（focus = US1 验收通过、US2 待开始）与 `coldStart: true` 事实（f001/f003/f005/f007/f008），并按 AGENTS.md 解析 `state_root = memory/`、spec 在 `.specify/memory/constitution.md` 与 `specs/001-anthonys-wrath/`。
- 读 spec/plan/tasks/research/quickstart 后开工；四个仓库（top/src/specs/memory）开工时工作区干净，无未提交改动。
- 运行 `.specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks`：`FEATURE_DIR=specs/001-anthonys-wrath`，`AVAILABLE_DOCS` 含 research/data-model/quickstart/tasks。
- 无 `.specify/extensions.yml`，因此未触发任何 before/after implement 钩子。

## 2. 实现内容

### T016 排序规则 `run/DrawPileOrdering.java`（新建）

- `sinkCurseToBottom(CardGroup)`：组内无本牌 → 返回 false（EC-003，不做额外判定）；否则按**倒序**扫描并移除所有 `cardID == anthonyswrath:AnthonysWrath` 的副本，再按原洗后相对顺序 `addAll(0, copies)`，形成位于索引 `0..k-1` 的连续块。
- 作用范围只认 `CardGroupType.DRAW_PILE` / `DISCARD_PILE`，另加 `player.drawPile` / `player.discardPile` 身份兜底：战斗开始时的临时组由 `initializeDeck` 构造为 `DRAW_PILE`，故被覆盖；`UNSPECIFIED` 暂存组、卡池组不重排。
- 「索引 0 = 抽牌堆底部」的决定性复核（`javap -c` V2.3.4，desktop-1.0.jar）：
  - `CardGroup.initializeDeck`：`new CardGroup(masterDeck, DRAW_PILE)` → `shuffle(shuffleRng)` → 按索引 0→尾 `drawPile.addToTop(card)`；位置一一对应。
  - `EmptyDeckShuffleAction.update`：先 `discardPile.shuffle(shuffleRng)`，再遍历洗后 `discardPile.group`（索引 0→尾）调 `SoulGroup.shuffle`；`Soul.shuffle` 把 `group` 指向 `player.drawPile` 后 `addToTop(card)`；位置同样一一对应。
  - 于是被洗组的索引 0 在两路径都落到 `drawPile` 索引 0 = 最后抽到 = 底部，与 f010 的抽牌方向结论一致。

### T019 原版拦截 `patches/vanilla/CardGroupShufflePatch.java`（新建）

- 两个静态内部类，各一个 `@SpirePostfixPatch`：
  - `ShuffleNoArg`：`@SpirePatch(clz = CardGroup.class, method = "shuffle", paramtypez = {})`（空数组显式声明无参，命中 `shuffle()` 重载）；
  - `ShuffleWithRng`：`@SpirePatch(clz = CardGroup.class, method = "shuffle", paramtypez = {Random.class})`。
- 只调用 `DrawPileOrdering`，不产生玩家可见文本、不改变其它卡牌行为（包约定见 `package-info.java`，本次同步更新为「已实现」措辞）。

### T017 入口类接入（`AnthonysWrathMod.java` javadoc / 无新增订阅）

- 按 R-004 选补丁路线，补丁由 ModTheSpire 加载时扫描 jar 内 `@SpirePatch` 自动应用（T004 的 `ProbePatches` 从未被入口类或其它代码引用，却实际生效，即同一机制的实证），因此入口类无需注册订阅；在入口类 javadoc 写明「US2 无订阅者、三条路径如何收敛」。
- 三条路径与对应落点：
  1. 战斗开始首次洗牌：`AbstractPlayer.preBattlePrep` → `CardGroup.initializeDeck` → 临时 `DRAW_PILE` 组 `shuffle(Random)`；
  2. 抽牌堆耗尽重洗：`EmptyDeckShuffleAction` → `discardPile.shuffle(Random)`；
  3. 卡牌/遗物触发的非耗尽重洗：`ShuffleAction`（`Reboot` / `DeepBreath` 对 `drawPile` 调 `shuffle()`）与 `ShuffleAllAction`（`Reboot`，`discardPile`，`shuffle(Random)`）。

### 静态清点（新增验证，支撑 T017 / EC-001）

- 方法：用 .NET `ZipArchive` 逐条读取 `libs/desktop-1.0.jar` 全部 7038 个 class，按常量池字符串筛出同时含 `cardcrawl/cards/CardGroup` 与 `shuffle` 的 27 个候选；再对每个候选 `javap -p -c` 枚举 `CardGroup.shuffle` 的真实调用点（含所在方法），并同样检查 `Collections.shuffle` 的调用上下文。
- 结果：全库仅 **8 处** `CardGroup.shuffle` 调用点，其中作用于战斗牌堆的 4 处即上面三条路径；其余 4 处洗的是 `UNSPECIFIED` 暂存组——`DrawPileToHandAction.update`（检索抽牌堆时建暂存组再随机取）、`UpgradeRandomCardAction.update`、`TwistingMind.onPlayerEndTurn`、`CardLibrary.getAnyColorCard`（新版 `CardGroup(UNSPECIFIED)`）——会被类型过滤跳过，属正确行为。
- `Collections.shuffle` 侧：没有任何一处直接洗 `drawPile` / `discardPile` 的 `group` 列表；命中的都是克隆的手牌列表（`DiscardAtEndOfTurnAction`）、遗物/药水池（`AbstractDungeon`）、事件暂存列表（`ShiningLight` / `Designer` / `WeMeetAgain` / `MindBloom` 等）、事件自己的卡组（`GremlinMatchGame`）与升级抽选列表（`WarPaint` / `Whetstone` / `TinyHouse` / `Test5`）。结论升为 `memory/facts/f017`。

## 3. 探针扩展（服务 T020，T035 整体删除）

`src/main/java/anthonyswrath/probe/AwProbeCommand.java`：

- `awprobe info` 追加 `drawPile` / `discardPile` 全序（标注「索引 0 = 底部」）。
- 新命令 `awprobe drawpile`：只读 dump 两个牌堆，不触发洗牌（QS-03/04/05/17 的主判据）。
- 新命令 `awprobe shuffleaction`：入队真实 `ShuffleAction(drawPile, true)`——即 `Reboot` / `DeepBreath` 的牌触发非耗尽洗牌路径，供 QS-04 复跑。
- 新命令 `awprobe sinktest`：`DrawPileOrdering` 的确定性自检 4 例——两副本交错时收成 `[copyA, copyB, filler...]`（含 uuid 序核对）、重复调用幂等、无本牌组返回 false 且不变、`UNSPECIFIED` 组含本牌也不动；输出 `case=... PASS/FAIL` 与 `summary pass=4/4`，避免依赖随机洗牌结果来验证 FR-007 的相对顺序。

## 4. 本地验证（沙箱内可做的全部）

- JDK8 `javac -source 1.8 -target 1.8` 对 `src/main/java` 全部 13 个源文件编译：**exit 0**，产出 30 个 class（`target/classes-javac8/`，target 已忽略）。
- 离线补丁目标自检（复刻 MTS 的 `paramtypez` 解析与 handler 形状校验，检查器在 `target/checker/`，不入库）：**checked=18 failed=0**，其中两条新补丁分别精确命中 `CardGroup.shuffle()` 与 `CardGroup.shuffle(Random)`。
- 追加事实：`memory/facts/f017`（原版洗牌调用点全集与「所有牌堆洗牌都经两个原语」）。
- **未做**：`mvn package`（沙箱内 Maven 不可用，见 f008）、游戏内实测（T020，需用户普通终端构建并进游戏）。

## 5. 文档回写

- `specs/001-anthonys-wrath/research.md` §R-004：新增 **Implemented（2026-10-24，T016~T019 回写）**，含作用范围、索引 0 映射的字节码复核、静态清点、离线自检与转 T020 的 Remaining。
- `specs/001-anthonys-wrath/tasks.md`：T016~T019 勾选并写入完成说明；Phase 4 Checkpoint 追加「实现完成、T020 待实测」；US2 实现段补一段批次摘要；T020 注明待用户执行与 quickstart 段落位置。
- `specs/001-anthonys-wrath/quickstart.md`：§3 命令表补 `shuffleaction` / `drawpile` / `sinktest`；§4 QS 表前插入 2026-10-24 US2 实测步骤（QS-03/04/05/17 + QS-01 文案复核 + sinktest）。
- `specs/001-anthonys-wrath/plan.md`：`patches/vanilla/` 结构注释补「洗牌置底」。

## 6. 决策

- **DEC-022（US2 实现口径）**：置底 = 两个 `CardGroup.shuffle` 原语 postfix + `DRAW_PILE`/`DISCARD_PILE` 类型过滤；多副本按洗后相对顺序成组到 `0..k-1`；T017 的「入口类接入」由补丁自动应用机制承担（不新增订阅者，避免同一行为两条实现路径）。
  - 否决：再加 `StartBattle` 兜底订阅（补丁已覆盖首洗的临时组，兜底会掩盖补丁失效、且与 R-004「首洗不是唯一落点」的论证重复）；
  - 否决：对任意被洗组都置底（会误动 `UNSPECIFIED` 暂存组，例如 `DrawPileToHandAction` 的随机取牌池）；
  - 否决：拦截 `Collections.shuffle`（静态清点证明没有牌堆走这条路，拦它只会误伤事件/卡池逻辑）。

## 7. 本轮本地提交（未推送，推送顺序 src → specs → memory → 顶层）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `src` | US2 实现：`DrawPileOrdering`、`CardGroupShufflePatch`、入口类 javadoc、探针新命令 |
| 2 | `specs` | R-004 Implemented、tasks T016~T019、quickstart US2 步骤、plan 结构注释 |
| 3 | `memory` | 本记录 + f017 + state.json |
| 4 | 顶层 | 推进 gitlink（src / specs / memory → 本轮） |

## 8. 下一步（用户）

1. 普通终端 `mvn package`，把 `target/anthonyswrath.jar` 覆盖到游戏目录 `mods/`；删除旧 `awprobe.log`。
2. 按 `quickstart.md` §4 的 2026-10-24 US2 段执行 QS-03 / QS-04 / QS-05 / QS-17，顺手做 QS-01 中文文案目视复核，并把 `awprobe.log` 交回。
3. 收到日志后：判定 T020、写 `memory/log/` 记录并勾选；随后进入 US3（T021~T025，入手判定两处 + 一次性守卫）。
