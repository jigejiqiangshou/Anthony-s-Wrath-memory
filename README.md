# memory —— 记忆层

本目录由技能 `agent-dev-memory` 治理,**不纳入 speckit 的阶段机**(speckit 只认 `.speckit/` 与 `specs/`)。

## 归属

- 只记录**已经发生的事**与**当前状态**:热状态、决策档案、过程日志、已验证事实、已排除路线。
- 只登记 `specs/` 与 `src/` 的**路径引用**,不复制其内容;顶层配置文件(`AGENTS.md`、`.gitignore`、`.speckit/constitution.md`)同样只登记路径与含义,不复制正文。
- 方向、路线、任务分解属于 `specs/` 的 spec / plan / tasks,不写进本层。
- 只有主 agent 写本层。

## 本项目的验证记录分三级

可复现的**验证流程**写在 `specs/` 的 plan 里;验证产生的**日志**写在本层 `log/`;只有经得起复用与复读的**结论**才升入 `facts/`。

| 级 | 内容 | 位置 | 门槛 |
| :--- | :--- | :--- | :--- |
| 流程 | 操作步骤、预期结果,可复现路径 | `specs/<NNN>-<slug>/plan.md` 的 Testing Strategy | 无 |
| 日志 | key 清单、实测记录、探针输出、逐次结果 | `memory/log/` | 发生即写,只追加 |
| 结论 | 可被反复验证、对后续有约束力的判断 | `memory/facts/` | **严入**,宁缺勿滥 |

`facts` 的严入标准:必须能说出**方法**(`verified` 字段)、能界定**适用范围**(`scope`)、且在范围外仍然成立;一次性的、只对本次操作有效的观察不进 `facts`。

分类方法本身若被证明通用,应作为技能改进候选,与本项目的开发任务分开排期。

## 契约

- 热状态:`memory/state.json`,必填字段 `schema` / `updated` / `focus` / `blockers` / `next` / `artifacts` / `decisions`,空值写成 `[]`。
- 事实库:`memory/facts/INDEX.json` + 每条一份 Markdown 正文;`status: verified` 必须带 `verified` 字段(方法)。
- 死路库:`memory/deadends/INDEX.json` + 每条一份 Markdown 正文;每条必须带 `reason` 与 `reopenIf`。
- 决策档案:`memory/log/NNN-YYYYMMDD-slug.md`,只追加,不重写。
- 完整协议见技能 `agent-dev-memory` 的 `SKILL.md` 与 `references/`。

## 初始状态

本仓库在建立三层结构时以空仓库创建。热状态已初始化:第一次交接见 `log/001`,第二次见 `log/002`。
