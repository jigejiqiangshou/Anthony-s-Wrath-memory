# 002 — 远端定在 GitHub 四仓库,并完成三层重配

日期:2026-10-15
状态:已完成(顶层推送尚待用户执行)

## 目标

把四层仓库的版本来源从"不存在的本机路径"迁到真实的远端,让 gitlink 的"锁定"从"仅在本工作副本内成立"变成"可在别处复原"。

## 排查路径

1. 首次推送时用户遇到 Git Credential Manager 的认证失败。查本机认证环境:`credential.helper = manager`、无 `.git-credentials`、**无任何 SSH 密钥** → 结论是 HTTPS + 账号密码这条路从未成功过,而 GitHub/Gitee 早已不接受密码,必须用 PAT 或浏览器 OAuth。
2. 期间用户问"是不是先推三个 submodule、再改主库指向、再推子库"。澄清了一处关键误解:**要改的是 URL,不是 gitlink**。推的是同一批提交,gitlink 的哈希不会变;URL 要改两个地方——顶层 `.gitmodules`(跟踪文件,要提交)与顶层 `.git/config`(本地配置,否则本地 `submodule update` 仍走旧地址)。第三步"再推子库"不存在,因为子模块内容根本没动。
3. 用户最终手工完成三个子模块推送,给出地址:统一前缀 `Anthony-s-Wrath-{spec,memory,src}`。
4. 顶层重配后由用户手工推送,`origin/master` 与本地 HEAD 一致(`f59aaac`),确认成功。

## 讨论过并被否决的选项

- **只推三个子模块、顶层留本机**:否决。gitlink 只存在于顶层,不推顶层等于"三层对应哪个提交"的记录没有备份,版本锁定失效。
- **先推顶层、再推子模块**:否决。顶层一旦上云,子模块还没推,克隆者 `update --init` 会拉不到对象;顺序固定为"先子模块、后顶层"。
- **复制目录再推**:否决。`specs/` 等目录本身就是独立仓库(对象库在 `.git/modules/<name>`),复制会造出第二份独立仓库,两边各自演化;而 push 本就不改工作区,直接推没有风险。
- **把 `.gitmodules` 写成 `../Anthony-s-Wrath-spec.git` 这类相对 URL**:暂不采用。相对 URL 相对顶层默认远端解析,虽然顶层现在已有远端,但绝对 URL 不依赖那个前提,读起来也更直白。

## 最终决定与落地结果

- 四个仓库:`Anthony-s-Wrath`(顶层)、`Anthony-s-Wrath-spec`、`Anthony-s-Wrath-memory`、`Anthony-s-Wrath-src`,均在 GitHub 账号 `jigejiqiangshou` 下。
- 顶层 `.gitmodules` 与 `.git/config` 的六处 URL 全部改指 GitHub 并提交(`f59aaac`);三个 gitlink 与各自 HEAD 逐一相等。
- 期间发现 PowerShell 写文件时给 `.gitmodules` 加了 **UTF-8 BOM**,已去掉并 `--amend`。BOM 会让严格解析器读不到第一个子模块名,属于必须修掉的隐患。
- 本沙箱**连不上 GitHub**(`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`),所以推送全部由用户在普通终端完成;沙箱内能给出的最硬证据是 `origin/master` 与本地 HEAD 完全一致。

## 遗留与下一步

1. 顶层 `3631f41` 与 memory 层 `0a6a30b` 尚未推送。
2. 端到端复原验证未做:`git clone --recurse-submodules` 后核对 `submodule status` 三行哈希。必须在沙箱外执行。
3. spec 侧三项修正已完成并提交(`specs` 层 `8b218e5`,顶层 `3631f41`):tasks 编号填平为 T001–T040、plan 对齐三层布局与 Maven 根路径、plan 的 T-P1/T-V* 映射到任务号;宪法补至九条。
