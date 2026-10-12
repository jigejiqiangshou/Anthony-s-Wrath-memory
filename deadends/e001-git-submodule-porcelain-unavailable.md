# e001 — 用 git submodule 子命令挂载三层结构

## 尝试过的路

按标准做法挂载三层:先 `git submodule absorbgitdirs specs` 把嵌套仓库规范化,再用 `git submodule add <url> memory` / `src` 建立并登记 gitlink,最后用 `git submodule status` 验收。

## 失败原因

`constraint-violation`。`git submodule` 是 shell 实现,先启动 `sh.exe`;本沙箱的受限模式不允许它创建 msys 信号管道,于是命令在真正工作之前就失败了:

```
0 [main] sh (2852) C:\Program Files\Git\usr\bin\sh.exe: *** fatal error - couldn't create signal pipe, Win32 error 5
```

`git submodule status` 退出码 66,不产生任何输出;`absorbgitdirs` 同样 66,且**不改动任何文件**。把 stdout 改为重定向到文件、绕过 PowerShell 管道后结果不变,排除"管道被包装"这一解释。

## 改用的路

用 plumbing 等价实现,全部验证通过:

1. `Move-Item specs/.git .git/modules/specs` + 写 gitfile `gitdir: ../.git/modules/specs`;
2. `git init` 建 `memory/`、`src/`,各自提交 README 后同样吸收到 `.git/modules/<name>`;
3. 手写 `.gitmodules`,用 `git update-index --add --cacheinfo 160000,<sha>,<path>` 写 gitlink;
4. `git config submodule.<name>.url/active` 补齐配置。

注意 `--cacheinfo` 的 path 参数**不能**带 `./` 前缀(会 exit 128),且不能用 `git update-index --index-info`:PowerShell 通过管道传给 git 的文本会被加 BOM,git 报 `malformed index info ?`。

## 什么情况下值得重试

见索引里的 `reopenIf`:沙箱放开命名管道,或 `git submodule` 改由原生命令实现。届时第 1 步可改用 `git submodule absorbgitdirs`,结果等价,不必回退现有布局。
