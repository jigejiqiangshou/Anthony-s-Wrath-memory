# 011 — GitHub spec-kit 迁移执行记录(0a → 10d)

日期:2026-10-23
状态:本地执行完成;**推送待用户普通终端执行**(沙箱不可推送,见 facts/f007)
依据:定案见 `memory/log/010-20261023-speckit-migration.md` §7/§9;本条只记「实际做了什么、结果如何、哪里偏离计划」。

## 1. 执行结果总览

| 步 | 动作 | 结果 |
| :--- | :--- | :--- |
| 0a | 改 AGENTS.md:5、memory/README.md:3/8、checker 冻结注释,更新 state;提交 memory → 顶层并推送 | 完成(见 §2 偏差 1) |
| 0a-push | 四仓 `ls-remote` 复核 | 用户 20:52 前推送完成;四仓 local==remote |
| 0b | 复跑冻结 checker | `ok:true tasks:46 requirements:29`,与基线一致 |
| 1 | `specify init --here --force --non-interactive --ignore-agent-tools --integration dsh --script ps` | 成功;R11 清单 19 项全部存在;`git status` 仅 `?? .specify/` |
| 2 | 技能与本地目录核对 | 10 个 `speckit-*` 技能全部出现;**无需重启 DSH**(会话技能目录即时刷新);`git ls-files .dsh` 为空 |
| 3 | 重写 `.specify/memory/constitution.md` | 9 个 `### 一~九`、10 条违规判定、1 条版本行、Testing Strategy 0 命中、quickstart 3 处 |
| 4 | 归档旧三件套 | `specs/_archive/001-anthonys-wrath/`;三对 blob 与 db482e6 相等(`c47fb67/00f66a4/e578656`);`specs/` 顶层只剩 `_archive` |
| 5 | 重新生成 spec | 5 US(P1 选项+入组 / P2 洗牌置底 / P3 抽到即负 / P4 未选无影响 / P5 不可移除)、13 FR、5 SC、11 EC、17 假设(含 5 条 Out of scope)、0 未决;`checklists/requirements.md` 18 项全过;`feature.json` 指向 `specs/001-anthonys-wrath`;未建分支 |
| 6 | plan + Phase 0/1 产物 | plan 四节、Technical Context 九字段、Constitution Check 10 项全 PASS、无 `contracts/`;research.md / data-model.md / quickstart.md 生成 |
| 6b/6c | AGENTS.md:10、memory/README.md:14/18 → quickstart | 完成(memory 侧随 10c 提交) |
| 7 | tasks.md | 41 任务、8 Phase(Setup/Foundational/US1..US5/Polish)、`[P]` 13 处、`[USn]` 28 处、`## Dependencies & Execution Order`;无旧方言 token;T043/44/45 未复活 |
| 8 | 自检 analyze | 0 CRITICAL;初轮覆盖缺口 8 项已在 tasks 中补 `FR-/SC-/EC-` 引用,复检 13 FR / 5 SC / 11 EC 全部命中;`<modId>` 占位符为有意延迟(T001 定名),已在 tasks 头注明 |
| 9 | specs 提交 | `c229437`(11 文件,+1009/−278);归档 blob 三对校验通过 |
| 10a | 顶层工作区定稿(未提交) | 删 `.speckit/`、`.specify/` 入库、AGENTS.md:5 → `.specify/memory/constitution.md`、`.gitignore` 删 `.speckit/cache/` 行 |
| 10b | memory 定稿(未提交) | README 终稿、f002/f006 → stale、删 checker、本记录、state |
| 10c | memory 提交 | 见 `git log`(本轮 memory 提交) |
| 10d | 顶层提交 | gitlink 断言通过后提交(见 `git log`) |
| 11 | 推送 + 克隆复原验证 | **待用户**(沙箱推不出去) |

## 2. 偏离计划之处与理由

