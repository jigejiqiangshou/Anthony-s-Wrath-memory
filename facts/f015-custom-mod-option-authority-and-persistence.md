# f015 — BaseMod 5.56 自定义模式选项的注册、持久化与「本局是否选中」判定口径

## 结论

1. **构造器**：`com.megacrit.cardcrawl.screens.custom.CustomMod` 的签名是
   `CustomMod(String ID, String color, boolean isDailyMod)`。
   - 第 2 参数是**颜色**（本体取值 `"r"` 红 / `"g"` 绿 / `"b"` 蓝），不是名称；
   - 构造器内 `name` / `description` 取自
     `CardCrawlGame.languagePack.getRunModString(ID)`，即 **ID 是 `RunModStrings` 的键**；
   - 显示行 label = `FontHelper.colorString("[" + name + "]", color) + " " + description`。
2. **运行期型修正与开局改写型修正的分野**：`isDailyMod=true` 的选项进入
   `CustomModeScreen.getActiveDailyModIds()` → `CustomTrial.addDailyMods(...)`；`false` 的进入
   `getActiveNonDailyMods()`，只在 `CustomModeScreen.addNonDailyMods(...)` 里做开局牌组/遗物改写。
   本体运行期型负面修正（DeadlyEvents / Binary / Cursed Run / Elite Swarm / Lethality / Midas /
   Night Terrors / Terminal / Uncertain Future）全部是 `color="r"` + `isDailyMod=true`；
   `isDailyMod=false` 的只有 Praise Snecko / One Hit Wonder / My True Form / Starter Deck /
   Daily Mods / Blight Chests（均为开局改写）。
3. **持久化链路**（`isDailyMod=true` 才有）：新开自定义局
   `CustomModeScreen.updateEmbarkButton` → `CustomTrial.addDailyMods(getActiveDailyModIds())`
   → `CardCrawlGame.trial = trial`、`AbstractPlayer.customMods = trial.dailyModIDs()`、
   `Settings.isTrial = true`；存档时 `SaveFile` 构造器执行
   `this.custom_mods = AbstractPlayer.customMods`；读档时 `CardCrawlGame.loadPlayerSave` 执行
   `Settings.isTrial = save.is_trial`、`AbstractPlayer.customMods = save.custom_mods`。
   ⇒ **读档后仍能判断某自定义选项是否选中**的唯一现成来源就是
   `AbstractPlayer.customMods.contains(optionId)`，不需要新增存档字段。
4. **标准局 / 每日挑战不会误开**：`AbstractPlayer.customMods` 是静态字段，新开标准局不会清空
   （会残留上一局的 ID）；但 `CardCrawlGame.updateFade` 的 startOver 分支会
   `CardCrawlGame.trial = null`、`Settings.isTrial = false`。因此判定式应写
   `customMods.contains(id) && (Settings.isTrial || CardCrawlGame.trial instanceof CustomTrial)`；
   新档注入（`PostCreateStartingDeck`，读档不触发）再收紧为
   `CardCrawlGame.trial instanceof CustomTrial`。每日挑战使用自己的 `AbstractTrial` 子类，
   不是 `CustomTrial`，不会命中。
5. **对未注册 ID 的容错**：`ModHelper.setMods` 对未知 ID 取到 null 后由 `clearNulls()` 清掉；
   `SaveFile.daily_mods` 生成时跳过 null。自定义选项 ID 只是字符串，未加载本 mod 的旧档不会因
   该 ID 缺失而报错（EC-006 由本体/BaseMod 承担）。

## 验证方法

2026-10-24 对本机 `libs/BaseMod.jar`（5.56.0）与 `libs/desktop-1.0.jar`（12-18-2022）执行
`javap -p -c`，逐方法读字节码：

- `com.megacrit.cardcrawl.screens.custom.CustomMod`（构造器、`render`、`update`）；
- `com.megacrit.cardcrawl.screens.custom.CustomModeScreen`（`initializeMods`、
  `updateEmbarkButton`、`getActiveDailyModIds`、`getActiveNonDailyMods`、`addNonDailyMods`）；
- `com.megacrit.cardcrawl.saveAndContinue.SaveFile`（构造器 `custom_mods` / `daily_mods` 赋值）；
- `com.megacrit.cardcrawl.core.CardCrawlGame`（`loadPlayerSave`、`updateFade`、`setupTrialMods`）；
- `com.megacrit.cardcrawl.trials.CustomTrial`、`com.megacrit.cardcrawl.helpers.ModHelper`。

过程记录见 `memory/log/021`，落点见 `specs/001-anthonys-wrath/research.md` §R-014。

## 适用范围

本机 `libs/` 的两个具体 jar（SHA256 见 f009）：

- `BaseMod.jar` 5.56.0（7,659,408 bytes）；
- `desktop-1.0.jar` 12-18-2022（365,086,855 bytes）。

更换 BaseMod、游戏补丁或重新从创意工坊取 jar 后，必须重跑同一组 `javap` 再采信。
不适用于杀戮尖塔 2。
