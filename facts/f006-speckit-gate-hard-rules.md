# f006 — speckit 门禁的两条硬规则:依赖必须前置、spec 机器 token 必须唯一

## 结论

1. **依赖必须前置**:`select-tasks` 只接受指向**编号更小**任务的依赖;任何前向依赖报
   `MALFORMED_ARTIFACT: Dependency Txxx must precede Tyyy`(`ok:false`,exit≠0)。
2. **spec 的机器 token 必须全局唯一**:`derive-stage` 要求 `spec.md` 里 `US-*|FR-*|SC-*|EC-*|OQ-*`
   形式的 token **全文只出现一次**;任何跨引用(例如在 `EC-010` 的正文里写 `FR-011`)都会让
   `spec.state=invalid`,而且 **`diagnostics` 为空**,不会告诉你原因。`plan.md` 没有这条要求
   (它用 `tokensValid(text, false)`),所以 plan 里可以自由交叉引用需求号。

推论:`spec.md` 里描述需求之间的关系时,必须用自然语言("与「不选择时不得注入」一条一致")而不是
token 引用;任务依赖只能指向更早的任务,新增任务若要被前面引用,只能把职责并入已有任务。

## 验证方法

1. 把 `T007` 写成 `(depends: T004, T005, T009, T046)`(其中 T009/T046 编号更大)→
   `node speckit-helper.mjs select-tasks --tasks specs/001-anthonys-wrath/tasks.md` 返回
   `{"ok":false,"error":{"code":"MALFORMED_ARTIFACT","message":"Dependency T009 must precede T007"}}`;
   改成 `(depends: T004, T005)` 后 `ok:true`、`incompleteDependencies:[]`。
2. 在 `spec.md` 的 `EC-010` 里写 "(与 `FR-011` 及「Out of Scope」一致)" → `derive-stage` 返回
   `stage:"invalid"`、`spec.state:"invalid"`、`diagnostics:[]`;读
   `@marcsierszen/dsh-specify-lite/lib/workflow.js` 第 272–284 行(`tokensValid(text, true)` 与
   `specValid`)确认规则;去掉该 token(改用自然语言指代)后恢复 `stage:"tasked"`。

## 适用范围

`@marcsierszen/dsh-specify-lite`(本项目门禁脚本 `skills/scripts/speckit-helper.mjs` 与
`/speckit-*` 命令同源)当时安装的版本。项目自建检查器 `memory/log/check-artifacts.mjs` **不检查这两条**
(它只查编号连续、悬空依赖、需求承接、plan 引用有效性、`T-P`/`T-V` 映射),所以改 spec 层时
**helper 的 `select-tasks` + `derive-stage` 必须与自建检查器一起跑**。