1. **0a 拆成两对提交**:计划 0a 是「memory 提交 → 顶层提交 → 推送」一次完成。实际沙箱内 push 以 exit 128 失败(无 HTTPS 凭据,facts/f007),于是先做 0a 提交对(`80293d7`/`e064643`),再把「本地已提交、推送待普通终端」的结果作为第二对提交写入(`1c18710`/`b17fcd3`),沿用 62a4644/3441bc4 的 push-outcome 先例。用户在普通终端推送后,四仓 `ls-remote` 复核通过。
2. **无需重启 DSH**:计划 step2 要求重启后核对技能。init 完成后会话技能目录即时出现 10 个 `speckit-*` 技能,实际未重启即满足验收;因此后续步骤直接使用技能内容执行。
3. **PowerShell 执行策略**:本机 Windows PowerShell 5.1 默认策略拒绝未签名 `.ps1`,spec-kit 脚本一律以 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File <脚本> -Json` 调用。这是调用方式的适配,不改项目文件。
4. **旧方言 token 清理**:初稿的 plan 树注释与 quickstart §3 标题残留「Testing Strategy」「T-P1」,为满足验收 §9.2/§9.3 的 live 文件零命中,已改为「验证流程」「时序探针」。
5. **`.constitution-template.json` 保留**:init 生成的模板来源记录(sha256 指向核心模板),项目内无脚本读取;按 init 产物原样入库,不手改。

## 3. 提交清单(本轮)

- specs:`c229437` — «Regenerate the spec layer in spec-kit format and archive the old dialect»
- memory:`<10c commit>` — README 终稿、f002/f006 stale、删 checker、log/011、state 收尾
- 顶层:`<10d commit>` — `.specify/` 入库、删 `.speckit/`、AGENTS.md:5 定稿、.gitignore、specs/memory gitlink 推进
- 推送顺序恒为 **specs → memory → 顶层**;顶层提交前已 `git add -A` 重暂存并断言三 gitlink 等于各层 HEAD。

## 4. 迁移后状态摘要

- 活文档:`specs/001-anthonys-wrath/{spec,plan,research,data-model,quickstart,tasks}.md` + `checklists/requirements.md`;归档在 `specs/_archive/001-anthonys-wrath/`(只读)。
- 宪法:`.specify/memory/constitution.md`(九条原则、10 条违规判定、Governance、版本行)。
- 门禁:旧 checker 已删除;由 `/speckit-analyze` + 各功能 `checklists/` 承担。
- 记忆库:f002/f006 已 stale;coldStart 仍为 true 的条目 4 条(f001/f003/f005/f007)。

## 5. 待办

1. **用户普通终端推送**(顺序固定):`git -C specs push origin master` → `git -C memory push origin master` → 顶层 `git push origin master`。
2. 推送后复核四仓 `origin/master == HEAD`,并在普通终端做 `git clone --recurse-submodules` 复原验证(step11)。
3. 游戏目录 `mods/` 装好 ModTheSpire / BaseMod / StSLib(人工);随后按 `specs/001-anthonys-wrath/tasks.md` 从 T001 开工,**实现前先跑 T004 时序探针**。

## 6. 最终提交哈希与推送交接(补记)

本节在 10c/10d 提交之后追加,记录本文件提交时未知的哈希。

| 层 | 提交 | 内容 |
| :--- | :--- | :--- |
| specs | `c229437` | 迁移后的规格层:旧三件套归档 + 新 spec/plan/research/data-model/quickstart/tasks/checklist |
| memory | `3df2a38` | README 终稿、f002/f006 → stale、删旧 checker、本记录、state 收尾 |
| 顶层 | `64e31ca` | `.specify/` 入库、删 `.speckit/`、AGENTS.md/.gitignore 定稿、specs/memory 指针推进 |

推送尝试(2026-10-23 21:29,沙箱):specs / memory / 顶层三个 push **均 exit 128**(`sh.exe: couldn't create signal pipe` + `fatal: unable to get password from user`),远端仍停在 `db482e6` / `1c18710` / `b17fcd3`。**请用户在普通终端按以下顺序推送**:

```powershell
git -C specs push origin master
git -C memory push origin master
git push origin master
```

推送完成后:四仓 `git -c http.sslBackend=openssl ls-remote origin master` 复核 `origin/master == HEAD`,并在普通终端做 `git clone --recurse-submodules` 复原验证(step11)。
