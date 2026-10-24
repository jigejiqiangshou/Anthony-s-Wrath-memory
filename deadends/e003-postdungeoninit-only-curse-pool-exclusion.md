# e003 — 只靠 PostDungeonInitializeSubscriber 排除 curseCardPool

## 路线

把「把本牌移出随机诅咒池」实现为仅订阅 `PostDungeonInitializeSubscriber.receivePostDungeonInitialize`，在其中从 `AbstractDungeon.curseCardPool` 移除本牌。

## 失败原因

1. `AbstractDungeon.initializeCardPools()` 在**新档与读档都会执行**，内部调用 `addCurseCards()` 重建 `curseCardPool`；
2. `PostDungeonInitialize` 钩子**只在新建档路径触发**（2026-10-24 探针：4 次启动中 2 次读档全部没有该钩子，而 `initializeCardPools` 照常执行）；
3. ⇒ 玩家「存档 → 退出 → 继续」后，本牌会重新进入随机诅咒池，违反 FR-011 / EC-010。

## 替代路线

改用 `StartGameSubscriber.receiveStartGame`（新档与读档都触发，且都在池重建之后），或对 `AbstractDungeon.initializeCardPools()` 打后置补丁（`patches/vanilla/`）。详见 `memory/facts/f011` 与 `specs/001-anthonys-wrath/research.md` §R-007。

## 重新启用的条件（reopenIf）

- BaseMod 改变 `PostDungeonInitialize` 的发布语义，使其在读档路径也触发；或
- 本体在某个**读档也触发**的钩子里再次重建 `curseCardPool`，且时序被证明仍晚于该钩子；或
- 确认读档路径不再调用 `initializeCardPools`（游戏版本行为变化，须重新采集验证）。

## 证据

- 游戏内探针 `awprobe.log`（2026-10-24）：`hook.PostDungeonInitialize` 仅 2 次（新档，晚于池初始化 43 ms / 10 ms）；局3/局4 读档（`floor=2` / `floor=3`）无该钩子而有 `initializeCardPools`。过程见 `memory/log/018`。
- 反汇编：`AbstractDungeon.initializeCardPools()` 调用 `addCurseCards()`（`memory/facts/f011`）。
