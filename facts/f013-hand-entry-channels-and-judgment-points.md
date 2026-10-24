# f013 — 杀戮尖塔 1 的「牌进入手牌」通道与最小判定点集

## 结论

实测到的全部入手通道（按调用栈区分）：

| 通道 | 样本 | 调用栈（关键帧） | 是否触发 `PostDraw` |
| :-- | :-- | :-- | :-- |
| 普通抽牌 | 80 次 | `CardGroup.addToHand:218 <- AbstractPlayer.draw:2071 <- draw:2098 <- DrawCardAction.update:146` | 是 |
| 临时牌入手 | 6 次（Miracle） | `CardGroup.addToHand:218 <- ShowCardAndAddToHandEffect.<init>:67 <- MakeTempCardInHandAction.addToHand:102` | 否 |
| 抽牌堆→手「检索」 | 2 次（Secret Technique） | `CardGroup.removeCard(drawPile) <- SkillFromDeckToHandAction.update:54/:78` → `CardGroup.addToTop(hand) <- ...:55/:79` | 否 |
| 弃牌堆→手「检索」 | 1 次（Meditate） | `CardGroup.addToHand:218 <- MeditateAction.update:84` → `CardGroup.removeCard(discardPile) <- MeditateAction.update:86` | 否 |
| Retain 回手 | 10 次（Miracle 保留） | `CardGroup.addToTop(hand) <- RestoreRetainedCardsAction.update:26` | 否 |

推论：

- **不存在单一共同判定点**：抽牌堆检索绕过 `addToHand`，弃牌堆取牌与普通抽牌走 `addToHand`；`PostDrawSubscriber` 只覆盖普通抽牌。
- 覆盖全部实测通道的最小判定点集 = **`CardGroup.addToHand` postfix** + **`CardGroup.addToTop` postfix 且目标组是 `player.hand`**；两处都必须按 cardID 过滤（Retain / 临时牌是噪声）。
- `CardGroup.addToBottom` 指向手牌的通道两轮均未触发（探针已布观测补丁，保留以防第三方效果）；如出现再补第三个判定点。

## 验证方法

- 两轮游戏内探针 `awprobe.log`（2026-10-24；654 + 250 行）按 `patch.addToHand` / `patch.addToTop(hand)` / `patch.draw(int)` / `hook.PostDraw` / `patch.removeCard(obj)` 的 caller 栈归类：普通抽牌 80、临时牌 6、抽牌堆检索 2、弃牌堆检索 1、Retain 10；抽牌堆检索与弃牌堆检索的差异由 `MeditateAction` 与 `SkillFromDeckToHandAction` 两条不同调用栈直接证明。过程见 `memory/log/018`、`memory/log/019`。
- 反汇编 `javap -p -c` 本机 `desktop-1.0.jar`：`CardGroup.addToHand`、`CardGroup.addToTop`、`CardGroup.removeCard`、`SkillFromDeckToHandAction.update`、`MeditateAction.update`、`AbstractPlayer.draw`。

## 适用范围

杀戮尖塔 1 桌面版 **V2.3.4 (12-18-2022)**；只描述「原版及常规 mod 效果」的入手路径。换游戏版本后需重跑探针收集同样的 caller 栈再采信。结论用于「入手即判负」类功能的判定点选择（本功能 FR-008 / EC-008）。
