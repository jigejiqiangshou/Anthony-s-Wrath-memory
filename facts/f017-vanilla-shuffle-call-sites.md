# f017 — 原版 V2.3.4 洗牌调用点全集：所有牌堆洗牌都经 `CardGroup` 的两个原语

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 杀戮尖塔 1 桌面版 V2.3.4（`libs/desktop-1.0.jar`，2022-12-18）。换游戏版本或换 jar 后必须重跑同一扫描；结论只覆盖原版本体代码，不含其它 mod。

**verified（方法，2026-10-24）**：用 .NET `ZipArchive` 逐条读取 `desktop-1.0.jar` 全部 7038 个 `.class`，按常量池字符串筛出同时含 `com/megacrit/cardcrawl/cards/CardGroup` 与 `shuffle` 的 27 个候选类；再对每个候选执行 `javap -p -c` 枚举 `CardGroup.shuffle` 的真实调用点并记录所在方法；对全库含 `java/util/Collections` + `shuffle` 的 24 个候选类同样枚举 `Collections.shuffle` 的调用上下文。未依赖运行期观测。

**结论**

1. 全库只有 **8 处** `CardGroup.shuffle` 调用点：
   - `CardGroup.initializeDeck`（同类调用）→ 对 `new CardGroup(masterDeck, DRAW_PILE)` 的临时组调 `shuffle(Random)`；随后按索引 0→尾 `drawPile.addToTop` 搬入；
   - `EmptyDeckShuffleAction.update` → `player.discardPile.shuffle(shuffleRng)`；随后 `Soul.shuffle` 把索引 0→尾依次 `drawPile.addToTop`；
   - `ShuffleAction.update` → 对构造时传入的 `group` 调 `shuffle()`；实际调用方为 `Reboot` 与 `DeepBreath`，传的都是 `player.drawPile`；
   - `ShuffleAllAction.update` → `player.discardPile.shuffle(shuffleRng)`（调用方 `Reboot`）；
   - `UpgradeRandomCardAction.update`、`DrawPileToHandAction.update`、`TwistingMind.onPlayerEndTurn`、`CardLibrary.getAnyColorCard`（两个重载共 2 处）→ 都只洗新建的 `CardGroupType.UNSPECIFIED` 暂存组（随机抽选/随机取牌用），不是牌堆。
2. 全库 **没有**任何一处用 `Collections.shuffle` 直接洗 `player.drawPile.group` 或 `player.discardPile.group`。命中 `Collections.shuffle` 的都是克隆的手牌列表、遗物/药水池、事件暂存列表、事件自己的卡组（`GremlinMatchGame`）与升级抽选列表。
3. 因此：对两个洗牌原语挂 postfix（并只对 `DRAW_PILE` / `DISCARD_PILE` 生效）即可覆盖**全部**原版牌堆洗牌路径；`UNSPECIFIED` 暂存组必须跳过，否则会改变随机取牌/随机升级等原版行为。卡牌/遗物触发的非耗尽重洗真实样本是 `Reboot` / `DeepBreath`。
4. 位置映射：两条「洗后组 → 抽牌堆」搬运路径都保持索引序（0→尾 `addToTop`），所以被洗组索引 0 即 `drawPile` 索引 0 = 底部（与 f010 的抽牌方向一致）。

**evidence**: `memory/log/023` §2；`specs/001-anthonys-wrath/research.md` §R-004 的 Implemented 段；实现见 `src/main/java/anthonyswrath/patches/vanilla/CardGroupShufflePatch.java` 与 `src/main/java/anthonyswrath/run/DrawPileOrdering.java`。
