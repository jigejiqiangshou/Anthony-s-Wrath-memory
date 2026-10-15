# f003 — 本沙箱里 git diff 不显示"工作区 vs 索引"的正文

## 结论

在这个沙箱里,`git diff`(以及 `git diff --no-pager`、`git diff-index HEAD`)对**工作区→索引**这一侧只输出 stat 摘要,**不输出正文**,尽管文件内容确实变了。同一份改动用 `git add` 之后,`git diff --cached` 能完整显示正文。

**后果不是"diff 坏了导致丢改动",而是"看不到自己改了什么"。** 内容是安全的:索引 blob 会被正确更新,提交也正确。

## 验证方法

对同一个刚被改写的 `tasks.md`:

```
git hash-object -- <file>     # e1492175…   ← 工作区实际内容
git ls-files -s -- <file>     # d9cb4c08…   ← 索引里的旧内容(两者不同)
git diff -- <file>            # 空输出(错误)
git diff-files --stat         # 却显示 72 行改动
git diff-index HEAD -- <file> # 显示 M 状态,但不给正文
```

然后 `git add -A` 之后再查:

```
git ls-files -s               # e1492175…   ← 索引已更新为新内容
git diff --cached --stat      # 72 行改动,正文完整
```

## 工作方式调整

- 要看"我改了什么",用 `git add` + `git diff --cached`,不要依赖裸 `git diff`。
- 判断内容是否真的变了,用 `git hash-object -- <file>` 与 `git rev-parse HEAD:<file>` 对比,这两个可靠。
- `git status --porcelain` 也会出现"文件其实没变却报 M"的 stat 虚警(`AGENTS.md` 上出现过一次);用 `git diff-files` 的 blob 哈希两列相同即可判定为虚警,`git add` 后它自然消失。

## 适用范围

本次验证针对 2026-10-15 的沙箱配置与 Git for Windows 2.53.0。文件内容与提交结果不受影响,所以这是**工具可观测性**问题,不是数据完整性问题。
