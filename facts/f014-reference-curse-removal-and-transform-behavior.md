# f014 — 参照牌「铃铛的诅咒」的不可移除与变化行为（游戏内实测）

## 结论

1. **候选列表排除（方法级）**：`player.masterDeck.getPurgeableCards()` 在 masterDeck 含 `CurseOfTheBell` 时返回的列表**不含**它（12 张牌组 → 11 张候选）。原因：`CardGroup.getPurgeableCards()` 硬编码排除 `Necronomicurse` / `CurseOfTheBell` / `AscendersBane`（与 `memory/facts/f005` 反汇编一致）。
2. **商店移除链路**：进入商店「移除卡牌」界面时调用 `ShopScreen.updatePurgeCard → ShopScreen.purchasePurge:1204 → CardGroup.getPurgeableCards`；实际删除一张普通牌时走 `ShopScreen.updatePurge:329 → player.masterDeck.removeCard(AbstractCard)`，即 **候选过滤 + `CardGroup.removeCard(AbstractCard)`** 两个落点。参照牌既不进候选、也不会被删。
3. **变化行为**：`AbstractDungeon.transformCard(CurseOfTheBell, true)` 返回 `transformedCard` = 其它随机诅咒（实测两次：`Parasite`、`Doubt`，均为 `CardType.CURSE`）；参照牌**自身永不作为变化结果**——`CardLibrary.getCurse()` 与 `AbstractDungeon.curseCardPool` 都硬编码排除它。即：参照牌可被变化，但只会变成「别的」诅咒。
4. 净化之泉（`FountainOfCurseRemoval`）、休息点移除、`CardGroup.removeCard(String)` 重载本轮未触发，仍以 f005 的反汇编结论为准，留实现后 QS-11 实测。

## 验证方法

- 第二轮游戏内探针 `awprobe.log`（2026-10-24，250 行）：`awprobe bell` / `awprobe addcard CurseOfTheBell` 把参照牌加入 masterDeck 后，`awprobe purge` 打印 `masterDeck`（含它）与 `purgeable`（不含它）；商店内移除时 `patch.getPurgeableCards` / `patch.removeCard(obj)` 记录到 `ShopScreen.purchasePurge:1204` / `ShopScreen.updatePurge:329` 调用栈；`awprobe transform bell` 触发 `patch.transformCard.before/after` 两次，结果为 `Parasite` / `Doubt`。过程见 `memory/log/019`。
- 反汇编 `javap -p -c` 本机 `desktop-1.0.jar`：`CardGroup.getPurgeableCards`、`AbstractDungeon.addCurseCards`、`CardLibrary.getCurse`（f005）。

## 适用范围

杀戮尖塔 1 桌面版 **V2.3.4 (12-18-2022)**；用于本功能 US5 的「不可移除」与「变化一致性」实现（拦截点必须与参照牌相同，不能多也不能少）。换游戏版本后需重跑同样实测。不适用于杀戮尖塔 2（2 代有 Eternal 关键词，语义不同）。
