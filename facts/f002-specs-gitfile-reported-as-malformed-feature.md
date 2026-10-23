Status: stale — 2026-10-23 迁移到 GitHub spec-kit 后旧 helper 已退场,本条仅作历史。

# f002 — specs/.git(gitfile)会被报为畸形 feature

## 结论

`specs` 作为子模块挂载时,`specs/.git` 是一个 gitfile(内容 `gitdir: ../.git/modules/specs`),而 speckit helper 会把它当成一个畸形 feature 目录:

```
MALFORMED_FEATURE: not a real feature directory
```

这是**结构固有**的:`/speckit` 既要求 `specs/` 在项目根,又要求它以子模块挂载,两者叠加必然产生这个条目。告警级别为 warning,**不影响功能**:`features` 仍返回 `ok: true`、特征列表与 `nextNumber` 正确,`derive-stage` 仍正确返回 `tasked`。

## 验证方法

- 读 helper 源码:`lib/workflow.js:764` 对 `specsRoot` 直接 `readdirSync` 且不跳过点文件;`771` 行把任何 `!isDirectory()` 的条目推入 `malformed`。
- 实测:改装前该条目 reason 为 `invalid feature name`(那时 `specs/.git` 是真目录),改装为 gitfile 后 reason 变为 `not a real feature directory`,两种形态都会被记录。

## 适用范围

只影响诊断输出的可读性。上游若修复,应是在扫描 `specsRoot` 时跳过 `.git` 条目,或把 gitfile 识别为子模块边界。不要在 `node_modules` 里改 helper。
