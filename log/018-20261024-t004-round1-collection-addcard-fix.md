# 018 — T004 第一轮游戏内采集：时序结论、addcard 控制台事故与探针修复

日期：2026-10-24 15:52–16:18
状态：用户交回 `awprobe.log`（654 行）后完成分析；R-004 / R-005 / R-006 / R-007 的时序部分已回写 `research.md`，R-008 场景 5/6 仍缺；探针修复与补采设计完成，等用户重建后补采。四层本地提交完成（未推送）。

## 1. 输入与前提复核

- 用户报告：进入会话前已完成提交推送；自定义模式选 Draft 与不选各开一局，抽空牌库并洗牌，加入 Secret Technique 并检索一次；`awprobe addcard CurseOfTheBell` 失败（日志实参为 `cursepool`），后续场景 5/6 未做。
- 主 agent 复核：四仓本地与 `origin/master` 齐平（src `37b7ddb`、specs `617d58f`、memory `e888f11`、顶层 `25c0642`），工作树干净，`git status` 无未提交项。
- 部署：`target/anthonyswrath.jar` 29698 B（15:21:01）与游戏 `mods/` 下同名文件一致；日志有 `probe.console` 注册记录，探针与命令通道正常。
- 输入文件：`C:\Users\Zhaoji\.dsh\attachments\v1\files\66\662a9298…\awprobe.log`（原件在 `C:\Users\Zhaoji\awprobe.log`）。

## 2. 日志结构

- 1 次启动、4 次开局事件、**6 场战斗**（仅 3 场有 `PostBattle`）、16 次 `PlayerTurnStart`、561 条 AWP 记录 + 93 条续行。
- 局1：新档 Draft（`customMods=[Draft]`，15:52:31）；局2：新档普通（`customMods=[]`，15:53:00）；局3/局4：**读档**（15:54:52 `floor=2`、15:56:05 `floor=3`，均无 `initializeStarterDeck`，牌组沿用存档且局4 含局3 中途获得的 Secret Technique）。
- 关键计数：`shuffle(Random)` 10 次 = 6 首洗 + 4 耗尽重洗；`emptyDeckShuffle` 46 条 = 4 次真洗 + 逐张搬运；`addToHand` 86 = 80 抽牌 + 6 临时牌；`addToTop(hand)` 12 = 10 Retain + 2 取牌；`removeCard(obj)` 32 = 30 打出 + 2 取牌；`getPurgeableCards` / `fountain` / `transformCard` / `removeCard(id)` / 无参 `shuffle()` 全部 **0 次**。

## 3. 已可结论的时序事实（已回写 research）

### R-004 置底介入点

- 首洗 6 次：`CardGroup.shuffle <- initializeDeck:1031 <- preBattlePrep:1982`，作用对象是 `initializeDeck` 新建的**临时 DRAW_PILE 组**（`other(type=DRAW_PILE)`），此时 `player.drawPile` 为空；随后按洗后顺序填入。
- 耗尽重洗 4 次：`shuffle <- EmptyDeckShuffleAction.update:49`，先洗 `player.discardPile`；该 action 第一次 update 洗牌，之后每次 `update()` 只搬 1 张（洗后索引 0→尾），抽牌堆最终顺序与洗后弃牌堆逐张一致（B2/B6 两次核对）。
- `StartBattle` 在首洗后、起手摸牌前；中途重洗发生在 `PlayerTurnStart` 之后数秒 ⇒ 钩子不能作唯一介入点。
- **抽牌方向修正**：`CardGroup.addToTop` = 追加到列表末尾、`addToBottom` = 插入索引 0、`getTopCard` = `group.get(size-1)`；日志 10/10 次「dump 末位先被抽走」⇒ **drawPile 索引 0 = 底部（最后抽到），末位 = 下一次抽到**。`ProbeLog.ids()` 原注释「index 0 = top」错误，已改。

### R-005 入手判定点

- 普通抽牌 80 次：`addToHand <- AbstractPlayer.draw:2071 <- draw:2098 <- DrawCardAction.update:146`，并触发 `PostDraw`。
- 临时牌 6 次：`addToHand <- ShowCardAndAddToHandEffect.<init>:67 <- MakeTempCardInHandAction.addToHand:102`，不触发 PostDraw。
- 「搜寻」取牌 2 次：只有 `removeCard(drawPile) <- SkillFromDeckToHandAction.update:54/:78` + `addToTop(hand) <- ...:55/:79`，**完全绕过 addToHand / PostDraw / draw(int)**。
- Retain 回手 10 次：`addToTop(hand) <- RestoreRetainedCardsAction.update:26`（须按 cardID 过滤）。
- 结论：两个判定点（addToHand + addToTop(hand)），不能共用。

