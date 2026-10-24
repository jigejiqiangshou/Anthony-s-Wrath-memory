# 020 — 探针日志路径可配置：可指到工作区，免去每轮复制附件

日期：2026-10-24 17:20–17:30
状态：未推送。src 层本轮唯一改动（探针，T035 移除）。

## 1. 起因

用户提问：「我们不能修改日志输出路径到 workspace 吗」。此前每轮采集都要把 `%USERPROFILE%\awprobe.log` 复制/附件交回，且游戏运行中文件被占用、无法直接做哈希核对；若日志直接落在工作区，主 agent 可原地读取，交接成本归零。

## 2. 决策（探测日志路径解析顺序）

`ProbeLog` 首次写文件时解析一次目标路径，优先级：

1. 环境变量 `AWPROBE_LOG`（绝对路径；需重启 Steam 才继承新变量）；
2. `%USERPROFILE%\awprobe.logpath` 指针文件：取首个非空、非 `#` 行，按绝对路径处理；支持 UTF-8（含 BOM）与系统 ANSI 两种编码；
3. 默认 `%USERPROFILE%\awprobe.log`（保持旧行为，代码可移植）。

若目标不可写（父目录创建失败、路径非法等），自动回退默认位置；日志首行固定打印 `===== awprobe log: <实际绝对路径> (source=...)`，`hook.PostInitialize` 也会打印 `ProbeLog.logPath()`，因此永远能定位到实际文件。改动只影响探针输出位置，不改变游戏行为；随 T035 一并移除。

## 3. 实现

- `src/main/java/anthonyswrath/probe/ProbeLog.java`
  - 新增 `logPath()`（供日志自报路径）与 `resolve()`（三级解析 + 来源标记）；
  - 首次 `writeFile` 时 `mkdirs` 父目录、写路径头行；打开失败回退默认；
  - 指针文件读取：`Files.readAllBytes` → 优先 UTF-8、出现替换符时回退平台默认编码，并剥离 BOM，跳过 `#` 注释与空行。
- `src/main/java/anthonyswrath/probe/TimingProbe.java`：`hook.PostInitialize` 行追加 `log <path> (source=...)`。

## 4. 离线自检

- JDK8 `javac` 全量编译 `src/main/java` → exit 0（21 个 class）；
- `ProbeLogTest`（临时放 `target/logtest`，已清理）：①无任何配置 → 默认 `user.home/awprobe.log`；②指针文件（UTF-8 BOM + 中文路径）→ 解析并创建嵌套目录、写入指定文件；③指针只有注释/空行 → 回退默认；④指针指向不可写盘符 → 打开失败后回退默认文件，头行仍记录实际路径。

## 5. 使用方式（需要重建 jar 后生效）

```powershell
# 方式 A：指针文件（推荐，无需重启 Steam）
Set-Content -Path "$env:USERPROFILE\awprobe.logpath" -Value "C:\Users\Zhaoji\Desktop\杀戮尖塔mod\awprobe.log" -Encoding UTF8
# 方式 B：用户环境变量（需重启 Steam）
setx AWPROBE_LOG "C:\Users\Zhaoji\Desktop\杀戮尖塔mod\awprobe.log"
```

工作区根 `awprobe.log` 已被 `.gitignore` 的 `*.log` 规则忽略，不会污染提交；普通终端 `mvn -q package` 后复制 jar 到游戏 `mods/` 即生效。

## 6. 提交（未推送）

| 层 | 内容 |
| :-- | :-- |
| `src` | ProbeLog 路径解析 + TimingProbe 自报路径 |
| `specs` | quickstart §3 日志路径说明 |
| `memory` | 本记录 + state.json |
| 顶层 | 推进 gitlink（src / specs / memory） |

推送顺序 src → specs → memory → 顶层（本轮之前 T004 定稿的 specs/memory/top 三个提交也尚未推送，一并推送）。
