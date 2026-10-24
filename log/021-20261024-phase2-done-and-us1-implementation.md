# log/021 — 2026-10-24 Phase 2 收尾（T005/T006）与 US1 实现（T007~T014）

## 1. 目标与范围

本次会话按 `memory/state.json` 的 `next` 推进：完成 Phase 2 剩余骨架（T005、T006），再实现用户故事 1 的代码（T007~T014），每步做 JDK8 `javac` 自检。T015（游戏内实测 QS-01 / QS-02 / QS-08 / QS-14）需要用户普通终端 `mvn package` 后在游戏中执行，本次不勾选。

## 2. 前置核对（冷启动）

- 记忆层：`memory/state.json` 为 schema 2、可解析；`focus` 指向 T005/T006 + US1；`blockers` 与 `next` 与任务文件一致。
- 规格层：`specs/001-anthonys-wrath/` 的 spec / plan / research / data-model / quickstart / tasks 全部可读；`checklists/requirements.md` 16/16 已勾选（PASS），无未决项。
- 仓库状态：四个工作树（top / specs / memory / src）`git status --porcelain` 均为空；上一轮两批提交已在库（未推送，`state.json` 的 `pendingPush` 仍有效）。
- 沙箱约束沿用既有事实：`git submodule` 系列命令不可用（f001）、`mvn package` 不可用（f008）、推送不可用（f007）；本次全部验证只用 `git -C`、`javac`、`javap`。

## 3. BaseMod / 本体的实物核对（决定 T005、T007、T008、T012、T014 的口径）

方法：对 `libs/BaseMod.jar`（5.56.0）与 `libs/desktop-1.0.jar`（12-18-2022）执行 `javap -p -c`，逐方法读字节码；需要对象语义时再读构造器与调用点。关键结论已升为事实 `memory/facts/f015`（选项注册与持久化）与 `f016`（文本加载与卡牌注册），此处只记过程要点：

1. **选项构造器不是「名称 + 描述」**：`com.megacrit.cardcrawl.screens.custom.CustomMod` 的签名是 `(String ID, String color, boolean isDailyMod)`。name/description 由构造器按 **ID** 调 `CardCrawlGame.languagePack.getRunModString(ID)` 取得，`color` 只进 `FontHelper.colorString("[name]", color)`。→ 选项文本必须写在 `RunModStrings`（run_mods JSON）里，键就是 optionId。
2. **`isDailyMod` 才是持久化开关**：`CustomModeScreen.getActiveDailyModIds()` 收 `isDailyMod=true` 且选中的 ID → `CustomTrial.addDailyMods` → `AbstractPlayer.customMods = trial.dailyModIDs()`；`SaveFile` 构造器把 `AbstractPlayer.customMods` 写进 `custom_mods`；`CardCrawlGame.loadPlayerSave` 读档时又还原回 `AbstractPlayer.customMods`。`isDailyMod=false` 的一批（Praise Snecko / One Hit Wonder / My True Form / Starter Deck 等）只在 `addNonDailyMods` 里做开局改写，不持久化。→ 本功能是「运行期型负面修正」，按本体同类（Binary / Terminal 等）注册为 `isDailyMod=true`、颜色 `"r"`。
3. **标准局 / 每日挑战隔离**：`AbstractPlayer.customMods` 是静态字段，新开标准局不会清空；但 `CardCrawlGame.updateFade` 的 startOver 分支会 `trial=null`、`Settings.isTrial=false`。因此选中判定 = `contains(optionId)` 且 `Settings.isTrial || CardCrawlGame.trial instanceof CustomTrial`；新档注入再收紧为 `trial instanceof CustomTrial`（读档不会触发 `PostCreateStartingDeck`，天然不会重复注入）。
4. **文本加载无自动 modId 前缀**：`BaseMod.loadCustomStringsFile(Type, path)` = `Gdx.files.internal(path).readString(UTF-8)` → `loadJsonStrings`；5.56.0 的 `findCallingModName()` 是恒返回 null 的桩，所以 `CardStrings` 的 JSON 键必须是完整 cardID（`anthonyswrath:AnthonysWrath`），而不是裸 ID。`RunModStrings` 本就不加前缀，键 = optionId。
5. **卡牌注册与诅咒池**：`BaseMod.addCard` 对 `CardColor.CURSE` 进 `curseToAdd`，`CurseCardsPatch` 在卡库初始化后 `CardLibrary.add`；`initializeCardPools → addCurseCards` 会按 `CardType.CURSE` 把它收进 `curseCardPool`。→ US4 的 T027 仍有必要（StartGame 钩子排除），本次不做。
6. **「负面：」前缀**：`CustomModeScreen`/`ui.json`/`run_mods.json` 都没有「负面」文本，本体负面选项只靠红色方括号表达。→ 界面槽位不提供，按 US1 验收场景 1 在中文选项名写入「负面：安东尼之怒」；英文按规格保持 `Anthony's Wrath`。
7. **图片**：`CustomCard` 的 `textureImg` 走 `ImageMaster.loadImage`，文件缺失只告警并返回 null（随后取宽高会 NPE），故必须有占位文件。开发期占位图放 `src/main/resources/placeholder/`，与 R-010 一致；`src/.gitignore` 忽略之（原本是 T036 的交付，这里先建立以免本轮提交污染仓库，T036 再复核/替换）。

