# 009 — 四轮 analyze 的批量修订：F-018 走修法 a，其余 22 项一次修完

日期:2026-10-16
状态:已落盘,门禁三条全绿,未提交(等用户指示)

## 本轮做了什么

四轮 `/speckit-analyze` 对 `specs/001-anthonys-wrath/` 做只读语义评审(机械门禁三条先跑,全绿),报出 23 项:
沿用二/三轮编号的 `F-002…F-017`,加本轮新增的 `F-018`、`F-024…F-026`,以及 note 级 `F-021…F-023`。
用户先问 `F-018` 修法 a / b 的具体含义,随后指示:**F-018 采用修法 a,其余全部按评审推荐批量修改**。

评审阶段未改动任何工件;本文件记录的是随后执行的批量修订。

## F-018 的选择(a)与否决(b)的理由

问题:探针(T004)起的一切游戏内任务都需要游戏目录 `mods/` 下装好 BaseMod / StSLib,
而工件里无人负责这一步。实测确认:游戏目录有 `mts-launcher.jar`,但**无 `mods/`、无 `workshop/`**,
整个 Steam 目录下搜不到任何 `BaseMod*.jar`。

选 **(a) 运行期前置 + 验收项 + 证据落点**,三处落点:

1. `plan.md` 的 Technical Context 写明运行期前置(一次性、人工完成、本仓库不提交 jar);
2. `tasks.md` 的 T004 正文加**前置**(装好基础 mod、启动器能同时列出并启用三者);
3. T004 的前置证据(启动器截图或加载日志)记入 `memory/log/`,同时作为「本任务可被执行」的判据。

否决 **(b) 做成独立任务** 的具体理由(逐形态):

- **b1 新增 T046 让 T004 依赖它**:helper 硬规则「依赖必须严格前置」直接拒绝
  (`lib/workflow.js:494-503`,`Dependency T046 must precede T004`,exit 4);
- **b2 前插新编号**:约束上可行,但 45 个任务要整体重编号,plan 里所有 `T0xx` 引用与本日志 008 已定
  的批量修订表都要按新编号重写——而该修订正是同一批要做的事,属自伤;
- **b3 塞进 T002 验收**:会破坏 T002/T003 的并行(现在两者都只依赖 T001),且把「往游戏目录拷 jar」
  写进入口类任务,任务粒度被污染;
- **b4 子编号(如 `T004a`)**:`TASK_ID_RE = /^T\d{3,}$/`(`workflow.js:14`)不接受,门禁报畸形;
- 另注:`workflow.js:417` 拒绝重复依赖,所以「同时依赖 T002 与新增编号」这种折中写法也不成立。

## 逐项修法(23 项)

