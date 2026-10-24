# f019 — 原版存在「不经手牌」的抽牌堆→弃牌堆通道（Scry）；「抽牌堆耗尽重洗」在成品中可达

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 杀戮尖塔 1 V2.3.4（`desktop-1.0.jar` 12-18-2022）的 Scry 类效果与任何调用 `player.drawPile.moveToDiscardPile(card)` 的效果。适用于「安东尼之怒」成品：若牌组含此类效果，抽牌堆耗尽重洗可达；若牌组完全没有此类效果，则抽牌堆耗尽前必先抽到本牌并判负，该路径不可达（那是 f018 的适用面，f018 已因本条转 stale）。换游戏版本或改判负/置底设计需重验。

**verified（方法，2026-10-24）**：

1. **反汇编**：`com.megacrit.cardcrawl.actions.utility.ScryAction` 先把 `player.drawPile` 顶 `min(amount, size)` 张牌移入一个 `UNSPECIFIED` 暂存组并打开选择界面；确认选择后对每张被弃的牌调用 `player.drawPile.moveToDiscardPile(card)`——`CardGroup.moveToDiscardPile` 走 `SoulGroup.discard` 视觉层，牌被**直接移出抽牌堆并放入弃牌堆，不经过手牌**。`JustLucky` 与 `CutThroughFate` 的 `use()` 都直接 `new ScryAction(magicNumber)`；当抽牌堆剩余张数 ≤ Scry 数时，位于索引 0（底部）的本牌也进入可选范围。
2. **实战**：2026-10-24 21:22–21:26 T020 探针版（观者 + Draft + 本选项）日志中，本牌**全程没有** `patch.addToHand` / `patch.addToTop(hand)`（`card=anthonyswrath:AnthonysWrath`）事件——两个入手通道的补丁均正常记录其它牌；21:23:51 抽牌堆耗尽时状态为 `draw=0 discard=10 hand=4 exhaust=2`，本牌位于 `discardPile` 索引 9（最近一次弃牌）；随后 `emptyDeckShuffle` 洗弃牌堆，本牌到索引 0，`drawPile` 从 size=1 起本牌始终在索引 0（#106~#129）。即：存在一条非入手的 drawPile→discard 转移，且随后耗尽重洗把本牌置底。
3. **结论**：含 Scry 类效果（或任何 `drawPile.moveToDiscardPile`）的牌组可以实现「本牌不在手牌、却在弃牌堆」的状态；此后抽牌堆耗尽触发的重洗会把本牌带回并（按本 mod 的置底补丁）放到抽牌堆底部。因此 FR-006 / EC-001 的「抽牌堆耗尽重洗」分支在成品中**可达**，spec 不需要把它降为不可达场景。

**旁注**: 本轮牌组含非原版卡 `Wireheading`（不在 `libs/` 的四个 jar 中，来自用户游戏目录的其它 mod），无法仅凭日志排除它参与了这次转移；但 vanilla Scry 通道已由反汇编确认，日志也确实证明了「存在非入手通道完成了 drawPile→discard 转移」。不影响本条结论。

**evidence**: `memory/log/026-20261024-t020-acceptance-and-reachability-correction.md`；`memory/facts/f017`（洗牌调用点）、`memory/facts/f010`（索引方向）；回写：`spec.md` Assumptions / SC-002 / EC-001 / US2 场景 2、`research.md` §R-004 Reachability、`quickstart.md` §4。
