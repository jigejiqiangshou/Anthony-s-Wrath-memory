# 030 — US5 实现（T029~T033）：不可移除拦截、净化之泉保护、移除入口静态枚举、FR-005 探针开关、文本定稿

日期：2026-10-29 01:0x 起（与 `memory/log/029` 同一会话）
状态：T029~T033 实现/定稿完成——JDK8 `javac` exit 0、离线 MTS 补丁目标自检 **26/26**；**T034 待用户实测**（步骤见 `specs/001-anthonys-wrath/quickstart.md` §4 的 2026-10-29 US5 段）。
依据：tasks.md Phase 7；R-008（不可移除的判定点）与 T004 枚举（f005 / f014）；T025 判读后本会话继续推进。

## 1. 判定点核对（V2.3.4 反汇编复核）

- `CardGroup.getPurgeableCards()`（`javap -p -c` 偏移 0–88）：对每个牌依次 `String.equals` 排除 `Necronomicurse` / `CurseOfTheBell` / `AscendersBane`，其余全部进候选——本体给参照牌做不可移除正是靠这里，故本牌在**同一方法**过滤即为「不加限制、不放宽」（FR-012）。
- `FountainOfCurseRemoval.buttonEffect(int)`（偏移 52–350）：不调用 `getPurgeableCards`，而是自建 `masterDeck.group` 从尾向头的循环；命中条件 = `type==CURSE` 且非 bottled 且 cardID 不是三张参照牌；命中后 `AbstractDungeon.effectList.add(new PurgeCardEffect(card))` → `metricList.add(cardID)` → `masterDeck.removeCard(card)`；循环后 `logMetricRemoveCards("Fountain of Cleansing", "Removed Curses", …)`。本牌会命中该循环（T020 的 `memory/log/026` 已实测到 `#159/#160` 删除本牌）。

## 2. 实现

### 2.1 T029 候选列表过滤 `patches/vanilla/CardGroupGetPurgeableCardsPatch.java`（新建）

- **`@SpirePatch2`**（不是旧式 `@SpirePatch`）的 **postfix 返回 `CardGroup`**：MTS 3.30.3 只有 `@SpirePatch2` 的参数映射器会设置 `PostfixPatchInfo.returnsValue` 并生成 `return ($r)…` 替换返回值；旧式 `@SpirePatch` 的非 void postfix 返回值被静默忽略。该模式按目标 LocalVariableTable 的参数名匹配 handler 参数（本补丁只有 `__result`，无目标参数）。机制与证据见事实 f024；离线自检对 "把参数改名" 做了负例测试（应 FAIL）。
- 逻辑：从 `__result.group` 尾部向前删除 cardID 命中的实例（含多副本），其它牌保持原顺序，返回同一 `CardGroup` 对象；`__result`/`group` 为空直接返回。
- 覆盖范围：21 个调用者（商店移除、Peace Pipe、Empty Cage、Astrolabe、Neow 的移除/变化奖励、Cleric / GoldenWing / BackToBasics / Beggar / DrugDealer / LivingWall / Bonfire / Designer / NoteForYourself / PurificationShrine / Transmogrifier / GremlinWheelGame / WeMeetAgain 等）；`Transmogrifier`/`Astrolabe` 的候选同样被过滤 ⇒ 与参照牌一致（参照牌也不进这些候选）。

### 2.2 T030 净化之泉括号保护 `patches/vanilla/FountainOfCurseRemovalPatch.java` + `run/CurseRemovalGuard.java`（新建）

- **否决「直接给 `CardGroup.removeCard` 加全局拦截」**：`removeCard(String)` 被 `AbstractDungeon.srcTransformCard` 用于变化流程，`removeCard(AbstractCard)` 被 Transmogrifier 等变化 UI 用于「移除后换新牌」；全局拦截会让本牌变化后不被移除而**复制**，违反 EC-003（参照牌可被变化）。
- 采用 bracket：`buttonEffect(int)` 的 prefix 调 `CurseRemovalGuard.suspendFromMasterDeck()`（把全部本牌从 masterDeck 取出并记住原索引），postfix 调 `restoreToMasterDeck()`（按原索引升序插回）。循环期间本牌不在 masterDeck，因此：
  - 不被删除；
  - 不产生 `PurgeCardEffect`（不会出现「被净化」的视觉）；
  - 不进事件 metric 列表（`Removed Curses`）；
  - 与三张硬编码参照牌在本方法中的最终效果一致。
