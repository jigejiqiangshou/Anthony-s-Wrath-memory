# 010 — GitHub spec-kit 迁移定案:重新生成、冻结退场、`.dsh` 不入库

日期:2026-10-23
状态:已落盘(与同批更新的 `state.json` 一起,**故意未提交**;由新会话执行 0a 时首次提交)
依据:本轮会话对 `/speckit` 旧体系与 GitHub spec-kit `1.2.3.dev0` 的实测核查;`memory/log/001–009`、`memory/facts/f002/f006`、`memory/log/005`

## 1. 目标与背景

- 项目规格体系原为 DSH 插件 `@marcsierszen/dsh-specify-lite` 的方言;**该插件已被用户卸载**。
- 用户已安装 **GitHub spec-kit**(`specify 1.2.3.dev0`,uv tool 安装,模板/脚本/命令/DSH 集成随包内置);项目**尚未 `specify init`**。
- 用户决定把项目迁移到 GitHub spec-kit 的 spec 体系,并给出三条决策:
  - **D1 迁移方式 = 重新生成**:用 `/speckit-specify` 等以旧三件套为输入重写,旧三件套归档,不承诺逐条语义对齐。
  - **D2 门禁与提案 = 冻结退场**:005 提案、T043/T044/T045 停投;`check-artifacts.mjs` 冻结、迁移验收后删除;005 只在 memory 记暂停,**不动 spec 层**。
  - **D3 `.dsh/` 整目录保持 gitignore**:spec-kit 的 DSH 技能只本机安装,换机重跑 `specify init`。

## 2. 本轮定案一句话

只改 `memory/` 与顶层,为迁移"减负":0a 改 `AGENTS.md:5`、`memory/README.md:3/8`、`check-artifacts.mjs` 头注释、并据实更新 `state.json`(本 log 与 state 已由本会话写入);提交 memory→顶层并推送,复跑冻结 checker;之后按 §7 执行 init 与重生成。**`specs/` 零字节改动。**

## 3. 已核实基线(2026-10-23 20:31 +08:00)

| 项 | 值 |
| :--- | :--- |
| 四仓 HEAD | 顶层 `3441bc4` / specs `db482e6` / memory `62a4644` / src `6f99259` |
| 四仓状态 | `status --porcelain` 全空;`origin/master..HEAD` 与反向均 **0**(推送已完成) |
| 缺失/未创建 | `.specify/`、`specs/_archive/`、`memory/tools/`、`memory/log/011` 均不存在;**不登记** |
| 旧体系文件 | `.speckit/constitution.md`(blob `717b9597e988a88a4a7a18a981785f21f9baf2ca`,114 行);`memory/log/check-artifacts.mjs`(blob `0fea990b6b122f55323d8bb297c6a8be9f6be6b7`,85 行) |
| 旧规格 blob | spec `c47fb67941137199399941d2355a0d5141beed0d`;plan `00f66a463848f0583b62bd850c7c33a5bef0c4c5`;tasks `e578656d74faee8503211df4976309bcb3de0faa` |
| 旧规格统计 | spec 86 行(5 US / 13 FR / 5 SC / 11 EC / 1 OQ,OQ-005 已关);plan 151 行(`T-P1`+`T-V1..V6`,门禁条款在 `:117`);tasks 54 行(46 任务、45 条依赖边、62 个依赖目标、15 个 `[FOUNDATION]`、`## Verification` 为空) |
| 冻结 checker 基线 | `node memory/log/check-artifacts.mjs . specs/001-anthonys-wrath` → `{"ok":true,"tasks":46,"requirements":29,"problems":[]}` |
| `.dsh` | 未跟踪;`.dsh/skills` 下仅 `agent-dev-memory`(`SKILL.md` blob `3cb61713b3e8800046aeffd94afeeaaab9775da0`) |
| 环境 | Windows + **PowerShell 5.1.26100 Desktop**(`Get-Content -Raw` 必须 `-Encoding UTF8`);本环境**无 `rg`** |

## 4. 决策理由与否决的替代方案

### 4.1 为什么"重新生成"而不是机械转换

旧方言与 spec-kit 模板结构不兼容:spec 的 Problem/Goals/Out of Scope/Open Questions 无对应章节;tasks 用 `- [ ] Txxx [FR-...] 描述 (depends: Txxx)` + `## Verification` JSON,而 spec-kit 用 Phase 分组 + `[P]`/`[USn]`,**无机器可解析 depends、无 Verification 段**;plan 有 `T-P/T-V` 与 Requirement Mapping,而 spec-kit 用 Summary/Technical Context/Constitution Check/Project Structure + `research.md`/`data-model.md`/`quickstart.md`/`contracts/`。机械转换只能逐字重排,价值低于直接重生成。

