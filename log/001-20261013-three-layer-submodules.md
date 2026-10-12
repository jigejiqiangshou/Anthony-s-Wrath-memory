# 001 — 把 spec / memory / src 三层挂载为子模块并锁定版本

日期:2026-10-13
状态:结构已落地并验证;宪法修订与 spec 侧修正待决

## 目标

用户提出把项目的具体资源固定为三层:G1 spec(`specs/`,由 speckit 流程产生)、G2 memory(`memory/`,由 `agent-dev-memory` 治理)、G3 src(`src/`,全部代码与资源)。三层各自独立 Git 仓库,由顶层仓库以 submodule 挂载并锁定版本;顶层只放项目配置。用户同时要求评估该设计,并判断是否需要重新执行 `/speckit-constitution`。

## 排查路径

1. 先只读勘察事实:`.speckit/constitution.md` 存在(5 条原则 + 1 附录),`specs/` 已是 gitlink(`78a1633`),speckit 阶段为 `tasked`(40 任务、0 完成)。
2. 发现 `specs/.git` 是**真目录**、`.git/modules/` 不存在,即 `specs/` 是"嵌套仓库"而非规范子模块;`git submodule status` 无输出。
3. 发现 speckit helper 把 `specs/.git` 扫成畸形 feature,reason 为 `invalid feature name`。
4. 用户澄清 `.gitmodules` 指向本地是**刻意设计**(他自己写的)。确认:该行记录"从哪克隆",与 gitlink 记录的"锁哪个提交"是两件事;问题只在嵌套形态与缺失裸库。
5. 定位到本沙箱下 `git submodule` 不可用(见死路 e001),改用 plumbing 达成同样结果。

## 讨论过并被否决的选项

- **让 spec 层只做文档、不加版本锁定**:否决。用户要的是可复原的版本对应,而 gitlink 正是最低成本的锁定机制,不需要额外工具。
- **把 `.speckit/` 一并移入 `specs` 子模块**:否决(保留现状)。宪法是项目级配置,与三层挂载点同属顶层更清晰;代价是宪法与 spec 分属两个仓库,`/speckit` 在未初始化子模块时会把特征判为不存在,这一点已在评估中说明。
- **给 memory 层免掉子模块、当作普通目录**:否决。用户明确要三层一致;记录该选项为"更轻的替代",若将来 memory 的提交噪声成为负担可以回退。
- **在 `node_modules` 里修 helper 让 `.git` 不再被扫为畸形 feature**:否决。改的是安装包,不可持久、不属于本项目。
- **用 `git update-index --index-info` 写 gitlink**:否决。PowerShell 管道会给文本加 BOM,git 报 `malformed index info ?`;改用 `--cacheinfo`。

## 最终决定与落地结果

- `specs`:`.git` 移入 `.git/modules/specs`,根目录写 gitfile,成为规范子模块;remote 对齐为绝对路径。
- `memory/`、`src/`:以空仓库建立(各含一份 README 说明本层归属),同样吸收到 `.git/modules/`,写 gitlink。
- `.gitmodules` 三个条目 + `.git/config` 三份 `submodule.*` 配置齐备;顶层提交 `6bfcb83`。
- 三个 gitlink 与各自 HEAD 逐一相等(已验证)。
- 结论:宪法**需要修订而非重写**——现有 5 条原则仍成立可判定;新分层带来的四条纪律(三层归属与写入边界、版本锁定、构建配置归属、提交顺序)需要写入宪法。

## 遗留与下一步

1. 三个裸库(origin 目标)尚未创建,`origin` 指向不存在的 `C:/Users/Zhaoji/Desktop/杀戮尖塔mod-{specs,memory,src}.git`;在此之前"锁定"仅在本工作副本内成立。
2. 宪法四条新条款待用户批准后写入 `.speckit/constitution.md`。
3. `plan.md` 第 5、7、55 行仍假设 Maven 在仓库根,需按子模块布局改为顶层 `pom.xml` + `sourceDirectory` 指向 `src/main/java`。
4. `tasks.md` 编号缺 T005/T006;plan 的 `T-P1`/`T-V*` 标签在任务表内不存在,验证记录无处可写。两者按用户决定一并修。
5. 全部完成后才进 `/speckit-implement`。
