# f011 — 读档会重建 curseCardPool，但不触发 PostDungeonInitialize 钩子

## 结论

- `AbstractDungeon.initializeCardPools()` **内部调用私有 `addCurseCards()`**，后者遍历 `CardLibrary.cards` 把所有 `CardType.CURSE` 收进 `AbstractDungeon.curseCardPool`（硬编码排除 `Necronomicurse` / `CurseOfTheBell` / `AscendersBane` / `Pride`）。
- `initializeCardPools()` 在**新档与读档两种路径都会执行**；但 BaseMod 的 `PostDungeonInitializeSubscriber` **只在新建档路径触发，读档路径不触发**。
- `StartGameSubscriber` 在新档与读档**都触发**，且两者都晚于 `initializeCardPools()`（新档 5–16 ms、读档约 3 ms）。因此「把某张诅咒移出随机诅咒池」的落点应选 `StartGameSubscriber`（或直接对 `initializeCardPools()` 打后置补丁），**不能只用 `PostDungeonInitialize`**：否则读档后池被重建、本牌重新进入随机诅咒来源，违反 FR-011 / EC-010。

## 验证方法

- 游戏内探针 `awprobe.log`（2026-10-24，654 行）：4 次开局事件（新档 2：`floor=0`；读档 2：`floor=2` / `floor=3`，且无 `initializeStarterDeck`、牌组沿用存档）。4 次全部有 `patch.initializeCardPools.before/after`，池内容稳定为 10 张原版诅咒、顺序固定。`hook.PostDungeonInitialize` 仅出现在 2 次新档（分别晚于池初始化 43 ms / 10 ms）；`hook.StartGame` 4 次都有且都在 `initializeCardPools.after` 之后。过程与行号见 `memory/log/018`。
- 反汇编 `javap -p -c` 本机 `desktop-1.0.jar`：`AbstractDungeon.initializeCardPools()` 的偏移 116 有 `invokespecial addCurseCards`；`AbstractDungeon.addCurseCards()` 遍历 `CardLibrary.cards` 并按四个 cardID 过滤。
- BaseMod 5.56.0 钩子发布行为由 `libs/BaseMod.jar` 实物接口与上述日志核对。

## 适用范围

杀戮尖塔 1 桌面版 **V2.3.4 (12-18-2022)** + **BaseMod 5.56.0** + ModTheSpire 3.30.3；换版本或换 BaseMod 后必须重跑同样采集。结论只描述钩子触发与池重建时序，不涉及其它池（common/uncommon/rare/colorless 的初始化路径相同，但未单独验证）。
