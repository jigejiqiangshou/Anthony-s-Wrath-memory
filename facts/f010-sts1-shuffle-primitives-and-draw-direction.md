# f010 — 杀戮尖塔 1 的洗牌原语互不转调；drawPile 索引 0 是底部

## 结论

1. `CardGroup.shuffle()` 与 `CardGroup.shuffle(Random)` 是两个**独立实现**（各自 `Collections.shuffle(group, new java.util.Random(seed))`），无参版**不转调** Random 版；要覆盖全部洗牌必须两处都挂。
2. `CardGroup.addToTop(card)` 是把牌**追加到 `group` 列表末尾**；`addToBottom(card)` 是插入到索引 0；`getTopCard()` 返回 `group.get(size-1)`。因此：
   - **drawPile 索引 0 = 牌堆底部（最后抽到），末位 = 下一次抽到**（实测 10/10 次「dump 末位先被抽走」）；
   - 「置于最底部」= 把牌放到 `group` 索引 0。
3. 首洗路径：`AbstractPlayer.preBattlePrep` → `CardGroup.initializeDeck(masterDeck)` 先新建**临时 DRAW_PILE 组**、用它洗牌（`AbstractDungeon.shuffleRng`），随后按洗后顺序填入 `player.drawPile`（非 innate 牌依序追加，innate 牌另表处理）；洗牌发生时 `player.drawPile` 为空。
4. 耗尽重洗路径：`EmptyDeckShuffleAction.update()` 第一次调用洗 `player.discardPile`，此后每次 `update()` 只搬运 1 张（从洗后弃牌堆索引 0 到末尾），经 `SoulGroup`/`Soul` 逐个移入 drawPile；抽牌堆最终顺序与洗后弃牌堆逐张一致。⇒ 把牌放到被洗**弃牌堆索引 0**，它会被最先搬运，最终落在 drawPile 索引 0（底部）。

## 验证方法

- 游戏内探针 `awprobe.log`（2026-10-24，654 行）：6 次战斗开始洗牌的调用栈 `CardGroup.shuffle <- initializeDeck:1031 <- preBattlePrep:1982`（目标为 `other(type=DRAW_PILE)`）；4 次耗尽重洗 `shuffle <- EmptyDeckShuffleAction.update:49`（目标 `player.discardPile`）；把每次 `initializeDeck.after` / 洗后 dump 与随后 `PostDraw` 序列逐张比对，抽牌方向 10/10 为「列表末位先抽走」；耗尽重洗的搬运顺序两次独立核对。过程见 `memory/log/018`。
- 反汇编 `javap -p -c` 本机 `desktop-1.0.jar`：`CardGroup.shuffle()`、`CardGroup.shuffle(Random)`、`addToTop`、`addToBottom`、`getTopCard`、`initializeDeck`、`EmptyDeckShuffleAction.update`。
- 离线 `SpirePatch` 自检确认 16 个探针补丁的目标方法与参数列表全部存在。

## 适用范围

杀戮尖塔 1 桌面版 **V2.3.4 (12-18-2022)** + 本机 Steam 安装；换版本必须重跑同样的反汇编与探针再采信。不适用于杀戮尖塔 2。索引方向只对 `CardGroup`（`group` 为 `ArrayList`）成立。
