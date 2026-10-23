# 014 — 冷启动、BaseMod 接口名定案与四层本地提交

日期：2026-10-24（00:43 起）
状态：会话进行中；本条目记录「冷启动 → 接口实物核对 → 四层本地提交」一段，作为推送 / 构建 / 加载手动阶段的交接依据。
依据：冷启动读取 `.specify/memory/constitution.md`、`specs/001-anthonys-wrath/*`、`memory/state.json`、`memory/facts/INDEX.json` 与 4 条 `coldStart: true` 事实；未重做热状态已标为完成的步骤。

## 1. BaseMod 接口名定案（长期 blocker 解除）

用户消息仅引用 `AGENTS.md`、未给任务。按 `agent-dev-memory` 完成冷启动后与用户确认下一步：用户选择「先本地提交，然后给出手动操作清单，由用户推送并执行后回报」。

冷启动期间顺带解决热状态中挂着的 blocker「选项注册接口名是 `CustomModeMods` 还是 `AddCustomModeModsSubscriber`」。做法：对 `libs/BaseMod.jar` 实物执行 `jar tf` + `javap`，全程离线、不需要 wiki 或外网。结论：

- 实有 `basemod/interfaces/AddCustomModeModsSubscriber.class`，方法
  `receiveCustomModeMods(java.util.List<com.megacrit.cardcrawl.screens.custom.CustomMod>)`；
- 对应发布端 `BaseMod.publishAddCustomModeMods(List<CustomMod>)`；
- 全 jar 无 `CustomModeMods` 类，旧口径 `receiveAddCustomModeMods` 作废；
- 一并核实其余钩子签名：`EditCardsSubscriber.receiveEditCards()`、`EditStringsSubscriber.receiveEditStrings()`、
  `PostCreateStartingDeckSubscriber.receivePostCreateStartingDeck(AbstractPlayer.PlayerClass, CardGroup)`、
  `PostDungeonInitializeSubscriber.receivePostDungeonInitialize()`、`BaseMod.subscribe(ISubscriber)`；
- `com.megacrit.cardcrawl.screens.custom.CustomMod`（`desktop-1.0.jar` V2.3.4）构造器为
  `CustomMod(String ID, String name, boolean isDailyMod)`，公开字段含 `description` / `color`，可直接支撑 T007。

落点：`specs/001-anthonys-wrath/research.md` §R-003 已回写（Decision 行改用 `AddCustomModeModsSubscriber`，Open item 改为 Verified）；结论升入 `memory/facts/f009`（含 jar SHA256 与方法）；research 的参考证据列表已补 f009。

## 2. 提交前核对

- 三层待提交内容与 `state.json` 原 `git.intentionallyUncommitted` 一致：`src` 仅 `main/` 两个新文件，`specs` 仅 7 个功能文档，`memory` 为 state / 两个 INDEX / log / facts / deadends。
- 顶层 `.specify/` 的 15 个 `M` 标记：对 20 个受跟踪文件逐一比较 `git hash-object` 与 `git rev-parse HEAD:<path>`，**0 个真实内容差异**，判定为 f004 记录的 stat 虚警；未产生内容变更，未提交。
- `libs/*.jar`、`target/` 均被 `.gitignore`（`*.jar` / `target/`）排除，未进入任何提交。
- 远端基线（`git -c http.sslBackend=openssl ls-remote origin master`，只读可用）：顶层 `2d05095`、memory `952859e`、specs `c229437`、src `6f99259`；提交前四仓均 `ahead=1`（顶层 `cf232df`、memory `26a0234` 为上次会话遗留未推送提交）。

## 3. 本地提交（宪法九：先层、后顶层）

| 顺序 | 仓库 | 提交 | 内容 |
| :-- | :-- | :-- | :-- |
| 1 | `src` | `f1464b3` | 入口类 `AnthonysWrathMod.java` + jar 根 `ModTheSpire.json`（T003 代码与清单） |
| 2 | `specs` | `6bdb595` | analyze 两轮修复 + 四项路线决策 + R-003 接口名落实（7 文件） |
| 3 | `memory` | 本次新增（哈希以 `git -C memory log --oneline -1` 为准） | 本记录、`facts/f009`、更新 `facts/INDEX.json` 与 `state.json` |
| 4 | 顶层 | 本次新增（哈希以 `git log --oneline -1` 为准） | `pom.xml`、`libs/README.md`、推进三个 gitlink（src→`f1464b3` / specs→`6bdb595` / memory→本次） |

顶层提交前断言：`git ls-files -s specs memory src` 的三个 SHA 与各层 `git -C <layer> rev-parse HEAD` 全等（已在提交前执行）。

## 4. 手动阶段（交还用户，普通终端）

沙箱约束（facts f007 / f008）决定以下操作只能由用户在普通终端完成：

1. **推送四仓**：src → specs → memory → 顶层（顶层最后，保证 gitlink 指向的提交已在远端可解析）；推送前用 `git -C <repo> log --oneline origin/master..HEAD` 核对提交数与消息。
2. **Maven 构建**：`mvn -q package`（JAVA_HOME 指向 JDK 8），预期 `target/anthonyswrath.jar`；用 `jar tf` 核对 jar 内容。这是 T003 与 Phase 1 Checkpoint 的构建证据。
3. **加载验收**：把 jar 放入游戏目录 `mods/`，启动 ModTheSpire，确认 Mod list 含本 mod、加载日志无异常。这是 Phase 1「入口类可被加载」的证据。

三项结果回报后：回填 T003 与 Phase 1 Checkpoint，开始 T004 时序探针（探针代码可在沙箱内用 JDK 8 `javac` + 手工 jar 自测，游戏内时序数据仍需用户运行游戏采集）。
