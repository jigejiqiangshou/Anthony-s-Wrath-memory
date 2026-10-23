# 012 — C1 前置查明（实际已完成）+ analyze 第二轮 HIGH 修复

日期：2026-10-23
状态：specs 层修复已落盘（未提交）；memory 同轮更新（本文件 + state，未提交）
依据：用户本轮指示「C1 掉 subagent 调查，若仅是文档信息缺失则自行修复」；上一轮 analyze 报告（会话内）与 `memory/log/009` 的 F-018 结论。

> 用户消息里的 C2/C3 按上下文理解为上一轮详解的 HIGH-2（F1）与 HIGH-3（F2）；报告表中的 MEDIUM C2/C3（选项说明文本 FR、负面前缀任务）本轮未动。

## 1. C1 调查结论：运行期前置**已经完成**，丢的只是 plan/tasks 的表述（结论 A）

调查方式：subagent 只读调查 + 主 agent 现场复核（Steam 库配置、创意工坊目录、启动器/加载日志、git 删除记录）。**全程未安装、未启动游戏、未改任何文件。**

决定性证据（2026-10-04 有整局实跑）：

- `C:\Program Files (x86)\Steam\steamapps\common\SlayTheSpire\sendToDevs\mts_process_launch.log`（415,254 B，2026-10-04 21:56:26）：第 87 行 `Got 14 workshop items`；第 88–99 行 `Version Info:` 含 `ModTheSpire (3.30.3)`，Mod list 含 `basemod (5.56.0)`、`stslib (2.12.0)`；第 121–133 行 `Initializing mods... - BaseMod` 与 BaseMod 初始化输出。
- `...\SlayTheSpire\sendToDevs\mts_launcher.log`（GBK，2026-10-04 20:11:25）：`ModTheSpire appears to be installed.` → `Executing jar from: ...\workshop\content\646570\1605060445\ModTheSpire.jar` → `Successfully launched Mod the Spire!`。
- `...\SlayTheSpire\sendToDevs\logs\SlayTheSpire.log`：`basemod.BaseMod> initialize*`，mintySpire `Detected StSLib`；另有 2026-10-04 21:55 一局通关 metrics（12 个 mod 在列）。
- 工坊订阅清单：`C:\Program Files (x86)\Steam\steamapps\workshop\appworkshop_646570.acf`，`WorkshopItemsInstalled` 含 `1605060445`（ModTheSpire）/ `1605833019`（BaseMod）/ `1609158507`（StSLib）；jar 实际位于 `...\workshop\content\646570\<id>\`。
- 游戏本体：`C:\Program Files (x86)\Steam\steamapps\common\SlayTheSpire`（目录名**无空格**），`appmanifest_646570.acf` 显示已安装、LastPlayed 2026-10-04。游戏根目录**没有也不需要 `mods\`**——本机是创意工坊安装模式。
- 迁移是否删过开工条件文件：**没有**。顶层迁移仅删 `.speckit/constitution.md`（旧 `.speckit/` 只有这一个文件，无安装条款）与 `.dsh/skills` 示例；memory 仅删已冻结的 `log/check-artifacts.mjs`；specs 零删除。内容是 `c229437` 用模板重新生成 plan/tasks 时没带上归档里的前置段落（归档 `specs/_archive/001-anthonys-wrath/plan.md` 第 8 行、旧 `tasks.md` T002/T004 原文仍在）。
- 旧记录为何相反：`memory/log/009`（2026-10-16）称「整个 Steam 目录搜不到 BaseMod*.jar」，系搜索范围漏了 `steamapps\workshop`；`state.json` 的「BaseMod / StSLib 未安装」blocker 已失实，本轮删除。

## 2. 本轮修复

### 2.1 HIGH-2（F1）：US4 与 US1 的选项可见性矛盾

- `specs/001-anthonys-wrath/spec.md`：US4 故事行改为「选项保持可见但未被勾选、对局零影响」；US4 验收场景重排为 1–5（新增「标准模式 / 每日挑战不出现该选项」独立场景）。
- `specs/001-anthonys-wrath/quickstart.md`：QS-10 预期补「自定义模式列表可见但未勾选；标准 / 每日不出现该选项」。

### 2.2 HIGH-3（F2）：QS-08 越界到 US2

- `quickstart.md`：QS-08 预期删除「首次洗牌后位于最底部」（该断言属 US2），注明由 QS-03 覆盖；QS-03 预期补「含清空初始牌组的空开局情况」。
- `tasks.md`：T015 改为「空开局牌组注入（QS-08，仅验加入与时机）」；T020 改为「首次洗牌置底（QS-03，含空开局牌组）」。

### 2.3 C1（文档层）：恢复并修正运行期前置

- `plan.md`：Technical Context 增加「运行期前置（一次性人工准备，T004 起共用）」段——Steam 创意工坊订阅 **或** 手动放入 `mods/` 双路径；判据为启动日志 Mod list 中 `basemod` 与 `stslib` 同时出现且 BaseMod 完成初始化；证据记入 `memory/log/`；本仓库不提交 jar；未完成则 T004 与全部游戏内实测不可执行。
- `tasks.md`：T004 正文开头加**前置**（双路径 + 日志判据 + 证据入 `memory/log/`，作为任务可执行判据）；`Dependencies & Execution Order → Phase Dependencies` 增加跨故事运行期前置约束（T004/T015/T020/T025/T028/T034/T038/T041）。
- `quickstart.md`：§1 运行期前置改为双路径 + 日志判据；§2 步骤 3 补「`mods/` 不存在则新建（创意工坊下本地 mod 仍从该目录加载）」。

## 3. 复核

- 四个文件均按 blob 哈希确认内容变化（`git -C specs hash-object` vs `git rev-parse HEAD:<path>`）：`spec.md`、`plan.md`、`tasks.md`、`quickstart.md`。
- `Select-String` 复核：plan/tasks/quickstart 均含「运行期前置」；T004 含前置；QS-08 不含「最底部」；QS-03 含空开局说明；spec US4 AS 为 1–5。
- 本轮未改游戏目录、未安装、未启动游戏；subagent 全程只读。

## 4. 未处理 / 下一步

- 未处理：F3（T006 `[P]` 与 T004 依赖）、F4/F5（plan Summary / Storage）、F1 之外的 MEDIUM/LOW，以及 F11 计数漂移（checklist 18→16、假设 17→16、`[P]` 13→11 的表述；本轮已把 state 的假设数改为 16、tasks 的 `[P]` 改为任务级 11）。
- 提交：specs 与 memory 改动均未提交；提交顺序恒为 specs → memory → 顶层，推送需普通终端（`facts/f007`）。
- 实现：按 `tasks.md` 从 T001 开工；实现前先跑 T004 时序探针（本文件即前置证据）；T008/T011 前对照 BaseMod jar 实物确认 `CustomModeMods` / `AddCustomModeModsSubscriber` 并回写 `research.md` §R-003。

## 5. 文档修复批次（2026-10-24 00:11）

用户指示「剩余问题若只涉及文档打磨则全部修复」。本轮对纯文档类问题批量落盘（7 个规格文件全部变更）：

- `spec.md`：FR-012/FR-013 去重（文本呈现归 FR-013）；**新增 FR-014**（选项双语显示名 + 勾选前可见的效果说明）；「洗牌」定义补「卡牌/遗物触发的非耗尽重洗」；EC-009 改为「不得出现在候选目标；若仍列出必须拒绝」；FR-001/EC-006 统一「本 mod 未加载（卸载或禁用）」；「取得该牌」假设改为引用式；OQ-005 引用改为 FR-014。
- `plan.md`：Summary 的随机诅咒池改为「钩子优先、补丁兜底」；Storage 改「开局或读档时以存档恢复后的列表为准」；Constraints 统一未加载表述；目录树删除「本步骤不创建」陈旧注记。
- `tasks.md`：T004 引用改「R-004～R-008 与 quickstart §3」并加「回写 research §R-008」；T006 只建骨架（[P] 不再依赖 T004）；T009 加「负面前缀比对」步骤与 FR-014；T013 描述初版、T033 定稿覆盖；T014/T015 未加载表述；T015/T020/T025/T041 同步 FR-014 与 QS-16/17；Parallel Opportunities 同步。
- `quickstart.md`：QS-01 映射改 FR-014；QS-05 允许自然复制来源；QS-14 未加载表述；新增 QS-16（EC-005 主动放弃）与 QS-17（第二场战斗重新置底）；§6 范围改 QS-01～17。
- `research.md`：R-005 引用 EC-004/010 → EC-004 与 FR-010。
- `data-model.md`：`description` 映射 FR-014；`selectedThisRun` 明确为来源说明、`RunState.selectedOption` 为唯一状态源；`defeated` / `defeatGuard` 角色分工；`copies` 去掉「只出现在测试手段」断言；需求收束表去重。
- `checklists/requirements.md`：计数修正为 **16 项通过、14 FR、5 SC、11 EC、16 假设（11+5）**，注明修复批次复核。

复核：FR=14 / SC=5 / EC=11 / US=5 / 假设=16；tasks=41、任务级 `[P]`=11、QS=17；旧短语（18 项、17 条、13 FR、QS-01～15、EC-004/010、多副本只出现、本步骤不创建、OQ-005 结论）零命中。

## 6. 留待用户决策的技术路线项（本轮未改）

- **DEC-1（原 C4）**：EC-006「本 mod 未加载时读旧档不崩溃」的容错责任边界——由本体/BaseMod 提供（QS-14 只作验证），还是需要 mod 侧额外措施/回到 clarify 改需求；环境已就绪，可在实现前实测确认。
- **DEC-2（原 C5）**：FR-005 与 QS-12 的验证路线——本牌入手即判负、无法停留在手牌，选「参照牌行为对照 + 不可达论证」（文档/QA）还是「探针版临时关闭判负再验证」（临时分支）。
- **DEC-3（原 B2）**：FR-009「玩家能明确知道本局因抽到该牌而失败」——降为可观察判据（失败结算 + 记录），或增加显式提示文案（属增量 feature，需追加字符串与任务）。
- **DEC-4（原 D1）**：宪法一「依赖边界」与平台 jar 的口径——推荐在 plan/pom 明确游戏本体与 ModTheSpire 为 provided/compileOnly 平台产物（不需改宪法）；若认为原则本身要改，另起显式宪法修订。

## 7. 用户决策落地 + 实施启动（2026-10-24 00:24）

用户裁定：DEC-1(a)、DEC-2(b)、DEC-3(a)、DEC-4(a)，并指示「开始实施」。

**决策落地（规格层，不含宪法修订）**

- DEC-3(a)：`spec.md` FR-009 改为「展示失败结算 + 记入失败；失败流程走本体，不要求界面额外说明原因」；quickstart QS-06 同步。
- DEC-1(a)：`research.md` 新增 R-012（未加载容错由本体/BaseMod 提供，QS-14 只验证，崩溃则回 clarify）；tasks T014 改为容错路线 a；plan 宪法四行与 quickstart QS-14 同步。
- DEC-2(b)：`research.md` 新增 R-013（探针版临时关闭判负验证 FR-005）；tasks T032/T034/T035、quickstart §3 与 QS-12 同步。
- DEC-4(a)：plan Primary Dependencies / Constraints / 宪法一行、research R-002、tasks T001 注明游戏本体与 ModTheSpire 为 provided/compileOnly 平台产物；宪法未改。

**实施 Phase 1（T001/T002 完成；T003 代码就位、构建验证待补）**

- T001 `pom.xml`（顶层）：Java 8；`sourceDirectory` / `resources` 指向 `src/`；properties：`modId=anthonyswrath`、`javaPackage=anthonyswrath`、`sts.version=12-18-2022`、`mts.version=3.30.3`、`basemod.version=5.56.0`、`stslib.version=2.12.0`；四个 `system` scope 依赖指向 `libs/`；ModTheSpire.json 走资源过滤；`finalName=anthonyswrath`。
- T002 `libs/`：从本机游戏/工坊复制 `desktop-1.0.jar`（365,086,855 B）、`ModTheSpire.jar`（10,252,951 B）、`BaseMod.jar`（7,659,408 B）、`StSLib.jar`（684,198 B）；新增 `libs/README.md`；`git check-ignore` 命中 `*.jar`，`git ls-files "*.jar"` 为空。
- T003（部分）：`src/main/java/anthonyswrath/AnthonysWrathMod.java`（`@SpireInitializer` + `BaseMod.subscribe(this)`，implements `ISubscriber`）；`src/main/resources/ModTheSpire.json`（modid / version / sts_version / mts_version / dependencies 以 Maven 过滤占位）。
- 验证：JDK8 `javac` 编译入口类通过；`mvn -o validate` 通过；手工过滤 + `jar` 得到结构 `ModTheSpire.json` + `anthonyswrath/AnthonysWrathMod.class`（仅结构验证）。
- **构建阻塞（环境）**：沙箱内 `mvn package` 不可用——`~/.m2/repository` 为空且 Maven Central / 阿里云均不可达（curl、IWR 均失败），`mvn -o package` 报 `maven-resources-plugin:3.2.0` 无法解析。Phase 1「构建可产 jar」需在普通终端联网执行 `mvn -q package`（或提供离线仓库）后回填。
- 未提交：顶层 `pom.xml`、`libs/README.md` 为 untracked；`src` 子模块 `main/` untracked；specs/memory 变更均未提交。