- 括号对 `buttonEffect` 的所有分支（清除 / 拒绝 / 离开）都生效：其它分支不读 masterDeck，临时缺席不可观察；`suspended` 标志防重入、`finally` 清空簿记，保证不会把旧数据插回。
- 待办提醒：`patch.fountain.before/after`（探针）与本补丁 prefix/postfix 的先后由 MTS 决定，T034 判读以事件结束后的 `awprobe info` / `awprobe purgetest` 输出为准（已写进 quickstart）。

### 2.3 T031 其余移除入口：静态枚举（结论 = 无需额外补丁）

对 `desktop-1.0.jar` 全库 7038 个 class 做常量池扫描（同时含 `masterDeck` 与 `removeCard` 的类 **25** 个），再逐类 `javap -p -c` 归并「调用点 → 所在方法 → 是否候选列表」：

| 类别 | 类 / 方法 | 结论 |
| :--- | :--- | :--- |
| 候选 → 删除 | `ShopScreen.purchasePurge` + `ShopRoom.updatePurge`、`CampfireTokeEffect.update`（Peace Pipe）、`EmptyCage.onEquip/deleteCards`、`Astrolabe.onEquip/giveCards`、`NeowReward.activate` 的移除/变化奖励、`Cleric` / `GoldenWing.purgeLogic` / `BackToBasics.update` / `Beggar.update` / `DrugDealer.update` / `LivingWall.update` / `Bonfire.update` / `Designer.update` / `NoteForYourself.update` / `PurificationShrine.update` / `Transmogrifier.update` / `GremlinWheelGame.purgeLogic` / `WeMeetAgain` 的 relic 交换 | 全部先取 `getPurgeableCards()` 作为网格候选 ⇒ 已被 **T029** 覆盖 |
| 自建循环 | `FountainOfCurseRemoval.buttonEffect` | 已被 **T030** 覆盖 |
| 本体按类型/稀有度筛选（诅咒不在范围） | `Falling.buttonEffect`（`CardHelper.returnCardOfType` 只生成 ATTACK/SKILL/POWER 三选一）、`WeMeetAgain.getRandomNonBasicCard`（排除 BASIC 与 CURSE）、`Vampires.replaceAttacks`（只删 Strikes） | 无需补丁 |
| 变化路径（EC-003 要求不得拦截） | `AbstractDungeon.srcTransformCard` 的 3 处 `CardGroup.removeCard(String)` | 不得补丁（参照牌可被变化，结果只会是其它随机诅咒；本牌同样） |
| 战斗内手牌移除 | `AbstractPlayer.useCard` 的 `CardGroup.removeCard` | 只作用于手牌，不是牌组移除，无关 |
| 其它 | `CardGroup.removeCard` 自身 / `moveToHand` 内部调用 | 基础原语，无独立入口 |

结论：拦截点恰好两个（T029 + T030），与参照牌的不可移除判定点同批，不多不少；T031 以「枚举完成 + 结论无需补丁」关闭，枚举表同时写入 `research.md` §R-008 Implemented。

### 2.4 T032 FR-005 对照开关（开发期专用）

- `RunState`：`defeatSuspendedForProbe` 字段 + `isDefeatSuspendedForProbe()` / `setDefeatSuspendedForProbe(boolean)`；`DefeatOnDraw.onCurseEnteredHand` 在卡牌判定后、选中态判定前检查开关，打开时直接返回（本牌留在手中）。
- `AwProbeCommand`：`awprobe defeatoff` / `awprobe defeaton` 切换并写 `cmd.defeatoff` / `cmd.defeaton` 日志。
- 发布洁净：开关与命令**只服务于探针构建**，由 T035 与 `probe/` 一并删除；发布版没有关闭判负的入口。

### 2.5 T033 文本定稿核对

- 从本体 jar 的 `localization/eng/cards.json` / `localization/zhs/cards.json` 读取参照牌 `CurseOfTheBell`：
  - 英文 `Unplayable. NL Cannot be removed from your deck.`；
  - 中文 ` 不能被打出 。 NL 不能从牌组中移除。`（原文在关键词两侧带空格，属本体本地化格式）。
