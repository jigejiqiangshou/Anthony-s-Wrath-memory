# 015 — Phase 1 验收通过 + T004 时序探针就位

日期：2026-10-24（14:30–14:45）
状态：Phase 1 Checkpoint 通过；T004 探针代码就位并通过 JDK8 `javac` 编译；等用户进游戏采集探针数据。
依据：用户回报「A 推送完成 / B 完成项目构建 / C 完成游戏启动」；主 agent 逐项独立复核证据，未只采信回报。

## 1. 三项回报的核验

- **A 推送**：四仓 `git -c http.sslBackend=openssl ls-remote origin master` 与本地 HEAD 全等——top `132bd5c` / memory `c071217` / specs `6bdb595` / src `f1464b3`。本地工作区干净；复核期间 `libs/README.md`、`pom.xml` 出现的 `M` 为 f004 记录的 stat 虚警（`git hash-object` 与 `HEAD:<path>` blob 全等，`git add -A` 刷新后消失），未产生内容变更、未提交。
- **B 构建**：`target/anthonyswrath.jar`（3,385 B，2026-10-24 14:09:53）由 Maven 产出（同目录有 `maven-archiver/`、`generated-sources/`）。jar 内 `ModTheSpire.json` 的 `${...}` 占位符全部被资源过滤替换——`modid=anthonyswrath`、`version=0.1.0`、`sts_version=12-18-2022`、`mts_version=3.30.3`、`dependencies=[basemod, stslib]`；入口类 `anthonyswrath/AnthonysWrathMod.class` 在包内。
- **C 加载**：`sendToDevs/mts_process_launch.log`（14:27:56）Mod list 含 `- anthonyswrath (0.1.0)`；`Initializing mods...` 后出现 `- anthonyswrath.AnthonysWrathMod`；随后 `RESUME()` 进主菜单，菜单「Quit Game」后 `Clean shutdown successful`。日志里 `loadout.LoadoutMod` 与 log4j appender 的报错来自其它 mod 与退出阶段，与本 mod 无关，本 mod 无异常。

结论：T003 与 Phase 1 Checkpoint 达成（构建 + 加载双证据），已回填 `tasks.md`（T003 勾选、Checkpoint 行注明通过）。

## 2. T004 探针的前置事实

调查方式：只读子代理对 `libs/` 四个 jar 做 `javap -p -c/-v` 全量反汇编；主 agent 复核关键类并补查字段/方法签名。要点（过程产物不入库，结论用于写探针）：

- **洗牌原语只有两个**：`CardGroup#shuffle()` 与 `CardGroup#shuffle(com.megacrit.cardcrawl.random.Random)`。首次洗牌在 `AbstractPlayer#preBattlePrep → drawPile.initializeDeck(masterDeck)` 内对一个**临时** `CardGroup` 调 `shuffle(shuffleRng)`，再把牌逐张 `addToTop` 进 `player.drawPile`；耗尽重洗在 `EmptyDeckShuffleAction#update` 里对 `player.discardPile` 调 `shuffle(shuffleRng)`；非耗尽重洗走 `ShuffleAction#update`（`group.shuffle()`）与 `ShuffleAllAction#update`。→ 同时 patch 两个 shuffle 重载即覆盖全部洗牌路径。
- **取牌判定**：无单一共同判定点。普通抽牌（`AbstractPlayer#draw(int)`）与 `ShowCardAndAddToHandEffect` 共享 `CardGroup#addToHand`；`Secret Technique/Secret Weapon`（`SkillFromDeckToHandAction`/`AttackFromDeckToHandAction`）、`CardGroup#moveToHand`、`DrawPileToHandAction` 走 `hand.addToTop`。→ 探针同时记 `addToHand` 与 `addToTop`（仅当 `this == player.hand`）。
- **钩子时序**：`PostDungeonInitialize` = BaseMod patch `AbstractDungeon#initializeRelicList` 的 postfix。新档晚于 `initializeCardPools()`；**读档路径不触发**（`Exordium(Player, SaveFile)` 不调用 `initializeRelicList`）。`StartBattle` 插在 `AbstractRoom#update` 的 `applyStartOfCombatPreDrawLogic` 调用前 = 首次洗牌后、起手摸牌前。
- **参照牌判定点**：`CardGroup#getPurgeableCards()` 排除 `Necronomicurse`/`CurseOfTheBell`/`AscendersBane`；`AbstractDungeon#addCurseCards()` 另排除 `Pride`；`FountainOfCurseRemoval#buttonEffect` 硬编码跳过前两者；`AbstractPlayer#isCursed()` 同款。`AbstractDungeon#transformCard` 只把结果写入静态字段 `transformedCard`，删原牌由调用方完成。
- **「清空初始牌组」**：本体与 BaseMod 均**不存在**该自定义选项（本机 `localization/zhs/run_mods.json` 44 项无此文案；唯一含「初始牌组」的是 ID `Starter Deck`，行为是给「破碎金冠」+「Binary」）。断言必为第三方 mod 提供，具体 ID 未知 → 探针不依赖固定 ID，改为打印实际启用的自定义项（`AbstractPlayer.customMods` 与 `ModHelper.getEnabledModIDs()`）与各阶段牌组内容。
- **MTS patch API**：`@SpirePatch(clz=…, method=…, paramtypez=…)` + `@SpirePrefixPatch` / `@SpirePostfixPatch`；实例方法的 handler 第一参数为实例，其后为原方法参数；BaseMod 实测可 patch protected 方法（如 `initializeRelicList`）。