### 4.2 为什么"冻结退场"

- 旧 checker 只认旧语法(任务行正则、`(depends:)`、`T-P/T-V`);在 spec-kit 格式上会漏检依赖并可能误报 `ok:true`。迁移后**不得**再用它做验收。
- 005/T043/T044/T045 的目标(技能包内检查器、项目说明、提案交付)在 spec-kit 体系下被 `/speckit-analyze` + `checklists/` 取代;继续投资是沉没成本。
- **reopen 条件**:①将来放弃 spec-kit 且重建 DSH 检查器;②重建旧方言体系。两者都需用户重新决策,否则不排期。

### 4.3 为什么 `.dsh` 不入库

spec-kit 的 DSH 集成把 10 个 `speckit-*` 技能写入 `.dsh/skills/`;该目录本就由 `.gitignore` 忽略("AI agent tooling (local only)")。版本化会把本机工具混进项目历史;换机执行 `specify init --here --integration dsh`(或 `specify integration install dsh`)即可重建。

### 4.4 否决的替代方案

- **把检查器整合进 `/speckit` 技能包**:该包是第三方 npm 包、无第三方扩展点(`apply()` 只注册包内 `skills/*/SKILL.md`),且 5 条检查中仅"需求反向覆盖度"属上游职责;该路线随插件卸载已作废。
- **保留旧方言双轨**:与 D2 冲突,且 checker 在新 tasks 上会全量误报。
- **git 回滚 001–009 的规格修订**:那 23 项修的是真实文档缺陷,与装不装 spec-kit 无关;回滚会把已知错误放回。
- **删除 `specs/` 或 `.speckit/` 结构**:破坏项目权威文档与三层拓扑,不做。

## 5. 旧文献索引(迁移后仅作历史,不重写、不删除)

| 位置 | 内容 |
| :--- | :--- |
| `memory/log/001–009` | 旧体系阶段机/门禁迭代的完整过程(append-only,不重写) |
| `memory/facts/f002` | `specs/.git` 被旧 helper 报畸形 feature(旧体系专有;迁移后 stale) |
| `memory/facts/f006` | 旧 helper 门禁两条硬规则(依赖前置、spec token 唯一;迁移后 stale) |
| `memory/README.md:3/8` | 旧阶段机/旧宪法路径(0a 改写) |
| `AGENTS.md:5` | spec 位置指向 `.speckit/constitution.md`(0a 改写) |
| `specs/001-anthonys-wrath/plan.md:117/119–126` | 旧门禁条款、`T-P/T-V` 验证档 |
| `specs/001-anthonys-wrath/tasks.md:47–50` | T043/T044/T045 门禁提案、T046 三层校验 |

## 6. 仅归档、不迁移清单

**作为重新生成的显式输入**:`specs/_archive/001-anthonys-wrath/{spec,plan,tasks}.md`、本条 §6 清单、`memory/facts/f005`、`memory/log/007/009`。

**保留(语义迁移)**:US-001..005、FR-001..013、SC-001..005、EC-001..011、OQ-005 结论、Assumptions、Out of Scope、技术事实(Java 8/Maven、顶层 `pom.xml`+`libs/`、`src/` 子模块、双语 `strings/`、`patches/vanilla/`)、探针问题清单、钩子名、T046 的 gitlink/提交顺序校验、T042 的构建加载验收。

**丢弃(不迁移)**:45 条依赖边与 62 个依赖目标、46 个旧任务号与 15 个 `[FOUNDATION]`、任务→FR/SC 标注、`T-P1`+`T-V1..V6` 标签、`## Verification` 段、`plan.md:117` 门禁条款、EC-007 的 checker `EXEMPT` 表(文本保留)、Architecture/Requirement Mapping/Risks 原文、T043/T044/T045、005 提案、旧编号 1:1 对齐。

## 7. 迁移执行清单(0a → 11)

**硬规则**:顶层每次 commit 前必须 `git add -A` 重暂存,并断言 `specs`/`memory` gitlink == 该层 HEAD;推进与推送顺序恒为 **specs→memory→top**(0a 无 specs 变更,为 memory→top);顶层提交里的 gitlink 必须指向该层一个**已存在**的提交。

