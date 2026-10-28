# 029 — US4 实现（T026 / T027）：每局选中态记录、置底/判负短路、随机诅咒来源过滤

日期：2026-10-29 00:45 起
状态：T026 / T027 实现完成——JDK8 `javac` 全量编译 exit 0、离线 MTS 补丁目标自检 **26/26**、`@NoPools` 反射检查 PASS、双语 key 一致性 PASS；**T028 待用户实测**（步骤见 `specs/001-anthonys-wrath/quickstart.md` §4 的 2026-10-29 US4 段）。
依据：T025 通过（`memory/log/028`）后按 tasks.md Phase 6 推进；R-007（随机诅咒池排除）在实现期被 V2.3.4 反汇编推翻一半，已在 `research.md` §R-007 写入 Correction。

## 1. T026：每局选中态记录 + 组件短路

### 1.1 设计

- 新增 `RunState.beginRun()`：在 `StartGameSubscriber.receiveStartGame` 里**每局捕获一次** `selectedThisRun`，并同时清空 `defeated` / `defeatGuard`（取代原 `resetDefeatState()`）。
  - 来源 = 存档恢复后的 `AbstractPlayer.customMods` 含 `optionId` **且**（`Settings.isTrial` 或 `CardCrawlGame.trial instanceof CustomTrial`）。
  - 读档路径的两个来源已用 V2.3.4 字节码复核：`CardCrawlGame.loadPlayerSave` 会 `putstatic Settings.isTrial` 且恢复 `AbstractPlayer.customMods`（`javap -p -c com.megacrit.cardcrawl.core.CardCrawlGame`，`loadPlayerSave` 偏移 113 / 143 / 176 / 192）。
  - `StartGame` 在新档与读档都触发、且都在 `initializeCardPools` 之后（R-007 / f011），所以每局记录与判负标志共用同一个钩子。
- `isOptionSelected()` 改为只返回每局记录（不再现场读静态字段）：冻结后运行期不再受游戏静态字段变化影响；进程内第一局 `StartGame` 之前为 `false`（此时不存在"本局"，正是 FR-011 期望）。
- 新档注入路径 `PostCreateStartingDeck` 早于 `StartGame`，因此 `StartDeckInjector` 继续用更严格的 `isOptionSelectedForNewRun()`：现场读 `customMods` + `trial instanceof CustomTrial`（新档必有 `CustomTrial`，残留列表骗不过它）。
- 短路接线：
  - `run/DrawPileOrdering.sinkCurseToBottom`：开头 `if (!RunState.isOptionSelected()) return false;`（FR-011）；
  - `run/DefeatOnDraw.onCurseEnteredHand`：卡牌判定后依次 `isDefeatSuspendedForProbe()`（T032）→ `isOptionSelected()`（T026）→ `isDefeated()`（T023）。
- 数据模型实体 4 的 `selectedOption` 说明同步为「每局在 StartGame 捕获一次」（`data-model.md`）。

### 1.2 涉及文件

| 文件 | 变更 |
| :--- | :--- |
| `src/main/java/anthonyswrath/run/RunState.java` | 新增 `selectedThisRun` / `beginRun()` / `isDefeatSuspendedForProbe()` / `setDefeatSuspendedForProbe()`；`isOptionSelected()` 改为返回每局记录；`readSavedSelection()` 抽出；删除 `resetDefeatState()`（并入 `beginRun()`）；javadoc 重写（每局记录、来源、读档复核、T032 开关与 T035 移除说明） |
| `src/main/java/anthonyswrath/run/DrawPileOrdering.java` | 前置 `isOptionSelected()` 短路；javadoc 增「未选中局（T026 / FR-011）」段 |
| `src/main/java/anthonyswrath/run/DefeatOnDraw.java` | 前置 T032 开关与 `isOptionSelected()` 短路；javadoc 增「未选中局（T026 / FR-011）」段 |
| `src/main/java/anthonyswrath/AnthonysWrathMod.java` | `receiveStartGame` 改为 `RunState.beginRun()`；javadoc 增 US4 分工段（并写明 T027 原计划已被修正） |
| `specs/001-anthonys-wrath/data-model.md` | 实体 4 `selectedOption` 说明更新 |

