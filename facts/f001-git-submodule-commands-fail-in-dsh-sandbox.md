# f001 — 本沙箱内 git submodule 系列命令一律 exit 66

## 结论

在本项目工作区内,`git submodule` 的**任何**子命令都不可用:exit 66,stderr 只有一行

```
sh.exe: *** fatal error - couldn't create signal pipe, Win32 error 5
```

原因是 `git submodule` 是 shell 实现(`C:\Program Files\Git\mingw64\libexec\git-core\git-submodule`),它在沙箱受限模式下无法创建 msys 信号管道。**这不是仓库的问题**,`git status`、`git ls-files --stage`、`git -C <子模块>` 等原生命令在同一环境全部正常。

## 验证方法

在 workspace-write 模式下分别执行:

```
git submodule status                      # exit 66
git submodule absorbgitdirs specs         # exit 66
git status --porcelain                    # exit 0
git ls-files --stage                      # exit 0
git -C specs rev-parse HEAD               # exit 0
```

把 stdout 重定向到文件而不是走 PowerShell 管道,结果不变——说明失败发生在 sh 启动阶段,与管道无关。

## 等价替代(plumbing)

- 挂载子模块:顶层 `.gitmodules` 手写,`git update-index --add --cacheinfo 160000,<sha>,<path>` 写 gitlink。
- 规范化布局:把 `specs/.git` 移入 `.git/modules/specs`,并在子模块根写 gitfile `gitdir: ../.git/modules/<name>`。
- 子模块内提交:`git -C <name> commit`。

## 适用范围

本次验证针对 2026-10-13 的沙箱配置与 Git for Windows 2.53.0。沙箱放开命名管道后本结论失效,见死路 e001 的 `reopenIf`。
