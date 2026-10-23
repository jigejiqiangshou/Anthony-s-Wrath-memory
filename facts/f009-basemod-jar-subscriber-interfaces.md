# f009 — BaseMod 实物 jar 的订阅接口名与签名（选项注册接口已定案）

## 结论

以顶层 `libs/` 的实物 jar 为准（SHA256 见「适用范围」），本功能要用的 BaseMod 订阅接口均已确认存在：

| 接口（`basemod.interfaces.*`） | 方法签名 | 用途 |
| :-- | :-- | :-- |
| `AddCustomModeModsSubscriber` | `receiveCustomModeMods(java.util.List<com.megacrit.cardcrawl.screens.custom.CustomMod>)` | 自定义模式选项注册（T008） |
| `EditCardsSubscriber` | `receiveEditCards()` | 注册卡牌（T011） |
| `EditStringsSubscriber` | `receiveEditStrings()` | 双语文本加载（T009 / T013 / T033） |
| `PostCreateStartingDeckSubscriber` | `receivePostCreateStartingDeck(AbstractPlayer.PlayerClass, CardGroup)` | 开局注入（T012） |
| `PostDungeonInitializeSubscriber` | `receivePostDungeonInitialize()` | 随机诅咒池排除（T027） |
| `ISubscriber` | 空标记接口；入口用 `BaseMod.subscribe(ISubscriber)` 完成订阅 | 入口初始化（T003 / T008） |

- 发布端：`BaseMod.publishAddCustomModeMods(java.util.List<CustomMod>)`。
- **不存在** `CustomModeMods` 类，也**不存在** `receiveAddCustomModeMods` 方法；旧文档（含迁移前归档）中的该口径作废，以本表为准。
- 游戏侧 `com.megacrit.cardcrawl.screens.custom.CustomMod`（`desktop-1.0.jar` V2.3.4）：
  - 构造器：`CustomMod(java.lang.String ID, java.lang.String name, boolean isDailyMod)`；
  - 公开字段：`ID` / `name` / `description` / `color` / `isDailyMod` / `selected`（`description`、`color` 可赋值，支撑选项效果说明 `FR-014`）；
  - 另有 `setMutualExclusionPair(CustomMod)`。
- BaseMod 的订阅接口共 58 个，本次只核实本功能用到的 6 个；需要时用
  `jar tf libs/BaseMod.jar | Select-String '^basemod/interfaces/'` 重新枚举。

## 验证方法

2026-10-24，在项目根对 `libs/BaseMod.jar` 执行 `jar tf`（列出 `basemod/interfaces/*.class`）与
`javap -cp libs/BaseMod.jar <接口全名>`（取得方法签名），对 `libs/desktop-1.0.jar` 执行
`javap -cp libs/desktop-1.0.jar com.megacrit.cardcrawl.screens.custom.CustomMod`；
同时用 `javap -cp libs/BaseMod.jar basemod.BaseMod | Select-String 'subscribe|publish'` 取得订阅与发布入口。
过程与输出摘要见 `memory/log/014` §1；结论已回写 `specs/001-anthonys-wrath/research.md` §R-003。

## 适用范围

本机顶层 `libs/` 中的两个具体 jar：

- `BaseMod.jar`：7,659,408 bytes，2026-03-22 16:07:48，SHA256
  `C3353C10E64C621B723E9FD7D0502DFA796F828B101B68513594A5F5EF83FBAF`；
- `desktop-1.0.jar`：365,086,855 bytes，2026-03-22 16:06:58，SHA256
  `CFAD868AC8D65A88E71A0BF096FB09F78811E553EFFE0787C5309A655E081673`。

对应版本：BaseMod 5.56.0、游戏补丁 12-18-2022（版本号以顶层 `pom.xml` 的 `<properties>` 为唯一事实来源）。
更换 BaseMod 版本、游戏补丁或重新从创意工坊取 jar 后，必须重跑同一组 `jar tf` / `javap` 再采信。
