# memory —— 记忆层

本目录由技能 `agent-dev-memory` 治理,**不纳入 speckit 的阶段机**(speckit 只认 `.speckit/` 与 `specs/`)。

## 归属

- 只记录**已经发生的事**与**当前状态**:热状态、决策档案、已验证事实、已排除路线。
- 只登记 `specs/` 与 `src/` 的**路径引用**,不复制其内容。
- 方向、路线、任务分解属于 `specs/` 的 spec / plan / tasks,不写进本层。
- 验证记录写进 `specs/` 的 spec 文档,不写进本层。
- 只有主 agent 写本层。

## 契约

- 热状态:`memory/state.json`,必填字段 `schema` / `updated` / `focus` / `blockers` / `next` / `artifacts` / `decisions`,空值写成 `[]`。
- 事实库:`memory/facts/INDEX.json` + 每条一份 Markdown 正文;`status: verified` 必须带 `verified` 字段(方法)。
- 死路库:`memory/deadends/INDEX.json` + 每条一份 Markdown 正文;每条必须带 `reason` 与 `reopenIf`。
- 决策档案:`memory/log/NNN-YYYYMMDD-slug.md`,只追加,不重写。
- 完整协议见技能 `agent-dev-memory` 的 `SKILL.md` 与 `references/`。

## 初始状态

本仓库在建立三层结构时以空仓库创建,**热状态尚未初始化**。首次交接时按技能契约新建 `state.json` 与两套库的索引。