## 4. 本轮实现的文件与职责

| 文件 | 任务 | 职责 |
| :-- | :-- | :-- |
| `src/main/java/anthonyswrath/options/AnthonysWrathOption.java` | T007 | `OPTION_ID = "anthonyswrath:AnthonysWrathOption"`；`create()` = `new CustomMod(OPTION_ID, "r", true)` |
| `src/main/java/anthonyswrath/cards/AnthonysWrathCurse.java` | T010 | `CustomCard` 子类：CURSE/CURSE/-2/SPECIAL/NONE；名称与描述取自 `cards.json`；`makeCopy()` 显式新实例 |
| `src/main/java/anthonyswrath/run/RunState.java` | T012/T014 | 选中判定唯一来源（`AbstractPlayer.customMods` + trial 门禁），null 安全、未知标识自然忽略 |
| `src/main/java/anthonyswrath/run/StartDeckInjector.java` | T012 | `PostCreateStartingDeck` 注入恰好一张，cardID 防重复 |
| `src/main/java/anthonyswrath/util/ModStrings.java` | T005/T009/T013 | 语言目录解析（`Settings.GameLanguage` 小写，缺省回退 `eng`）+ `loadCustomStringsFile` 调用；javadoc 记录命名约定与实测加载规则 |
| `src/main/java/anthonyswrath/AnthonysWrathMod.java` | T008/T009/T011/T012 | 实现并订阅 EditStrings / EditCards / AddCustomModeMods / PostCreateStartingDeck |
| `src/main/java/anthonyswrath/patches/vanilla/package-info.java` | T006 | 包骨架与补丁命名约定（一个原版目标一个类、只判定本牌、不出文本） |
| `src/main/resources/strings/anthonyswrath/{eng,zhs}/cards.json` | T005/T013 | 卡名与描述初版（按参照牌 `CurseOfTheBell` 措辞；T033 定稿） |
| `src/main/resources/strings/anthonyswrath/{eng,zhs}/run_mods.json` | T005/T009 | 选项名（中文带「负面：」）与勾选前可见的效果说明（FR-014） |
| `src/main/resources/placeholder/AnthonysWrath.png` | T010 配套 | 250×190 开发期占位图（入 jar、不入库） |
| `src/.gitignore` | T036 前置 | `placeholder/` 忽略规则 |

本体负面选项的 `addNonDailyMods` 不会收到本选项（`isDailyMod=true`），故不需要为它实现任何开局改写钩子；`setupTrialMods → ModHelper.setMods` 对未知 ID 取到 null 后由 `clearNulls()` 清掉，无副作用。

