# f020 — 杀戮尖塔 1 的「本局失败」落点：`isDead` + `new DeathScreen(getMonsters())` + `currentHealth = 0`

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 杀戮尖塔 1 桌面版 V2.3.4（`desktop-1.0.jar` 12-18-2022）战斗内的「立即判负」。换游戏版本须重跑同样的反汇编再采信。适用于任何需要在战斗内立刻结束本局的 mod 效果（本项目的 user story 3 即用它）。

**结论**

- 本体**没有**独立的 `AbstractDungeon.fail(...)` 方法；失败结算由 `DeathScreen` 的构造器驱动。
- `AbstractPlayer.damage(DamageInfo)` 在玩家血量归零且没有复活资源时执行（`javap -c -p` 偏移 **1102~1136**）：
  1. `player.isDead = true`
  2. `AbstractDungeon.deathScreen = new DeathScreen(AbstractDungeon.getMonsters())`
  3. `player.currentHealth = 0`
  4. 若 `currentBlock > 0` → `player.loseBlock()`（并追加 `HbBlockBrokenEffect` 视觉）
- `DeathScreen` 构造器完成本体失败流程的全部状态变化：`getCurrRoom().clearEvent()`、`resetScoreChecks()`、`AbstractDungeon.is_victory = false`、遍历手牌 `unhover()`、关闭地图、`screen = CurrentScreen.DEATH`、黑色遮罩、`isScreenUp = true`、计算死亡文案/横幅、切换死亡音乐、`StatsScreen.incrementDeath(getCharStat())`、`submitDefeatMetrics(monsters)`、`SaveHelper.shouldDeleteSave()` 时 `SaveAndContinue.deleteSave(player)`、解锁进度 / 排行榜 / 统计 UI、返回主菜单按钮。
- `AbstractDungeon.update()` 的 screen 分支在 `screen == DEATH` 时**只**调用 `DeathScreen.update()`（偏移 480 起），战斗更新、动作队列与玩家操作全部停止；`DeathScreen.update()` 在 `deathAnimWaitTimer` 归零后调用 `player.playDeathAnimation()`。因此「玩家可见的失败结算 + 失败记录」都由本体给出。
- 推论：**要立即判负，只需直接执行上面 1~3（4 可选）**，即可复用本体流程；**不要**调用 `player.damage(...)`——同一方法在偏移 960~1101 有 Lizard Tail / FairyPotion / Mark of the Bloom 的复活分支（会把致命伤变成回复、判负不成立），并且会触发受伤类遗物 / 能力副作用。

**验证方法（2026-10-24）**

`javap -c -p -classpath libs/desktop-1.0.jar`：

- `com.megacrit.cardcrawl.characters.AbstractPlayer`：方法 `damage` 的死亡分支偏移 1102~1136（`putfield isDead` / `new DeathScreen` / `putstatic AbstractDungeon.deathScreen` / `putfield currentHealth` / `loseBlock`）与复活分支偏移 960~1101（三个 ID 字符串与 `if_icmpne`）。
- `com.megacrit.cardcrawl.screens.DeathScreen`：构造器（`<init>(MonsterGroup)`）内对 `AbstractDungeon.screen`、`incrementDeath`、`submitDefeatMetrics`、`deleteSave` 等的调用；`update()` 内偏移 908 调用 `AbstractPlayer.playDeathAnimation`。
- `com.megacrit.cardcrawl.dungeons.AbstractDungeon`：`update()` 的 switch 分支在 `CurrentScreen.DEATH` 处调用 `deathScreen.update()`。
- 常量池扫描：`screens/DeathScreen` 仅被 `AbstractPlayer` / `AbstractDungeon` / `SpireHeart` / `Metrics` / `TopPanel` 等少量类引用，赋值点只有 `AbstractPlayer`。

**用途**: 001-anthonys-wrath US3 的 `run/DefeatOnDraw`（T021）直接复刻该分支，见 `research.md` §R-005 Implemented 与 `memory/log/027`。

**evidence**: `memory/log/027-20261024-us3-implementation.md`；`specs/001-anthonys-wrath/research.md` §R-005 Implemented