- 本 mod 文本：英文与参照逐字一致；中文「不能被打出。 NL 不能从牌组中移除。」用词一致、无关键词样式或颜色标记（` FR-013 `、QS-13），保留更干净的空格写法，不引入关键词标记。两份 `cards.json` / `run_mods.json` 的 key 集合离线核对一一对应（各 1 键）。

## 3. 涉及文件

| 文件 | 变更 |
| :--- | :--- |
| `src/main/java/anthonyswrath/patches/vanilla/CardGroupGetPurgeableCardsPatch.java` | **新建**（T029） |
| `src/main/java/anthonyswrath/patches/vanilla/FountainOfCurseRemovalPatch.java` | **新建**（T030，prefix/postfix 括号） |
| `src/main/java/anthonyswrath/run/CurseRemovalGuard.java` | **新建**（T030，suspend / restore + 索引保持） |
| `src/main/java/anthonyswrath/patches/vanilla/package-info.java` | 增 US5 条目与 T031 枚举结论 |
| `src/main/java/anthonyswrath/run/RunState.java` | T032 开关字段与方法 |
| `src/main/java/anthonyswrath/run/DefeatOnDraw.java` | T032 开关短路 |
| `src/main/java/anthonyswrath/probe/AwProbeCommand.java` | `purgetest`（T029/T034 自检）、`defeatoff` / `defeaton`（T032） |
| `specs/001-anthonys-wrath/research.md` | §R-008 Implemented（拦截点 + 枚举表）、§R-013 Implemented（T032）、风险表同步 |
| `specs/001-anthonys-wrath/tasks.md` | T029~T033 勾选并写入说明；T034 保持未勾选并指向 quickstart |
| `specs/001-anthonys-wrath/quickstart.md` | 新增 2026-10-29 US5 实测段（T034 四步） |

## 4. 本地验证

- JDK8 `javac` 全量编译 **20** 个源文件 exit 0（与 log/029 同一次编译，`target/classes-javac8-us4us5/`）。
- 离线 MTS 补丁目标自检 **checked=26 failed=0**：新增目标 `CardGroup.getPurgeableCards[]`（postfix 返回 `CardGroup`，形状校验通过）、`FountainOfCurseRemoval.buttonEffect[int]`（prefix+postfix，protected 方法，形状校验通过）；`CardLibrary.getCurse[]` / `getCurse[AbstractCard, Random]` 亦命中。
- 双语 key 一致性 PASS（见 log/029 §3）。
- **未做**：`mvn package`（f008）、游戏内实测（T034，需用户构建后进游戏）。

## 5. 风险与判读注意

- 净化之泉的括号保护若在某次游戏中未见效，先查两点：① `FountainOfCurseRemovalPatch` 是否加载（`jar tf` 看类是否入包、MTS 日志是否有 patch 异常）；② prefix/postfix 是否都执行（漏 postfix 会导致本牌从 masterDeck **消失**——事件结束后 `awprobe info` 的 masterDeck 缺本牌即此故障）。离线自检已验证目标解析，剩余风险在运行期。
- `purgetest` 只在牌组确实含本牌时给出 PASS/FAIL；不含本牌时输出 SKIP（避免把未勾选局误判为失败）。
- Transmogrifier / Astrolabe 等变化 UI 的候选过滤是 T029 的副作用，与参照牌一致；EC-003 的「可被变化」验证走控制台 `awprobe transform`（它直接调用 `AbstractDungeon.transformCard`，不经候选列表），T034 第 3 步覆盖。

## 6. 下一步

- 用户重建 jar 后按 `quickstart.md` §4 的 2026-10-29 US5 段执行 **T034**（QS-11 / QS-12 / QS-13），回传 `awprobe.log`；通过后 US5 Checkpoint 成立。
- 之后进入 Phase 8：T035（删除探针与 T032 开关）、T036（替换占位图）、T037（完整 key 比对与字符串字面量检查）、T038（构建/加载验收）、T039/T040（验证机制与三层锁定）、T041（QS-01~QS-17 完整回归，含 QS-14 卸载与 QS-01 中文选项文案）。
