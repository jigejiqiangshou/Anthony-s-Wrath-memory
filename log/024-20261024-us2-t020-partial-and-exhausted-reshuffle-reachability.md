# 024 — US2 部分实测（QS-03 通过）+「抽牌堆耗尽重洗」成品不可达的澄清

日期：2026-10-24 20:02–20:12
状态：用户重建并覆盖 jar 后完成部分 T020 实测；用户指出并复核了一个逻辑问题——成品中「抽牌堆耗尽重洗」不可达。验收范围已在 spec / research / quickstart / tasks 澄清；剩余 T020 项待用户继续执行。
依据：用户 2026-10-24 20:02 消息 + 工作区 `awprobe.log`（20:00:49~20:01:14，73 行）。

## 1. 本次实测到的事实（探针版，US3 未实装）

`awprobe.log`（GBK，73 行）：观者 + Draft + 本选项，20:00:49 开局，20:00:59 进第一场战斗（masterDeck=16，含 1 张本牌），20:01:14 结束采集。

- **QS-03 通过**（首次洗牌置底）：
  - #15 `patch.shuffle(Random).before` 临时 `DRAW_PILE` 组（16 张，本牌在 masterDeck 序 0）；
  - #16 `patch.shuffle(Random).after` 之后本牌在索引 0；#17 `patch.initializeDeck.after`、#18 `patch.preBattlePrep.after`、#19 `hook.StartBattle`（`[after first shuffle, before initial draw]`）的 drawPile 均显示 `0:anthonyswrath:AnthonysWrath`；
  - #43 `awprobe drawpile`（首洗后、摸 5 张后）仍为 `0:anthonyswrath:AnthonysWrath`。
- **QS-04 第一次（牌触发、非耗尽重洗）通过**：
  - #45 `awprobe shuffleaction` 洗前本牌索引 0；#47 `patch.shuffle().before` 同前；
  - #48 `patch.shuffle().after`（探针后处理）显示本牌索引 4；#50 `awprobe drawpile` 显示 `0:anthonyswrath:AnthonysWrath`。
  - 结论：`ShuffleAction(drawPile)`（`Reboot` / `DeepBreath` 用的真实牌触发路径）重洗后置底成立。**注意**：探针的后处理日志可能早于本 mod 的置底后处理（这里就是），不能拿 `patch.shuffle().after` 当判据；以最终状态日志 / `awprobe drawpile` 为准。
- 其他对照：`#6` curseCardPool=11 含本牌（T027 处理，预期内）；`#8~#9` Draft 空牌组注入 1 张后填充到 16（US1 行为未回归）。

## 2. 用户提出的逻辑问题与复核结论

用户指出：本牌在 US3 实装后「抽到即负」，而它每次洗牌后都在牌堆底——抽空抽牌堆必然先把它抽进手里，所以「抽牌堆耗尽触发重洗后仍在底部」在成品里根本不可能出现。复核结论：**成立，且是 FR-006（置底）与 FR-008/FR-010（抽到即负、判负后短路抽牌）共同推出的必然结果**：

1. 抽牌堆耗尽的唯一方式是把它里面的每一张都移出；本牌每洗后都在索引 0（最后抽到），所以它必然是最后一张被抽的；
2. 它被抽入手中 = 触发判负；此时后续抽牌被短路，`EmptyDeckShuffleAction`（只在「向空抽牌堆抽牌」时由 `DrawCardAction` 入队）不会发生；
3. 因此成品中不会出现「洗弃牌堆 → 本牌在弃牌堆里 → 重洗后置底」的场景：能进入弃牌堆的牌来自手牌，而本牌进手牌那一刻本局已结束。
4. 由此，`Reboot` 的 `ShuffleAllAction`（洗弃牌堆）分支同样不会遇到本牌；成品中真正可观测到「洗牌后置底」的路径是：战斗开始首洗 + 卡牌/遗物触发的**抽牌堆**非耗尽洗牌（`ShuffleAction`，如 `Reboot` / `DeepBreath`）。
5. 耗尽分支仍是 FR-006/EC-001 的实现约束（「若发生」），由两个洗牌原语上的 postfix 构造性覆盖；可在 US3 实装前的探针版做一次实现期验证（注意第一次耗尽时本牌在手里，要等它进弃牌堆后的下一次耗尽才能观察到含它的重洗）。

结论已升为 `memory/facts/f018`。

## 3. 文档与验收范围修订（DEC-023）

- `spec.md`：`SC-002` 改为「至少两次重洗（成品可达类型：牌/遗物触发的非耗尽重洗）」；US2 叙事与场景 2、`EC-001` 标注耗尽分支成品不可达；Assumptions 增一条完整解释（置底 + 抽到即负 → 抽空必先抽到 → 空堆重洗不发生）。
- `research.md` §R-004：新增 **Reachability（2026-10-24）** 段（推导、实现仍覆盖、探针版可选验证、可观测路径清单）。
- `quickstart.md` §4：QS-04 行改为「两次非耗尽重洗」；T020 步骤重写（含探针日志顺序陷阱、QS-03/QS-04 已测证据、QS-05+QS-17 合并到下一场战斗、可选的耗尽两轮验证步骤与原因）。
- `tasks.md` T020：追加部分实测与范围修订说明，仍不勾选（剩余 QS-04 第二次、QS-05、QS-17、sinktest）。
- 代码：探针 `ProbeLog.TRACKED` 补上完整 cardID `anthonyswrath:AnthonysWrath`（此前短 id 导致 `tracked={none}`，2026-10-24 日志 #48 可见）；`ProbePatches` 类注释写明「探针 shuffle after 可能早于 mod 置底后处理，判据看最终状态」。JDK8 `javac` 重编 exit 0（30 class）。这两处仅开发期代码（T035 删除）。

## 4. 下一步（用户，当前 jar 无需重建）

1. 同场战斗再执行一次 `awprobe shuffleaction` → `awprobe drawpile`，补足 QS-04 的「至少两次重洗」。
2. 不抽到本牌结束第一场战斗；地图界面 `awprobe addcard anthonyswrath:AnthonysWrath` → 进下一场战斗：`awprobe drawpile` 应见两张副本连续位于索引 0、1（QS-05），同时验证第二场战斗重新置底（QS-17）。
3. 任一时刻 `awprobe sinktest` → 期望 `summary pass=4/4`；顺手复核 QS-01 中文文案。
4. （可选）按 quickstart 步骤 7 做一次耗尽重洗实现期验证（US3 实装前最后一次机会）。
5. 交回 `awprobe.log`；收到后判定 T020、勾选并进入 US3（T021 入手判定）。

## 5. 本轮提交（未推送；推送顺序 src → specs → memory → 顶层）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `src` | 探针 TRACKED 完整 cardID + 日志顺序说明（开发期） |
| 2 | `specs` | spec 可达性澄清、research Reachability、quickstart QS-04/T020、tasks T020 |
| 3 | `memory` | 本记录 + f018 + state.json |
| 4 | 顶层 | 推进 gitlink |
