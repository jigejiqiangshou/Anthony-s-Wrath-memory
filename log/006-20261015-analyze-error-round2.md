# 006 — 二次 analyze 的两个 error:依赖成环,与宪法那句的出处

日期:2026-10-15
状态:已修复并提交

## 本轮报了什么

二次 `/speckit-analyze` 结论 `NEEDS CHANGES`,两个 error:

- **F-001 tasks.md 结构非法**:`select-tasks` 退出码 4,`MALFORMED_ARTIFACT: Dependency cycle includes T041`。`T041 (depends: T040, T043, T045)` 与 `T045 (depends: T041, T044)` 互相依赖——T041 依赖了后置任务,T045 又依赖 T041,成环。这是**已提交**状态(specs `b7adc28`),由上一轮 T043–T045 那次改动引入。
- **F-002 宪法第六条与 plan / tasks / AGENTS.md 冲突**:第 77 行写"验证记录写进 spec 文档,不写进 memory",而三级制与所有"记录写入 T0xx"落点都指向 `memory/log/`。

同时暴露一个工具盲区:项目门禁对同一份环形文件返回 `ok:true / problems:[]`——它的"依赖完整性"只查悬空,不查先后序与成环。该盲区连同"当前 HEAD 即天然负例"一并留给门禁扩展(T043/T045)。

## F-001 的修法

只动两处,不重编号:

- `T041` 依赖改为 `(depends: T040)`,正文只保留"验证记录机制定稿"职责;
- `T045` 承接被移出的"提案撰写与交付"职责(连同"保持技能原有结构、只做合理增强、含技能自身回归验证、单独排期"四项限定一并迁入)。

修法先在临时副本上机械验证(改完 `select-tasks` 返回 `ok:true`、45 个任务全解析),再落到工件。

## F-002 的出处查证(用户要求先确认规则来源)

结论:**半句来自技能,半句是手写误记,与 speckit 无关**。

| 半句 | 出处 |
| :--- | :--- |
| "memory 只登记 `specs/` 与 `src/` 的路径引用,不复制其内容" | 忠实转写自 `agent-dev-memory`:`AGENTS.md.fragment` 第 13 行(memory stores path references only, not file bodies)、`SKILL.md` 第 45 行;项目侧同义表述见 `memory/README.md` 第 8 行 |
| "验证记录写进 spec 文档,不写进 memory" | **无来源且与技能相反**。技能里"→ spec、不写进记忆"只见于 `SKILL.md` 第 46 行与 `AGENTS.md.fragment` 第 5 行,管的是**方向性内容**(将要怎么做、路线、任务分解);对验证记录,技能明文指向 memory:`AGENTS.md.fragment` 第 12 行(running record → `memory/log/`)、`SKILL.md` 第 48 行(验证完成 → `facts/`)、`references/workflow.md` 第 105 行 |

speckit 的贡献为零:`speckit-constitution/SKILL.md` 不含宪法模板,只要求"不要强加无关类别";对整个 `dsh-specify-lite` 包 grep `memory|记忆` 零命中。

时间线也支持"误记"而非"对立决定":宪法第六条的这句随 `3631f41`(10-15 17:09)三层重构进入,比三级制落盘(memory `0db4019`,10-15 18:13)早 64 分钟;其后宪法再改(`6b4bcbb`,18:33)也没回头看它。

## F-002 的修法(用户选定 A:改宪法)

- 第 77 行拆成两条:方向 / 路线 / 任务分解 → spec;验证记录三级 → plan(流程)/ `memory/log/`(记录)/ `facts/`(结论)。
- 第 75 行违规判定补一项,使这句可判定:`plan` 的 Testing Strategy 缺少可复现步骤,或 `facts/` 出现无 `verified` 方法的条目。

## 验收(三条命令的实测输出)

```
select-tasks   : exit=0 ok=true tasks=45 incompleteDependencies=0
derive-stage   : exit=0 ok=true stage=tasked  spec=valid plan=valid tasks=valid
check-artifacts: ok=true tasks=45 requirements=27 problems=[]
```

改前对照:同一份文件 `select-tasks` 退出码 4、环报 `T041`;`derive-stage` 为 `"stage":"invalid"`。

## 顺带确认(不改动)

- 前两轮的 error 修复仍在位:`!libs/*.jar` 已移除、占位图归属 T037、EC-008 兜底未缩减、验证记录有落点。
- 本条结论**不升入 `facts/`**:宪法第六条已直接陈述该路由,再写一条事实库条目只是重复一份已有的权威(与技能示例 `f001` 的降级理由一致)。

## 提交与下一步

- specs 层 `d8c7c85`(T041 依赖重指 + T045 承接提案交付);memory 与顶层随本轮提交,提交号见顶层 `git log`。
- 顺序遵循宪法第九条:先层后顶层(顶层一次提交同时推进 `specs` 与 `memory` 两个 gitlink,并含宪法第六条的改动)。

## 下一步

推送三层与顶层 → 云端克隆复原验证 → 重跑 `/speckit-analyze`(预期 error 清零,剩 warning 级:不可移除机制未确立、抽牌堆顺序不可见)→ `/speckit-implement`。
