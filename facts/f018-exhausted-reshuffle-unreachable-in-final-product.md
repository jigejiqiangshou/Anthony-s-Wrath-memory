# f018 — 成品中「抽牌堆耗尽重洗」不可达（置底 + 抽到即负的必然结果）

**status**: stale

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 「安东尼之怒」功能的**成品行为**（FR-006 置底 + FR-008 抽到即负 + FR-010 判负后短路抽牌同时生效时）。不适用于 US3 关闭的开发期探针版——探针版里可以人为构造该场景做实现期验证。换功能设计（例如不再置底、或判负改为延迟结算）即失效。

**verified（方法，2026-10-24）**：由已验证前提联合推导 + 原版调用链核对，而非直接实测：
1. f010：`drawPile` 索引 0 = 底部（最后抽到），且 `AbstractPlayer.draw(int)` 从 `getTopCard()`（末位）取牌；
2. f017：洗牌原语只有两个，置底后本牌位于被洗组索引 0；`EmptyDeckShuffleAction` 只在 `DrawCardAction` 向**空**抽牌堆抽牌时入队（`DrawCardAction.update` 中 `drawPile.size()`/`isEmpty()` 判定），并洗 `discardPile` 后搬回抽牌堆；
3. FR-006：每洗后本牌在抽牌堆底部 ⇒ 它必然是抽牌堆中最后一张被抽的牌；
4. FR-008/FR-010：本牌进入手中即判负，判负后不再处理抽牌 ⇒ 抽牌堆被抽空的瞬间已经是死亡，空堆上不会再有抽牌动作。
推论：成品中不存在「弃牌堆含本牌 + 抽牌堆耗尽 → 洗弃牌堆」的时序；`ShuffleAllAction`（洗弃牌堆）分支同样遇不到本牌。用户 2026-10-24 20:02 提出，复核成立。

**corroboration（只到哪一步）**：2026-10-24 20:00 探针版 `awprobe.log`（US3 未实装）已证实「首洗后本牌在 drawPile 索引 0」与「抽牌从末位开始、索引 0 为最后抽到」（#16~#19、#43、#47~#50）；**该日志没有跑到抽牌堆耗尽**（结束时 discardPile=0、无 `patch.emptyDeckShuffle`），所以「耗尽的那一刻本牌在手中」是上面的推导，不是直接观测。

**为什么不是 dead-end（2026-10-24 分类裁定）**：本 skill 的契约是「No attempt, no dead end」——dead-end 只记录**真的试过并失败**的路线，`reason` 必须取自固定枚举（`api-absent` / `perf-insufficient` / `dependency-conflict` / `constraint-violation` / `conclusion-was-wrong`），且必须带 `reopenIf`。本条是在实际尝试之前由已验证机制推导出的结论，有明确方法，因此按事实入库（`status: verified`）；它「提醒未来不要重试」的作用由 `scope` 承担（成品；探针版或设计变更即失效）。若日后真的在成品/探针里尝试触发该路径并失败，再按 dead-end 契约补记（`reason: constraint-violation`，`reopenIf` 写清「US3 关闭 / 设计改为延迟判负或不置底 / 第三方 mod 或新版游戏能把牌移出抽牌堆」）。

**指针（不复制 spec 文本）**：验收口径已由 spec 承载——见 `specs/001-anthonys-wrath/spec.md` 的 Assumptions、SC-002、EC-001、US2 场景 2，以及 `quickstart.md` 的 QS-04 与 §4 说明。

## STALE 说明（2026-10-24 21:26，实测证伪）

2026-10-24 21:22~21:26 的 T020 探针版实战（`memory/log/026`）直接推翻了本条结论：

- 本牌在整局中**从未**经 `addToHand` / `addToTop(hand)` 进入手牌（日志无对应事件），却出现在第一场战斗的弃牌堆里；
- 随后抽牌堆耗尽触发 `EmptyDeckShuffleAction`，重洗弃牌堆（含本牌）后本牌落在 `drawPile` 索引 0（#106~#129），即该路径在实战中**可达**。

漏掉的前提：本条的推导默认「把牌移出抽牌堆只能靠抽到手」，但原版本体存在**不经手牌**的通道——`ScryAction` 会把抽牌堆顶若干张牌直接 `drawPile.moveToDiscardPile`（`JustLucky` / `CutThroughFate` 等 Scry 牌；当剩余张数 ≤ Scry 数时底部的本牌也会进入可选范围）。因此本条只对「没有任何从抽牌堆直接弃牌效果」的牌组成立，不能作为成品级结论。

新结论见 `memory/facts/f019`；spec / quickstart / research §R-004 已按二次修正回写（`memory/log/026`、`memory/log/024` 保留原错误判断的经过）。