| 步 | 动作 | 验收 |
| :--- | :--- | :--- |
| 0a | 改 `AGENTS.md:5`、`memory/README.md:3/8`、checker 头 2 行冻结注释,并据实更新 `state.json` → 提交 memory(含本条 log)→ 顶层 `git add -A` 重暂存 gitlink → 顶层提交 → 推送 memory→顶层 | 四仓 clean;gitlink 断言通过;顶层提交只含 `AGENTS.md` 与 memory gitlink |
| 0a-push | 核对四仓 `rev-list --left-right --count origin/master...HEAD` 均 `0 0` | 云端三行 gitlink 可解析 |
| 0b | `node memory/log/check-artifacts.mjs . specs/001-anthonys-wrath` | `ok:true tasks:46 requirements:29`,与 §3 一致 |
| 1 | `specify init --here --force --non-interactive --ignore-agent-tools --integration dsh --script ps` | `.specify/` 产物齐全(见下);`git status` 仅 `.specify/`;`.dsh` 仍忽略;**不装 git 扩展**(否则会自动建分支/提交) |
| 2 | 重启 DSH | `.dsh/skills/speckit-*/SKILL.md` 共 10 个;`git ls-files .dsh` 为空 |
| 3 | 改写 `.specify/memory/constitution.md` | 保留九条标题(`## Core Principles` 下 `### 一、..九、`)+10 条违规判定+`## Governance`+版本行 `**Version**: 1.0.0 \| **Ratified**: 2026-10-13 \| **Last Amended**: <迁移日>`;旧宪法 `:75` 的 Testing Strategy 与 `:77` 的"写进 `specs/` 的 plan"**都改**为 quickstart;Testing Strategy 零命中 |
| 4 | 建 `specs/_archive`;`git -C specs mv 001-anthonys-wrath _archive/001-anthonys-wrath`;写 `_archive/README.md` | 归档后 `specs/001-anthonys-wrath` 不存在;三对 rev-parse 与旧 blob 相等(`c47fb67/00f66a4/e578656`);`specs/` 顶层只剩 `_archive` |
| 5 | 先 `$env:SPECIFY_FEATURE_DIRECTORY='specs/001-anthonys-wrath'`(与脚本调用同一 shell),并把 `feature_directory=specs/001-anthonys-wrath` 写进 `/speckit-specify` 调用文本(输入=归档三件套+本条) | 回读 `.specify/feature.json` 断言 001;无 `specs/002-*`;`spec.md` 存在;四行头(Branch=N/A);四个二级节+Edge Cases;`checklists/requirements.md` 生成;不生成 tasks、不建分支 |
| 6 | `/speckit-plan`(输入新 spec+归档 plan+本条) | `research.md`/`data-model.md`/`quickstart.md`;不建 `contracts/`;Technical Context 九字段;Constitution Check 全过 |
| 6b | `AGENTS.md:10` → quickstart | quickstart 已生成,路径有效 |
| 6c | `memory/README.md:14/18` → quickstart(工作区改,10c 提交) | README 无 Testing Strategy |
| 7 | `/speckit-tasks`(输入新 spec/plan/research/quickstart+本条) | Phase 1/2/3–7(US1..5)/8 Polish + `## Dependencies & Execution Order`;`[P]`/`[USn]`;无 `(depends:)`/`## Verification`/`[FOUNDATION]`/`T-P/T-V`;T043/44/45 三项工作不复活 |
| 8 | `/speckit-analyze`(只读)+可选 `/speckit-checklist` | 0 CRITICAL;warning 有处置;不得用旧 checker 当门禁 |
| 9 | `git -C specs add -A && git -C specs commit`;推送 specs | specs clean;记下新 commit 供 10d |
| 10a | 顶层工作区:`AGENTS.md:5` 定稿→`.specify/memory/constitution.md`;`.gitignore` 删 `.speckit/cache/` 行;`git rm -r .speckit`;`git add -A`(`.specify/` 入、`.dsh/` 不入;旧宪法不复制到 canonical 路径,旧字节只在 git 历史 `717b959`);**暂不提交** | `git status` 只含预期;新 spec 产物路径存在 |
| 10b | memory 定稿(工作区改完、待提交):`README.md:3` 终稿(不含 `.speckit/`);facts f002/f006→stale(`INDEX` 只改 `status`/`scope`/`evidence`,**不用非契约字段**;f002 evidence→`specs/_archive/001-anthonys-wrath`;正文首行加 `Status: stale — …`);删 checker;写 `log/011`;`state` 的 `updated/focus/next/artifacts/decisions` 更新并清 init blocker | memory **已定稿待提交**(非 clean);checker 已删;`state.artifacts` 逐项存在 |
| 10c | `git -C memory add -A && git -C memory commit`;推送 memory;记 M1 | memory clean;顶层 gitlink 仍旧(10d 修) |
| 10d | `git add -A` 重暂存 → 断言 `git ls-files -s` 三行 == 各层 `rev-parse HEAD`(不等即 `throw`)→ 顶层 commit → 推送 | 三层 gitlink 对应;顺序 specs→memory→top |
| 11 | 普通终端 `git clone --recurse-submodules` 复原 | 云端三行 gitlink 与各层 HEAD 一致;换机重装 `.dsh` 技能(`specify integration install dsh`) |

