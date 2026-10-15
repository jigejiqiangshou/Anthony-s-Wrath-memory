# f005 — 杀戮尖塔 1 的"不可移除"与"不进随机诅咒池"都是硬编码 cardID 名单

## 结论

本体**没有**"不可移除"属性、关键词或接口。参照牌「铃铛的诅咒」的不可移除由四处硬编码 cardID 判定实现:

| 位置 | 判定 |
| :-- | :-- |
| `CardGroup.getPurgeableCards()` | 排除 `Necronomicurse` / `CurseOfTheBell` / `AscendersBane`;21 个调用者共用(商店移除、Peace Pipe、空笼、星盘、Neow、Bottled\*、篝火烟 + 12 个事件) |
| `FountainOfCurseRemoval` | 自建循环跳过同样三个 ID,把其余诅咒一次性全删(净化之泉) |
| `AbstractDungeon.addCurseCards()` | 遍历整个 `CardLibrary.cards`,把所有 `CardType.CURSE` 收进 `curseCardPool`,只排除上述三张 + `Pride` |
| `AbstractPlayer.isCursed()` | 判断"牌组里有无真正的诅咒"时同样排除这三个 ID |

推论(本项目的实现口径来源):

- 任何 cardID 不同的 mod 诅咒牌,默认**既能**出现在移除候选里,**也会**在每次开局/读档重建诅咒池时被收进
  `curseCardPool`(可能被随机诅咒来源发出);
- 要与参照牌同款,必须在同样位置拦截(补丁落在 `patches/vanilla/`),诅咒池则可优先用
  `PostDungeonInitialize` 钩子把本牌移出,不必新增补丁;
- 参照牌自身参数:费用 **-2**、`CardType.CURSE`、`CardColor.CURSE`、**`CardRarity.SPECIAL`**、
  `CardTarget.NONE`;`use()`/`upgrade()` 空实现;无 keywords。普通诅咒(如 `Injury`)用
  `CardRarity.CURSE`,参照牌刻意区分;
- "不可打出"的判定在 `AbstractCard.canUse`:诅咒类型且 `costForTurn < -1` 直接返回 false,**持蓝蜡烛
  (Blue Candle)时放行**,`BlueCandle.onUseCard` 再扣 1 点生命并置 `exhaust = true`(参照牌同样如此);
- 本体给诅咒牌进牌组走通用 Obtain 效果,不是直接 `masterDeck.addToBottom`:铃铛经
  `gridSelectScreen.openConfirmationGrid` → 确认后每张牌包成 `FastCardObtainEffect` →
  `getCurrRoom().souls.obtain(card, true)` 写入主牌组;持御守(Omamori)且有次数时该牌被取消获得。

## 验证方法

javap 反汇编本机 `desktop-1.0.jar`(Slay the Spire **V2.3.4 / 2022-12-18**,Steam 安装):

```
CardGroup.getPurgeableCards() 字节码:
  38 aload_3  getfield AbstractCard.cardID
  42 ldc "Necronomicurse"  → String.equals → ifne(跳过)
  50 ldc "CurseOfTheBell"  → ifne
  62 ldc "AscendersBane"   → ifne
  75 aload_1  getfield CardGroup.group → ArrayList.add(其余全部进入候选)
```

`AbstractDungeon.addCurseCards()` 开头即 `CardLibrary.cards.entrySet().iterator()`,循环内按
`type == CURSE` 与四条 `Objects.equals(cardID, …)` 过滤后 `curseCardPool.addToTop(card)`;
`FountainOfCurseRemoval` 自建 `masterDeck.group` 循环 + 同样三条 `Objects.equals`,命中即
`CardGroup.removeCard`(事件日志名 `"Fountain of Cleansing"`);`AbstractPlayer.isCursed()` 为同款过滤。
对全部 7038 个 class 条目做常量池扫描:含 `getPurgeableCards` 的类 22 个(1 个定义 + 21 个调用者),
含 `CurseOfTheBell` 的类 7 个。

## 适用范围

杀戮尖塔 1 桌面版 **V2.3.4 (12-18-2022)** + 本机 Steam 安装(`C:\Program Files (x86)\Steam\
steamapps\common\SlayTheSpire\desktop-1.0.jar`)。更换游戏版本后必须重跑同样的反汇编再采信。
不适用于杀戮尖塔 2:2 代有"永恒/Eternal"关键词,自带"不可移除或变化"语义。