## 5. 自检结果（沙箱内可做部分）

- JDK8 `javac -source 1.8 -target 1.8 -encoding UTF-8 -cp libs/{desktop-1.0,ModTheSpire,BaseMod,StSLib}.jar` 编译 `src/main/java` 全部源码：**exit 0**，无错误无警告。
- 双语 JSON：两语言各自合法；`cards.json` 与 `run_mods.json` 的 key 集合逐文件比对一致（各 1 个 key：完整 cardID / 完整 optionId）。
- 占位图：Java `ImageIO` 生成 250×190 PNG（517 bytes），存在于 `src/main/resources/placeholder/`，`git -C src check-ignore` 命中 `src/.gitignore:placeholder/`。
- 未能执行（沙箱限制，留用户侧）：`mvn package`、游戏内加载、QS-01/QS-02/QS-08。

## 6. 文档回写

- `tasks.md`：T005~T014 勾选并附证据；Phase 2 Checkpoint 改为通过；T015 保持未勾选并注明等待用户实测。
- `research.md`：§R-003 增补「Implemented」段；§R-006 增补注入实现落点；§R-009 增补卡牌实现细节与占位图口径；新增 §R-014 记录选项注册 / 选中状态 / 文本加载 / 卡牌注册的全部实测口径与「负面：」结论。
- `memory/facts/`：新增 f015（选项注册、持久化与选中判定）、f016（文本加载与卡牌注册口径），更新 `INDEX.json`。
- `memory/state.json`：见同日更新。

## 7. 结论与下一步

- Phase 2 完成（T005、T006 ✓），US1 代码完成（T007~T014 ✓），US1 的验收证据仍缺 T015 的游戏内实测。
- 下一步：用户普通终端执行 `mvn package`，按 `quickstart.md` QS-01 / QS-02 / QS-08（及 QS-14）实测；通过后再勾 T015、进入 US2（T016~T020）。
- 未推送提交按 `src → specs → memory → top` 顺序由用户执行；本轮新增一批，推送前用 `git -C <repo> log --oneline origin/master..HEAD` 核对。

## 8. 独立复核（verifier 队友，只读）

复核结论 **PASS WITH ISSUES**（无 must-fix，US1 代码可进游戏实测）；复核独立执行了：JDK8 编译（major version 52）、T005~T014 逐条对照、宪法/规格约束（无玩家可见字面量、双语 key 一致、JSON 合法无 BOM、依赖边界）、以及对 BaseMod/本体字节码的 API 抽查（`PostCreateStartingDeckSubscriber` / `AddCustomModeModsSubscriber` 签名、`CustomMod` 构造器语义、`customMods`/`custom_mods` 持久化、`publishEditStrings` 先于 `publishEditCards` 的启动顺序）。两项 should-fix 已在提交前处理：

1. **占位图未入库 → 干净检出构建可能缺纹理**：在 `AnthonysWrathCurse` 增加 `resolveImagePath()`：优先 `placeholder/AnthonysWrath.png`，缺失时回退游戏 jar 自带的 `images/cards/locked_attack.png`。当前工作区构建仍用占位图，T036 再换正式贴图。
2. **`RunState.isOptionSelected()` 对同会话 trial-seed 局存在理论误判**（`AbstractPlayer.customMods` 静态残留 + `Settings.isTrial`）：US1 注入用的是更严格的 `isOptionSelectedForNewRun()`（`trial instanceof CustomTrial`），不受影响；已在 `RunState` javadoc 记为已知限制，交给 T026 在接入 US2/US3 前改为按局记录。

其余为说明性 note（英文选项名按规格不带 `Negative:` 前缀；本功能 US2~US5 行为尚未实现属增量交付；`probe/` 随 T035 移除；同会话切换语言不刷新已缓存的 `CardStrings`，与本体诅咒牌一致）。复核亦确认 BaseMod 的每个 `publish*` 末尾都会 `unsubscribeLaterHelper`，不存在重复注册问题。