## 2. T027：随机诅咒来源过滤（落点与计划不同，已修正）

### 2.1 发现：池排除不覆盖真正的随机诅咒来源（V2.3.4 反汇编）

- `AbstractDungeon.returnRandomCurse()` = `CardLibrary.getCurse().makeCopy()` + `UnlockTracker.markCardAsSeen`；
- `returnTrulyRandomCardFromAvailable(...)` 与 `transformCard(...)` 的诅咒分支分别调用 `CardLibrary.getCurse()` / `CardLibrary.getCurse(avoid, rng)`；
- `CardLibrary.getCurse` 两个重载都遍历 **私有 `CardLibrary.curses` 映射**，只硬编码排除 `AscendersBane` / `Necronomicurse` / `CurseOfTheBell` / `Pride`，最后以 `AbstractDungeon.cardRng` 从 `cards` 映射取实例；
- 引用 `curseCardPool` 的类只有 `AbstractDungeon` 自己（调用点 = `addCurseCards` 填充、`initializeCardPools` 快照、`getCard(CardRarity.CURSE)` / `getCardFromPool`）；**随机诅咒来源不读池**。
- 因此原 T027「在 StartGame 里从 curseCardPool 移出」即便执行也不影响 `returnRandomCurse()`，必须改为拦截 `CardLibrary.getCurse`。

### 2.2 实现（两层）

1. **池一致性**：`cards/AnthonysWrathCurse` 加 BaseMod 的 `@NoPools` 注解（`basemod.patches.com.megacrit.cardcrawl.dungeons.AbstractDungeon.NoPools`）。BaseMod 的 `RemoveExcludedCardsFromPools`（postfix `AbstractDungeon.initializeCardPools`）会按注解把该类实例从全部池（含 `curseCardPool` / `srcCurseCardPool`）移除；新档与读档都重建池，因此两层路径都覆盖。注解目标/保留策略经 `javap -v` 核对（`@Target(TYPE)`、`@Retention(RUNTIME)`），离线反射检查 PASS。
2. **随机来源**：新建 `patches/vanilla/CardLibraryGetCursePatch`，两个 **`@SpirePatch2`** postfix（MTS 3.30.3 只有 `@SpirePatch2` 会以 postfix 返回值替换目标返回值；旧式 `@SpirePatch` 的返回值被忽略。该模式按目标 LocalVariableTable 的参数名匹配，因此两参重载的 handler 参数名写作 `prohibitedCard` / `rng`；机制见事实 f024）：
   - `getCurse()`：命中本牌则循环重抽（内层调用由重入标志返回原始结果，避免递归；上限 64 次，10 张可选原版诅咒下实际 1–2 次）；
   - `getCurse(AbstractCard avoid, Random rng)`：同上，重抽时传回原 `avoid` / `rng`，覆盖「变化结果不得是本牌」（EC-003，与参照牌一致——参照牌永不是变化结果）。
   - 只比较本牌 cardID，其它诅咒行为与分布不变；`SpirePostfixPatch` 返回非 void 的替换语义已由 `PostfixPatchInfo` 字节码复核（`returnsValue` → 生成 `return ($r)…`）。

### 2.3 探针新增命令（服务 T028，T035 整体删除）

- `awprobe curseprobe [n]`（默认 50，上限 500）：各采样两个 `getCurse` 重载 n 次，统计命中本牌次数，并检查 `curseCardPool` / `srcCurseCardPool` 是否含本牌；输出 `PASS/FAIL noArgHits=… avoidHits=… poolsClean=…` 与样本 ID 片段。
- `awprobe` 帮助文本与 `SUBCOMMANDS`、`usage()` 同步。

### 2.4 涉及文件

