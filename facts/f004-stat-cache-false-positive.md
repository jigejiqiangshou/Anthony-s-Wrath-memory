# f004 — git status 会对内容未变的文件报 M

## 结论

`git status --porcelain` 会报出 ` M <file>`,但文件内容其实与 HEAD **完全相同**。这是 stat 缓存过期,不是内容改动。

判定只需一步:比较两个 blob 哈希。

```
git hash-object -- <file>      # fd0cd022…  工作区(经过滤器规范化后)
git rev-parse HEAD:<file>      # fd0cd022…  同值 → 内容没变,是虚警
git diff-files -- <file>       # 输出里两个 blob 列相同,同样是虚警
```

若两值相同而 `git status` 仍报 M,即可确认是 stat 缓存问题:`git add <file>` 之后该条目自行消失,且**什么也不会被暂存**。

## 验证方法

本次在 `.gitmodules` 与 `AGENTS.md` 上各出现一次:

- `.gitmodules`:`git hash-object` = `fd0cd022…`,`HEAD:.gitmodules` = `fd0cd022…`;首字节 `5B 73 75`(无 BOM);`git diff` 空输出。判定为虚警。
- `AGENTS.md` 同型:两值均为 `cd0c5668…`,`git add` 之后 staged diff **一行也没有**。

对照真改动:同一时期 `tasks.md` 的两值不同(`e1492175…` vs `d9cb4c08…`),`git diff-files --stat` 显示 72 行 —— 那是真改动,不是虚警。

## 与 f003 的关系

f003 说的是"真改动看不到正文",f004 说的是"没改动却报有改动"。两者根因不同,但**判定手段相同**:一律以 blob 哈希为准,不要以 `git status` 的字面输出为准。

## 适用范围

2026-10-15 的沙箱配置与 Git for Windows 2.53.0。文件时间戳被动过(例如被其他工具重写)之后最容易触发。内容与提交结果不受影响。
