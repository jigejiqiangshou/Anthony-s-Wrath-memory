# f023 — 核塔 1 的随机诅咒来源与移除入口实际落点：随机诅咒走 `CardLibrary.getCurse`（私有 `curses` 映射），移除候选全经 `getPurgeableCards`（净化之泉例外）

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 杀戮尖塔 1 桌面版 V2.3.4（`desktop-1.0.jar` 12-18-2022）+ BaseMod 5.56.0 的 `@NoPools` 机制；换版本须重跑同一批反汇编。适用于「让一张自注册诅咒牌不被随机诅咒来源发出、不被任何移除途径删除」的 mod 实现。

**结论**

- **随机诅咒来源不读 `curseCardPool`**：`AbstractDungeon.returnRandomCurse()` = `CardLibrary.getCurse().makeCopy()` + `UnlockTracker.markCardAsSeen`；`returnTrulyRandomCardFromAvailable(...)` 与 `transformCard(...)` 的诅咒分支分别调用 `CardLibrary.getCurse()` / `CardLibrary.getCurse(AbstractCard avoid, Random rng)`。两个重载都遍历 **私有 `CardLibrary.curses` 映射**（`HashMap<String,AbstractCard>`），只硬编码排除 `AscendersBane` / `Necronomicurse` / `CurseOfTheBell` / `Pride`，再以 `AbstractDungeon.cardRng` 从 `CardLibrary.cards` 取实例。引用 `curseCardPool` 的类只有 `AbstractDungeon` 自己（`addCurseCards` 填充、`initializeCardPools` 生成 `srcCurseCardPool` 快照、`getCard(CardRarity.CURSE)` / `getCardFromPool`）。
- **BaseMod 的池排除机制**：`@NoPools`（`basemod.patches.com.megacrit.cardcrawl.dungeons.AbstractDungeon.NoPools`，`@Target(TYPE)` / `@Retention(RUNTIME)`）由 BaseMod 的 `RemoveExcludedCardsFromPools`（postfix `AbstractDungeon.initializeCardPools`）按「卡牌类是否带注解」从 10 个池（含 `curseCardPool`、`srcCurseCardPool`）移除实例。它**只清池**，对 `CardLibrary.getCurse()` 无效——两层必须同时做（池一致性 + `getCurse` 过滤）。
- **移除候选入口统一走 `CardGroup.getPurgeableCards()`**：全库 7038 个 class 中「同时含 `masterDeck` 与 `removeCard`」的 25 个类逐一归并后，所有「候选网格 → 删除」型 UI（商店移除、Peace Pipe、Empty Cage、Astrolabe、Neow 的移除/变化奖励、Cleric、GoldenWing、BackToBasics、Beggar、DrugDealer、LivingWall、Bonfire、Designer、NoteForYourself、PurificationShrine、Transmogrifier、GremlinWheelGame、WeMeetAgain 的 relic 交换）都先取 `getPurgeableCards()`；本体给三张参照诅咒做不可移除的硬编码判定也在这个方法里。
- **净化之泉是唯一例外**：`FountainOfCurseRemoval.buttonEffect(int)` 自建 `masterDeck.group` 从尾向头的循环，条件 = `type==CURSE` 且非 bottled 且 cardID 不是三张参照牌；命中即 `PurgeCardEffect` + `logMetricRemoveCards` 的 metric + `masterDeck.removeCard`，**不经过** `getPurgeableCards()`。
- **其余直接删除点由本体自身按类型/稀有度排除诅咒**：`Falling` 用 `CardHelper.returnCardOfType(ATTACK/SKILL/POWER)` 生成三选一；`WeMeetAgain.getRandomNonBasicCard()` 排除 `BASIC` 与 `CURSE`；`Vampires.replaceAttacks()` 只删 Strikes；`CardGroup.removeCard(String)` 仅被 `AbstractDungeon.srcTransformCard` 用于变化流程（变化路径必须保留，不可拦截）。

**验证方法（2026-10-29）**

- `javap -p -c -classpath libs/desktop-1.0.jar`：`AbstractDungeon.returnRandomCurse` / `returnTrulyRandomCardFromAvailable` / `transformCard` / `initializeCardPools` / `addCurseCards` / `getCard(CardRarity)` / `getCardFromPool`；`CardLibrary.getCurse` 两个重载与 `CardLibrary.add`、`curses` 字段（private static）；`CardGroup.getPurgeableCards`；`FountainOfCurseRemoval.buttonEffect`。
- 常量池扫描：全库 7038 个 class 中同时命中 `masterDeck` + `removeCard` 的 25 个类（枚举与归类见 `memory/log/030` §2.3）；引用 `curseCardPool` 的仅 `AbstractDungeon`。
- `javap -p -c -classpath libs/BaseMod.jar`：`basemod.patches.com.megacrit.cardcrawl.dungeons.AbstractDungeon.RemoveExcludedCardsFromPools` 的 10 池移除循环；`NoPools` 注解的 Target/Retention 经 `javap -v` 核对。
- 项目内落地与离线自检：`memory/log/029`（T027 两层实现）、`memory/log/030`（T029/T030/T031 拦截点与枚举）。

**用途**: 001-anthonys-wrath T027（随机诅咒来源过滤）与 T029~T031（不可移除拦截）的实现依据；T028 / T034 / T041 的判读口径。

**evidence**: `memory/log/029-20261029-us4-implementation.md`；`memory/log/030-20261029-us5-implementation.md`；`specs/001-anthonys-wrath/research.md` §R-007（Correction）与 §R-008（Implemented）