| 编号 | 级别 | 修法 |
| :--- | :--- | :--- |
| F-002 | error | T002/T003 **对调内容**(依赖配置变 T002、入口类变 T003 且 `(depends: T001, T002)`);**T004 由依赖 T002 改为依赖 T003**(原方案漏了这一步,只对调内容会让探针仍早于依赖配置);plan 第 10 行「由 T003 写入」→T002、Risks 末条「随后在 T003 补齐」→T002 |
| F-003 | warning | `ModTheSpire.json` 写进 plan Architecture 第 7 项(modid / sts_version / dependencies,版本仍以顶层 pom properties 为唯一来源)与 T003 正文、T042 的 `jar tf` 清单 |
| F-004 | warning | T042 依赖补全为 `(depends: T003, T006, T023, T037)`(入口类对调后为 T003) |
| F-005 | warning | SC-001/SC-002 与 plan 的 T-V1、T018、T025、T026 写明观察手段:**原版遗物「冰冻之眼」优先,开发者控制台为书面备选**,不可用时记原因 |
| F-006 | warning | T027 补「同一时刻多张副本被抽入手中只结算一次失败」的观察,并把 `FR-010` 加进 T027 标注;T-V2 同步 |
| F-007 | warning | spec 假设第 74/78 行改为条件表述(变化以参照牌实测为准)、删去「被移除」括号;EC-003 与 FR-012 的收口对齐,去掉「本牌可被变化」的预设 |
| F-008 | warning | T010 由 `(depends: T006)` 改为 `(depends: T006, T008)`;T023 由依赖 T008 改为依赖 T010 |
| F-009 | warning | T-P1(plan)与 T004、T026、T035 各写明**一次非「牌堆耗尽」触发的洗牌**(由卡牌/遗物把弃牌堆洗回抽牌堆) |
| F-010 | warning | OQ-005 在 spec 内关闭(标注 `[已关闭]` + 结论「必须显示效果说明文本」);T014 改为承接该结论并把目视结果记入 `memory/log/` |
| F-011 | warning | T043 的验收扩为「把检查范围扩到依赖先后序与成环两项」并指向门禁硬规则条目;plan 第 115 行同步;T044 补写「含新增检查项」与 `specs/.git` 这条已知噪声 |
| F-012 | note | **未改**:无法从可引用来源证实 `CustomModeMods` 是错的(wiki 抓取只返回导航壳);留 T003 对照实际 BaseMod jar 后再定 |
| F-013 | note | 宪法第二条第二项(玩家可见字符串字面量)补验收落点:plan 的 Constraints 写明落在 T031 与 T039,T039 正文加该核对项 |
| F-014 | note | SC-005 的映射随之收窄(见 F-024),不再只挂 T031 |
| F-015 | note | 顶层 `.gitignore` 删掉 `!gradle/wrapper/gradle-wrapper.jar` 与 `!gradle-wrapper.jar` 两条(本项目用 Maven) |
| F-016 | note | T029 写明「开工前先确认开发者控制台与「蓝蜡烛」可用性」;plan 的 T-V6 同步,与 T-V1 同源 |
| F-017 | note | **新增 T046**:里程碑校验三层 gitlink 与提交顺序(宪法第七/九条的验收落点),依赖 T039/T042/T043/T044,排在末尾 |
| F-018 | error | 修法 a,见上节;plan 的 Constraints 与 来自规格 两节补对应条目 |
| F-021 | note | `memory/README.md` 的归属一节放宽:路径引用以 `specs/` 与 `src/` 为主,顶层配置文件(`AGENTS.md`、`.gitignore`、`.speckit/constitution.md`)只登记路径不复制内容 |
| F-022 | note | 写回目标由行号改为**锚点文本**:spec 假设两条、EC-003 一条;plan 的 Requirement Mapping 与 T-P1 同步 |
| F-023 | note | 保留 T004 现状不拆分;修法 a 又给它加了一段前置,已记为本轮接受的取舍 |
| F-024 | warning | SC-005 收窄为「游戏内实测无需读代码」,并明确资源文件一致性核对与探针类开发期检查不在其内;plan 的 Requirement Mapping 同步 |
| F-025 | warning | SC-001 补「先确认首次洗牌之前该牌已在牌组」;T025、T034 与 plan 的 T-V5 同步 |
| F-026 | warning | FR-001 正文补「不得因它缺失而报错」;T033 加 `FR-001` 标注与「选项不再出现」的验收;plan 的 来自规格 与 Requirement Mapping 同步 |

## 被否决的做法

- **(b) 的四个形态**:逐条理由见上;
- **靠现行 `check-artifacts.mjs` 判断先后序与成环**:它的第 2 条只查悬空引用,环形文件也返回
  `ok:true`(见 006);因此本轮另写临时脚本核对了 46 个任务的「依赖全部前置 + 无环」,
  输出 `ok:true / problems:[]` 后**删除脚本**(T043 会把这两项并入常驻检查器,不另立第二套工具);
- **把 F-012 一并改掉**:证据不足,改接口名属猜测,宁可留一条 note。

## 门禁实测(改动后)

```
select-tasks   : exit=0 ok=true tasks=46 incompleteDependencies=0 diagnostics=0
derive-stage   : exit=0 ok=true stage=tasked spec=valid plan=valid tasks=valid tasks=46 diagnostics=0
check-artifacts: exit=0 ok=true tasks=46 requirements=29 problems=[]
临时依赖图核对 : ok=true tasks=46 problems=[](依赖全部前置、无环;脚本已删)
```

改前为 45 个任务;新增 T046 后 46,编号仍连续、依赖仍全部前置。

## 提交与下一步

- **specs 层 `db482e6`**（本轮三个工件:`spec.md` / `plan.md` / `tasks.md`);memory 层与本日志随本轮一并提交,
  顶层在同一次提交里推进 `specs/` 与 `memory/` 两个指针(宪法第九条:先层后顶层)。
- 顶层 `.gitignore` 的两条 gradle wrapper 白名单也在本轮移除,随顶层提交。
- 未纳入本批、留给下一轮:`F-012`(接口名,待 T003 对照 BaseMod jar 后定)。

下一步顺序:

1. **人工**把 ModTheSpire 加载器与 BaseMod、StSLib 装进游戏目录 `mods/`,截图或日志存 `memory/log/`
   (这是 T002 的运行期前置,也是 T004 开工的前提);
2. 按门禁扩展(T043)把先后序与成环检查并入常驻检查器,再复跑三条门禁;
3. 本批已提交但**尚未推送**(沙箱连不上 GitHub,推送需在普通终端执行),随后做云端复原验证;
4. 第五轮 `/speckit-analyze` 复核 error 与 warning 是否清零(T046 与 F-012 两条留给它复核)。