### R-006 开局注入时机

- Draft 局：`initializeStarterDeck`(before/after)、`PostCreateStartingDeck`、`StartGame`、`StartAct`、`PostDungeonInitialize` 看到的 masterDeck 全为 **0**；填充发生在 `PostDungeonInitialize` 之后、首战 `preBattlePrep` 之前（窗口 11.295 s）；首战 15 张全为 Draft 牌。
- 该钩子比首洗早 11.3 s，「早于第一次洗牌」成立；普通局对照为 10 张。
- 读档路径不触发 `initializeStarterDeck` / `PostCreateStartingDeck` ⇒ 注入器不会重复加牌。
- 未闭合：注入牌是否被 Draft 填充清除（新增哨兵注入实验补验）。

### R-007 诅咒池排除落点（决策变更）

- `initializeCardPools` 4 次（含 2 次读档）全部执行且池均稳定为 10 张原版诅咒；新档 `PostDungeonInitialize` 晚 10–43 ms；**读档路径 `PostDungeonInitialize` 0 次**。
- `StartGame` 在新档与读档都触发，且都晚于池重建 ⇒ 改用 `StartGameSubscriber`；`PostDungeonInitialize` 不可作唯一落点。

### R-008 未覆盖

- 场景 5（商店/休息点/净化之泉）与场景 6（transform）均未跑；`getPurgeableCards` / `fountain` / `transformCard` / `removeCard(String)` 全 0 次，`CurseOfTheBell` 从未进入牌组。拦截清单仍以 `memory/facts/f005` 为准。

## 4. addcard 事故根因与修复

**根因**（子代理反汇编 + 主 agent 复核）：BaseMod 5.56 新增 `basemod.AutoComplete`；Tab(61)/→(22) 调 `fillInSuggestion()`，用 `extraOptions()` 的候选取代「最后一个空格后的当前词」并补空格。两个关键事实：①`ConsoleCommand.autocomplete` 过滤候选用 `tokens[tokens.length-1]` 前缀（不是 `tokens[depth]`）；②`extraOptions(tokens, depth)` 的 `depth` 对 `awprobe` 恒为 1（无 followup 注册）。旧 `extraOptions` 无视 depth 恒返回 6 个子命令，于是 `awprobe addcard C|Cu|Cur…` + Tab 时唯一候选 `cursepool` 被整词填入；若 Tab 后继续输入，残余字符落到 tokens[3]，命令只读 tokens[2] ⇒ 日志 `unknown cardID: cursepool`。Enter 不采用候选（`onKeyUp` 直接执行 currentText）。`CardLibrary.getCard` 是大小写敏感 `HashMap.get`，`CurseOfTheBell` 已注册、`getCard("CurseOfTheBell")` 非 null。

**修复（src）**：

- `AwProbeCommand`
  - `extraOptions` 分层：子命令位返回子命令；`addcard` 参数位返回 `ConsoleCommand.getCardOptions()`；`transform` 参数位返回 `getCardOptionsFromCardGroup(masterDeck)`；空前缀不给候选，避免误填；
  - 卡 ID 大小写不敏感 + `bell` 别名 + `CurseOfTheBell` 直接实例兜底；未知 ID 打印匹配列表与 cursePool；
  - 新增 `bell`、`find <text>` 子命令；transform 找不到牌时提示 addcard 用法；
  - 每条命令记录 `cmd.raw`（depth + tokens），下一次控制台异常可直接定位。
- `TimingProbe`
  - `PreStartGame` 文案改为「run start/continue + floor」（读档也触发，旧文案误导）；
  - R-006 哨兵注入实验：`%USERPROFILE%\awprobe.inject` 存在时，在 `PostCreateStartingDeck` 注入一张 AscendersBane、删除哨兵并记 `probe.inject`；
  - 命令注册日志更新。
- `ProbePatches`：新增 `addToBottom(hand)` 观测（补全 R-005 的第三条进手路径观测）。
- `ProbeLog`：`ids()` 注释纠正为「索引 0 = 底部」。