**init 产物验证清单(R11)**:
`.specify/templates/{constitution,spec,plan,tasks,checklist}-template.md`;`.specify/scripts/powershell/{common,create-new-feature,resolve-template,setup-plan,setup-tasks,check-prerequisites}.ps1`;`.specify/memory/constitution.md`;`.specify/.gitignore`(第 6 行忽略 `feature.json`);`.specify/init-options.json`;`.specify/integration.json`;`.specify/integrations/{dsh,speckit}.manifest.json`;`.specify/workflows/speckit/workflow.yml`;`.specify/workflows/workflow-registry.json`;`.dsh/skills/speckit-*/SKILL.md`(10 个)。

## 8. 旧→新映射

### 8.1 宪法

标题+引言(含版本断言及第 1 条违规判定)→标题与引言;原则一..九 → `## Core Principles` 下 `### 一、..### 九、`;10 条 `**违规判定**` 逐条保留(仅第六条与 `:75`/`:77` 的 Testing Strategy→quickstart);附录降为 `## Governance` 下 `### 附:有意未收录的约束`;末尾版本行 `**Version**: 1.0.0 | **Ratified**: 2026-10-13 | **Last Amended**: <迁移日>`。

### 8.2 spec

Problem/Goals→`**Input**` + US1 的 Why + plan `## Summary`;US-001..005→`### User Story 1..5 (Priority: P1..P5)`+Why+Independent Test+Given/When/Then(**P 序取旧任务 DAG**:选项+入组 P1、洗牌置底 P2、抽到即负 P3、未选无影响 P4、不可移除 P5);FR→`## Requirements`/`### Functional Requirements`(保留 ID);EC→`## User Scenarios & Testing` 内 `### Edge Cases`;SC→`## Success Criteria`/`### Measurable Outcomes`;Out of Scope→`## Assumptions` 内 `Out of scope:` 条目;OQ-005 结论进 US1 第 2 条验收场景+Assumptions;新未决用 `[NEEDS CLARIFICATION]`(≤3);不保留 Problem/Goals/Open Questions 标题。

### 8.3 plan

`## Summary`、`## Technical Context`(九字段)、`## Constitution Check`、`## Project Structure`;`research.md`/`data-model.md`/`quickstart.md`;Constraints 拆入 Constitution Check 与 `**Constraints**`;Architecture/Data Flow/Dependencies→Summary/Project Structure/research;Requirement Mapping 不保留,由新 tasks 的 `[USn]`+正文需求号重建;Testing Strategy→quickstart;Risks→research;Branch=N/A。

### 8.4 tasks

`- [ ] Txxx [P?] [USn] 描述含路径`;`[FOUNDATION]`→Phase 1/2;`[FR/SC]`→`[USn]`+正文需求号;`## Verification` 删除;T-P/T-V→Phase 2 探针+各 US 验证+quickstart;旧编号不 1:1。

## 9. 验收判据(12 条,PowerShell 5.1 可执行;要点)