## 3. 探针实现（T004 代码就位）

新增 4 个文件，位于 `src/main/java/anthonyswrath/probe/`（T035 整体删除）：

| 文件 | 作用 |
| :-- | :-- |
| `ProbeLog.java` | 序号+时间戳日志，双写 MTS 控制台与 `%USERPROFILE%\awprobe.log`；卡组快照（含 index，0=顶）、tracked 牌位置、四堆尺寸、caller 栈、customMods/ModList |
| `TimingProbe.java` | `@SpireInitializer` 自注册；订阅 10 个 BaseMod 钩子（PostInitialize / PreStartGame / StartGame / StartAct / PostCreateStartingDeck / PostDungeonInitialize / StartBattle / PostBattle / PlayerTurnStart / PostDraw）；尝试启用 DevConsole 并注册 `awprobe` 命令 |
| `ProbePatches.java` | 13 组只读观测补丁：`shuffle()`/`shuffle(Random)`、`initializeDeck`、`preBattlePrep`、`initializeStarterDeck`、`addToHand`、`addToTop`、`getPurgeableCards`、`removeCard(AbstractCard)`/`removeCard(String)`、`FountainOfCurseRemoval.buttonEffect`、`initializeCardPools`、`transformCard(3 参)`、`EmptyDeckShuffleAction.update`、`draw(int)`；handler 只记日志、不改行为 |
| `AwProbeCommand.java` | 控制台命令 `awprobe info\|purge\|cursepool\|transform <cardID>\|addcard <cardID>\|shuffledeck` |

自测：JDK8 `javac`（四个 libs jar 为 classpath、`-encoding UTF-8 -source 1.8 -target 1.8`）exit 0，产出 20 个 class。正式打包仍由用户普通终端 `mvn package` 完成。

说明：R-013 的「临时关闭抽到即负」开关依赖判负逻辑（T021），将在 T021/T032 一并加入、T035 移除；本版 T004 不含，避免出现无意义的空开关。

## 4. 本轮本地提交（未推送）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `src` | 探针 4 文件 |
| 2 | `specs` | T003 勾选 + Phase 1 Checkpoint 回填、quickstart §3 探针流程 |
| 3 | `memory` | 本记录 + `state.json` |
| 4 | 顶层 | 推进 gitlink（src→`4ff5f7e`、specs→`ccbc03b`、memory→本轮） |

推送顺序 src → specs → memory → 顶层（顶层最后）。

## 5. 下一步（用户手动）

1. 推送本轮四仓提交。
2. `mvn package` 重新构建（探针随 jar 打包），将 `target/anthonyswrath.jar` 复制到游戏目录 `mods/`。
3. 按 `quickstart.md` §3 的 6 个采集场景跑一遍（日志自动写入 `%USERPROFILE%\awprobe.log`；控制台命令见 §3 文本）。
4. 把 `awprobe.log` 交回。收到后：结论回写 `research.md` §R-004～§R-008，勾选 T004，Phase 2 收尾，进入 US1（T007/T010/T011/T012）。

## 6. 未决

- 「清空初始牌组」的提供方与字符串 ID 待探针日志或用户告知确认；若本机实际没有该选项，需回头修正 spec EC-002 的假设。
- 探针日志量较大（每次抽牌 2–3 行），采集到「首次重洗 + 一次直接取牌 + 一次移除界面 + 一次变化」即可，不必打完整局。