**离线自检**：

- JDK8 `javac` 全量编译 `src/main/java` → exit 0（21 个 class，产物在 `target/verify-classes`，已清理）；
- SpirePatch 自检 16/16 OK（新增 `AddToBottom`；`{void}` 视为无参；`TransformCard` 的无 `__instance` 形式已接受）；
- `CommandCheck`：子命令位 / 参数位 / 空前缀 / 大小写 / 别名 / 未知 ID / trap 前缀 `c,cu,cur,curse,cursep` 全部通过（`COMMAND CHECK ALL OK`）；transform 建议依赖运行中的 `AbstractDungeon`，离线跳过并记录。
- 说明：部署 jar **未重建**（沙箱 Maven 不可用，f008），需用户普通终端 `mvn package` 后复制。

## 5. 文档回写

- `research.md`：R-003 订阅改 `StartGameSubscriber`；R-004/R-005/R-006/R-007 改为实测 + Decision/Remaining；R-008 加 Status（未覆盖）；风险与兜底、参考证据更新（f010/f011/log 018）。
- `quickstart.md`：§3 问题 6 改写；探针命令表（bell / find）、Tab 补全注意、drawPile 索引方向；采集场景新增 7（R-006 哨兵实验）与 8（读档路径），场景 4/5 补充。
- `tasks.md`：T004 追加第二轮状态；T012 加存活前置；T022 改为两个判定点；T027 改为 StartGame 钩子。
- `plan.md`：Summary 的诅咒池落点改为 StartGame 钩子。
- 未改 `spec.md` / `data-model.md`（不含对应钩子口径）。

## 6. 本轮提交（未推送）

| 层 | 内容 |
| :-- | :-- |
| `src` | 探针修复 4 文件（AwProbeCommand / TimingProbe / ProbePatches / ProbeLog） |
| `specs` | research / quickstart / tasks / plan 四文件 |
| `memory` | 本记录 + f010 / f011 / f012 + e003 + state.json |
| 顶层 | 推进 gitlink（src / specs / memory） |

推送顺序 src → specs → memory → 顶层；沙箱推送不可用（f007），交用户普通终端。

## 7. 下一轮补采清单（交回 awprobe.log 即闭合 T004）

1. 普通终端 `mvn -q package`，把 `target/anthonyswrath.jar` 复制到游戏 `mods/`，启动；
2. 场景 4 补：用「搜寻」效果从**弃牌堆**取一次牌（抽牌堆已覆盖）；控制台 `awprobe shuffledeck`（无参洗牌原语）；
3. 场景 5：`awprobe bell` → `awprobe info` / `awprobe purge` → 商店或休息点移除一次（可达时）→ 净化之泉（遇到事件时）；
4. 场景 6：`awprobe transform bell`（预期 `transformedCard` 不是 CurseOfTheBell：`getCurse()` 与 cursePool 均排除它）；
5. 场景 7：`New-Item -ItemType File -Path "$env:USERPROFILE\awprobe.inject" -Force` 后开一局新档 Draft → 看 `probe.inject` 与 `StartGame` / `PostDungeonInitialize` / 首战 `preBattlePrep` 的 masterDeck；
6. 场景 8：任意局中途存档 → 退出 → 继续，观察 `initializeCardPools` 触发而 `PostDungeonInitialize` 不触发；
7. 若控制台仍异常：改用 `deck add CurseOfTheBell` 兜底（语义差异会体现在日志里）。
收到日志后：回写 R-004/R-005/R-006/R-008 剩余项 → 勾 T004 → Phase 2 收尾（T005/T006）→ US1。

## 8. 未决与风险

- R-004「非耗尽重洗」本体是否存在仍未确认（本轮 0 次）；多副本成组置底只能等本牌注册后验证。
- R-006 注入存活决定 T012 落点；若 Draft 填充会清空牌组，备选为 `preBattlePrep` 前缀 + 一次性守卫（需实测）。
- R-007 读档缺口需在 T027 落地后用真实本牌复测。
- 子代理（日志分析 / BaseMod 反汇编）全程只读，结论已并入本记录，未直接写 memory。
- 沙箱限制未变：Maven 不可用（f008）、推送不可用（f007）、git submodule 系列不可用（f001）。
