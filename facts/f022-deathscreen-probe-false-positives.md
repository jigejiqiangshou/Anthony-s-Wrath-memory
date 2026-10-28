# f022 — `patch.deathScreen.*` 探针的假阳性来源：第三方「快速重开按钮」的评分重开与本体放弃流程

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 本机游戏环境（核塔 1 V2.3.4 + 15 个创意工坊 Mod，含「快速重开按钮」`quickRestart`，创意工坊 ID `1805046408`）下判读 `awprobe.log` 的 `patch.deathScreen.*`。用于 T041 完整回归以及任何「死亡结算」证据的归属判断；换 Mod 清单或换游戏版本须重采。

**结论**

- **第三方「快速重开按钮」的评分重开会构造 `DeathScreen`**：`quickRestart.QuickRestart implements PostRenderSubscriber`；`receivePostRender` 在 `RestartRunHelper.queuedScoreRestart` 为真时调用 `RestartRunHelper.scoreAndRestart()`，该方法执行 `AbstractDungeon.deathScreen = new DeathScreen(AbstractDungeon.getMonsters())` 后立刻 `restartRun()`（重开新局）。日志特征：
  - `patch.deathScreen.before` 的 `isDead=false`、`hp` 为满血、`hand/draw` 无本牌入手；
  - caller 可见部分为 `BaseMod.publishPostRender:2397 <- RenderHooks$PostRenderHook.Insert:72 <- CardCrawlGame.render:486`（探针 caller 过滤器只保留 `com.megacrit` / `basemod` 帧，`quickRestart` 帧被滤掉）；
  - 同进程 60–80 ms 内出现下一次 `hook.PreStartGame`；
  - 游戏日志同一时刻有 `QuickRestart: Scoring and run restart has been initialized. (Settings)` → `Run has been scored.` → `Dungeon has been reset.`（游戏日志为 UTC，`awprobe.log` 为 UTC+8）。
- **本体「放弃本局」本身也会构造 `DeathScreen` 并计为失败**：调用链 `DeathScreen.<init> <- ConfirmPopup.yesButtonEffect:264 <- ConfirmPopup.updateYes:149 <- ConfirmPopup.update:135 <- SettingsScreen.update:29`，`isDead=true`；该局照常在 `runs/<CLASS>/<time>.run` 里记为 `victory=false`。
- **归属判读规则**：一条 `patch.deathScreen.*` 只有在「caller 链含 `CardGroup.addToHand` / `CardGroup.addToTop`」或「同局日志里紧邻一次本牌入手（`patch.addToHand` / `patch.addToTop(hand)` 的 card=本牌）+ 本补丁落地」时才算本功能判负；`isDead=false` 且无本牌入手的一律视为第三方/本体流程造成，不计入 US3 / T025 证据。

**验证方法（2026-10-29）**

- `awprobe.log`（727 行 / 541 事件）：`#185/#186` 与 `#405/#406` 的 `isDead=false` 记录，其后 74–76 ms 出现 `hook.PreStartGame`；`#308/#309` 与 `#540/#541` 的 `ConfirmPopup` 链记录。
- 游戏日志 `sendToDevs/logs/SlayTheSpire.log`：`16:08:31.994` / `16:24:43.840`（UTC）= 本地 `00:08:31` / `00:24:43` 的 `QuickRestart: Scoring and run restart has been initialized. (Settings)`。
- `javap -p -c quickRestart.jar`：`quickRestart.QuickRestart.receivePostRender` → `RestartRunHelper.scoreAndRestart` 的 `invokespecial DeathScreen."<init>"(MonsterGroup)`，以及 `RestartRunHelper.restartRun` 的重开序列。
- `runs/WATCHER/*.run`：放弃局（`1793205200.run`）与快速重开局均 `victory=false`；本牌判负局 `1793204894.run` / `1793205055.run` 的 `master_deck` 含两张本牌。

**用途**: T025 判据修正（`memory/log/028`）与 T041 回归判读；`specs/001-anthonys-wrath/quickstart.md` §4 的 2026-10-29 结果块「第三方 Mod 干扰」段。

**evidence**: `memory/log/028-20261029-t025-acceptance.md`；`specs/001-anthonys-wrath/quickstart.md` §4（2026-10-29 结果块）