1. **旧方言退场**:`.speckit/`、`memory/log/check-artifacts.mjs`、`memory/tools/` 均不存在。
2. **无悬空引用**:`$A` = live 文件(`AGENTS.md`、`memory/README.md`、`.specify/memory/constitution.md`、`specs/001-anthonys-wrath/{spec,plan,tasks,research,data-model,quickstart}.md`、`…/checklists/requirements.md`);对 `$A` 查 `check-artifacts|memory/tools|\(depends:|^## Verification|T-P[0-9]|T-V[0-9]` 零命中;`\.speckit/` 仅对非 AGENTS/README 文件查。**A′1(0a 后)**:AGENTS/README 的 `.speckit/` 行必须含"退场",且无 `.specify/`、`_archive`;**A′2(6c 后、10a 前)**:README 无 Testing Strategy。**`$history`**(log/010/011、f002、f006)只查存在性与 `Status: stale`,不查旧 token。**B 历史**允许:`specs/_archive/**`、`memory/log/**`、facts/deadends 正文。
3. **新宪法**:`### 一..九` 计数 9、`**违规判定**` 计数 10、版本行 1、Testing Strategy 零命中。
4. **新三件套结构**:spec 四行头+四个二级节+四类三级节;plan 四节;tasks Phase+`[P]`/`[USn]`+Dependencies 节。
5. **旧语法清零**:tasks.md 无 `\(depends:`、`\[FOUNDATION\]`、`T-P[0-9]`、`T-V[0-9]`、`^## Verification`。
6. **停投不复活**:`$A` 内容词零命中(`门禁常驻|豁免名单|提案交付|check-artifacts|memory/tools`);archive/log 允许;log/005 未被编辑。
7. **归档未失真**:`db482e6:001-anthonys-wrath/{spec,plan,tasks}.md` 与 `HEAD:_archive/001-anthonys-wrath/…` 三对 `rev-parse` 相等(基线 `c47fb67/00f66a4/e578656`)。
8. **路径有效**:`Get-Content memory/state.json -Raw -Encoding UTF8 | ConvertFrom-Json` 后 artifacts 逐项 `Test-Path` 为真;不含 `.speckit/constitution.md` 与 checker。
9. **三层锁定与提交顺序**:`git ls-files -s` 三行 gitlink == 各层 `rev-parse HEAD`;四仓 clean;顺序 specs→memory→top。
10. **无残留投资**:`$A` 无门禁/豁免/提案内容;archive 与 log/005 仅历史。
11. **DSH 本地技能**:`git ls-files .dsh` 空;10 个 `speckit-*`;`agent-dev-memory/SKILL.md` blob = `3cb61713b3e8800046aeffd94afeeaaab9775da0`。
12. **init 产物齐全**:`.specify/integrations/{dsh,speckit}.manifest.json`、`workflows/speckit/workflow.yml` 存在且随顶层入库。

## 10. 窗口期失真清单(执行时注意)

- `AGENTS.md:5`:step4 归档后**不能**再说"三件套仍在 `specs/<NNN>-<slug>/`";0a 改写时不含位置断言。
- `memory/README.md:14/18`:step6 生成新 plan/quickstart 后"plan 的 Testing Strategy"失真 → step6c 改、10c 提交。
- `AGENTS.md:10`:step5 后仍说"plan 里" → step6b 改。
- facts f002/f006:0a 时仍 `verified`(stale 前提未发生),step10b 才标 stale。
- A′1 / A′2 两个时点必须严格执行;10a 之后 A′ 不再适用。

## 11. 评估循环记录(方案如何收敛)

R1 对 v1 提 12 条 → v2;R2 对 v2 提 3 error+5 warning → v3;R3 对 v3 提 3 error+4 warning+1 note → v4;R4 对 v4 提 1 error(10d 未重暂存 memory gitlink)+5 warning → v5 补丁;R5 对整合稿提 1 error(验收 `$A` 未区分 live/history)+5 warning → 本记录 §7/§9 已收口(`$A`/`$history` 分离、A′ 两时点、`:75`/`:77` 分别改、内容词判据、步骤编号补 11、`README:8` 保留登记规则)。

所有与事实相关的 error 均经独立实测证实并修正(spec-kit 不碰 `specs/`/根 `AGENTS.md`/`.gitignore`;核心脚本不执行 git;DSH 集成布局;init 参数;`specs/_archive` 不影响编号;`speckit.manifest.json` 由 init 生成;PS 5.1 编码)。

## 12. 本会话边界与降级托管声明

- **未做**:未改 `specs/` 任何字节;未改 `AGENTS.md`、`memory/README.md`、checker、`.speckit/`、`.gitignore`、`.dsh/`;未运行 `specify init`;未做 git 写操作。
- **仅有两个写入**:本 log 与 `memory/state.json`,**故意未提交**——0a 要求 memory 提交先行、顶层重暂存 gitlink,由新会话统一提交。
- **降级托管**:按 memory 规则,"将要怎么做"属于 spec;因本轮 spec 层冻结,迁移方案临时托管在本 log。迁移完成后应把可复用的流程/阈值移入 `specs/`(或删除本条),避免记忆层长期承载方向性内容。

## 13. 下一步

新会话冷启动后执行 0a(见 §7);0a 完成、四仓 clean 后,按 §7 从 init 继续。