| 文件 | 变更 |
| :--- | :--- |
| `src/main/java/anthonyswrath/cards/AnthonysWrathCurse.java` | 加 `@NoPools`；javadoc 增「Random curse sources（T027 / EC-010）」段 |
| `src/main/java/anthonyswrath/patches/vanilla/CardLibraryGetCursePatch.java` | **新建**：两个 `getCurse` 重载 postfix 重抽 + 重入标志 + 上限 |
| `src/main/java/anthonyswrath/patches/vanilla/package-info.java` | 增 US4 条目（及 US5 条目，随 030 落地） |
| `src/main/java/anthonyswrath/probe/AwProbeCommand.java` | 新增 `curseprobe`、`purgetest`（US5 用）、`defeatoff` / `defeaton`（T032）子命令与帮助 |
| `specs/001-anthonys-wrath/research.md` | §R-007 增 Correction 与 Implemented；§R-014 增 Per-run record；风险表同步 |
| `specs/001-anthonys-wrath/tasks.md` | T026 / T027 勾选并写入实现说明；T028 保持未勾选并指向 quickstart |
| `specs/001-anthonys-wrath/quickstart.md` | 新增 2026-10-29 US4 实测段（T028 五步） |

## 3. 本地验证（沙箱内可做的全部）

- JDK8 `javac -encoding UTF-8 -source 1.8 -target 1.8` 编译 `src/main/java` 全部 **20** 个源文件：**exit 0**（`target/classes-javac8-us4us5/`，target 已忽略）。
- 离线 MTS 补丁目标自检（`target/patchcheck/PatchCheck.java`，按 MTS 3.30.3 `Patcher` 语义复刻）：**checked=26 failed=0**。含 3 条新补丁目标（`CardLibrary.getCurse[]`、`CardLibrary.getCurse[AbstractCard, Random]`、`CardGroup.getPurgeableCards[]`、`FountainOfCurseRemoval.buttonEffect[int]`）与探针全部既有补丁；本轮顺带修正了自检脚本对 MTS 解析语义的四处理解：① 空 `paramtypez` 表示「恰好零参数」而非「按名匹配」，`{Void.class}` 才是按名匹配标记；② 按名匹配要求目标类只有 1 个同名方法；③ 只有 `@SpirePatch2` 的 postfix 能替换返回值（旧式 `@SpirePatch` 的返回值被忽略），且 `@SpirePatch2` 的 handler 参数按目标 LocalVariableTable 参数名匹配（见事实 f024）；④ 自检脚本已实现 `@SpirePatch2` 名称匹配并用负例验证：把两参 `getCurse` 的 handler 参数 `prohibitedCard` 改名为 `avoid` 应失败（实测 FAIL 符合预期）。
- `@NoPools` 反射检查（`target/patchcheck/NoPoolsCheck.java`）：`AnthonysWrathCurse @NoPools = true`，exit 0。
- 双语 key 一致性：`strings/anthonyswrath/{eng,zhs}/cards.json` 与 `{eng,zhs}/run_mods.json` 键集合逐一相等（各 1 个键）——T037 的机械核对本轮先做一半，完整版留 T037。
- **未做**：`mvn package`（沙箱 Maven 不可用，f008）、游戏内实测（T028，需用户普通终端构建并进游戏）。

## 4. 风险与判读注意

- `@NoPools` 只在「池重建之后」清池；而随机来源不读池，因此**两层缺一不可**。若 T028 的 `curseprobe` 仍出现命中，排查顺序：`@NoPools` 注解是否被 BaseMod 识别（池输出）→ `CardLibraryGetCursePatch` 是否被 MTS 应用（补丁自检 26/26 已离线确认目标存在）→ 是否其它 Mod 用反射直接读 `CardLibrary.curses`（本轮不涉及）。
- `curseprobe` 调用 `getCurse(avoid, rng)` 时以参照牌为 `avoid`、以 `AbstractDungeon.cardRandomRng` 为随机源，只验证「不会返回本牌」，不改变游戏内随机流（采样消耗的是探针主动调用的随机数）。
- `RunState.beginRun()` 之后，进程内**第一局 `StartGame` 之前** `isOptionSelected()` 为 false；目前没有任何组件在该窗口内工作（注入用更严格的现场判定），若后续新增组件需注意。

## 5. 下一步

- 用户重建 jar 后按 `quickstart.md` §4 的 2026-10-29 US4 段执行 **T028**；回传 `awprobe.log`。
- 本会话继续 US5（T029~T033）实现与离线自检，见 `memory/log/030`。
