# f016 — BaseMod 5.56 的文本加载与卡牌注册口径（不会自动加 modId 前缀）

## 结论

1. **文本加载入口**：`BaseMod.loadCustomStringsFile(Class<?> type, String path)` 等价于
   `Gdx.files.internal(path).readString("UTF-8")` 后调 `loadJsonStrings(type, json)`；
   `loadCustomStrings(Class<?>, String json)` 直接吃 JSON 字符串。文件从
   **mod jar 的 classpath 根**读取（BaseMod 自己的
   `localization/basemod/<lang>/customMods.json` 就是同一机制）。
2. **`type` 决定写入哪张本地化表**：`initializeTypeMaps()` 反射扫描
   `LocalizedStrings` 的字段，把 `Map<String, XxxStrings>` 的 value 类型映射为字段名
   （`CardStrings → cards`、`RunModStrings → mod`、`UIStrings → ui`、`RelicStrings → relics` 等），
   用 Gson 反序列化为 `Map<String, Txxx>` 后 `putAll` 进对应静态表。
3. **5.56.0 不会自动加 modId 前缀**：`loadJsonStrings` 里的
   `findCallingModName()` 在本版本是恒返回 `null` 的桩
   （字节码仅 `aconst_null; areturn`）；只有返回非 null 时才会把 key 改写成
   `<callerModName>:<key>`，而且只对 `CardStrings` / `RelicStrings` 生效。
   ⇒ `cards.json` 的键必须写**完整 cardID**（如 `anthonyswrath:AnthonysWrath`），
   `run_mods.json` 的键必须是完整 optionId（`CustomMod` 构造器按 ID 直接查表）。
4. **语言选择没有内建机制**：BaseMod 只按调用方给的路径读文件。参考 BaseMod 自身做法，
   路径里用 `Settings.language.name().toLowerCase()` 作为目录名（`ENG → "eng"`、
   `ZHS → "zhs"`），并在文件不存在时回退 `eng`（`Gdx.files.internal(...).exists()` 先判存在，
   因为 `FileHandle.readString` 对缺失文件会直接抛异常）。
5. **卡牌注册**：`BaseMod.addCard(AbstractCard)` 按 `CardColor` 把实例分进
   `redToAdd/greenToAdd/blueToAdd/purpleToAdd/colorlessToAdd/curseToAdd/customToAdd` 队列；
   `basemod.patches...CardLibrary.CurseCardsPatch` 在卡库初始化后对 `curseToAdd` 逐张执行
   `CardLibrary.add(card)`。之后每当开局/读档执行
   `AbstractDungeon.initializeCardPools()`，其内部 `addCurseCards()` 会遍历 `CardLibrary.cards`
   把所有 `CardType.CURSE` 收进 `curseCardPool`（仅硬编码排除 4 个 ID）。
   ⇒ 自定义诅咒牌默认会进入随机诅咒池，需在 `StartGameSubscriber.receiveStartGame` 或
   `initializeCardPools` 补丁中排除（对应 T027 / EC-010）。
6. **卡牌类图片**：`CustomCard` 构造器的 image 参数只存进 `textureImg`；渲染时
   `ImageMaster.loadImage(path)` 加载 classpath 图片，文件缺失只以 `[WARNING] No image at ...`
   告警并返回 null（随后取宽高会 NPE），因此开发期必须有占位图片文件；图片路径相对
   `src/main/resources/` 根。

## 验证方法

2026-10-24 对 `libs/BaseMod.jar`（5.56.0）与 `libs/desktop-1.0.jar`（12-18-2022）执行
`javap -p -c`：

- `basemod.BaseMod`：`loadCustomStrings`、`loadCustomStringsFile`、`loadJsonStrings`、
  `initializeTypeMaps`、`findCallingModName`、`addCard`、`insertCustomMod`；
- `basemod.patches.com.megacrit.cardcrawl.helpers.CardLibrary.CurseCardsPatch`；
- `basemod.abstracts.CustomCard`（构造器、`getTextureFromString`、`makeCopy`）；
- `com.megacrit.cardcrawl.helpers.ImageMaster.loadImage`；
- `com.megacrit.cardcrawl.core.Settings$GameLanguage`（语言枚举常量）；
- 抽取 `localization/eng|zhs/{run_mods,ui}.json` 与 `cards.json` 对照本体键值。

另在项目内做了可复现的离线核对：双语 JSON 均可被 `ConvertFrom-Json` 解析，两语言 key 集合
逐文件一致。过程记录见 `memory/log/021`，落点见 `specs/001-anthonys-wrath/research.md` §R-014。

## 适用范围

本机 `libs/` 的两个具体 jar（SHA256 见 f009）：

- `BaseMod.jar` 5.56.0（7,659,408 bytes）；
- `desktop-1.0.jar` 12-18-2022（365,086,855 bytes）。

其中「5.56.0 不加自动前缀」与「图片缺失只告警」两条与版本强相关，换版本必须重跑 `javap`；
「文件从 classpath 读、语言目录自行选择」是 BaseMod 长期机制，但同样建议换版本复核。
