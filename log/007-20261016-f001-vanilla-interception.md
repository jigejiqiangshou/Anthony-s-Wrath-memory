# 007 — 三轮 analyze 的 F-001:本体没有"不可移除"属性,只能拦截原版判定点

日期:2026-10-16
状态:已按路线 A 落地并提交

## 本轮做了什么

三轮 `/speckit-analyze` 报出 F-001:FR-012 的"不可移除"机制全项目无落点,且 plan 第 22 行"不产生
`patches/vanilla/` 改动"缺依据。用户先要求讨论 F-001,讨论过程中把"本体到底有没有可用机制"查成了
实证;随后选定路线 A(承认原版拦截)并要求落地。

## 实证过程(全部在本机完成)

环境:游戏本体 **V2.3.4 (2022-12-18)**,`C:\Program Files (x86)\Steam\steamapps\common\SlayTheSpire\desktop-1.0.jar`;
JDK8 `C:\Program Files\Java\jdk1.8.0_501\bin\javap.exe`;zip 用 .NET `System.IO.Compression.ZipFile` 读。

方法:从 jar 抽出目标 class → `javap -p -c` 反汇编;另对全部 **7038 个 class 条目**做常量池 ASCII 扫描,
枚举每个符号的引用点。原始产物只落在系统 TEMP 与 gitignored 的 `.dsh/` 下,**未进仓库**,查完即删。

### 1. 参照牌本身

`cards/curses/CurseOfTheBell` 是最朴素的诅咒:文本取自 `languagePack.getCardStrings`,费用 **-2**,
`CardType.CURSE` / `CardColor.CURSE` / **`CardRarity.SPECIAL`** / `CardTarget.NONE`;`use()` 与
`upgrade()` 都是空实现;没有 keywords,也没有任何标记。(对照:普通诅咒 `Injury` 用 `CardRarity.CURSE`,
参照牌刻意与之区分。)

### 2. "删不掉"= 四处硬编码 cardID

| 位置 | 作用 |
| :-- | :-- |
| `CardGroup.getPurgeableCards()` | 排除 Necronomicurse / CurseOfTheBell / AscendersBane;21 个调用者共用(商店移除、Peace Pipe、空笼、星盘、Neow、Bottled\*、篝火烟 + 12 个事件) |
| `FountainOfCurseRemoval` | 不走上面那处:自建循环跳过同样三个 ID,把其余诅咒一次性全删(净化之泉) |
| `AbstractDungeon.addCurseCards()` | 遍历整个 `CardLibrary.cards`,把所有 CURSE 收进 `curseCardPool`,只排除上述三张 + `Pride` |
| `AbstractPlayer.isCursed()` | 判断"牌组里有无真正的诅咒"时同样排除这三个 ID |

没有字段、没有关键词、没有接口。呈现上也没有关键词样式(牌面文本直接写"不能从牌组中移除"),
与 spec 第 79 行的判断一致。

### 3. 牌怎么进牌组(顺带查清)

`CallingBell.onEquip()` → 临时 `CardGroup` + `makeCopy()` → `addToBottom` →
`gridSelectScreen.openConfirmationGrid(group, DESCRIPTIONS[1])`;点确认后把组内每张牌包成
`FastCardObtainEffect` 塞进 `topLevelEffects`,效果结束时 `getCurrRoom().souls.obtain(card, true)`
写入主牌组并通知所有遗物 `onMasterDeckChange()`。若持御守(Omamori)且有次数,这张 CURSE 色的牌会被
取消获得。(同源写法:死灵之书 `Necronomicon.onEquip()` 用 `ShowCardAndObtainEffect`。)

### 4. 由实证带出的三个新问题(已并入本轮改动)

1. **蓝蜡烛(Blue Candle)**:`AbstractCard.canUse` 对"诅咒 + 费用低于 -1"返回 false,但持蓝蜡烛时放行;
   `BlueCandle.onUseCard` 再补 1 点生命 + `exhaust = true`。参照牌同样如此 → 新增 EC-011,说明本牌因
   "入手即负"使任何需要它停留在手牌的操作都不可达,故不额外增加限制。
2. **T029 原步骤自相矛盾**:"把它塞进手中确认无法打出"会先触发我们自己的判负 → 改为与参照牌同条件对照。
3. **注册即进随机诅咒池**:`addCurseCards()` 是通用扫描、不认我们的 ID,未选选项时也可能被随机诅咒来源
   发出,违反 FR-011 / SC-004 与 Out of Scope → 新增 EC-010,由 T009 用 `PostDungeonInitialize` 钩子
   把本牌移出 `curseCardPool`。

## 落地内容(路线 A)

- **spec.md**:Out of Scope 去掉"本功能无需触碰原版内容"这条错误的技术断言(改为"不改动原版内容本身,
   拦截只针对本牌");新增 `EC-010`(不进随机诅咒池)与 `EC-011`(蓝蜡烛与消耗类效果的既有规则)。
- **plan.md**:Constraints 改写(承认必须拦截原版判定点,落点 `src/main/java/<modId>/patches/vanilla/`);
  Architecture 第 3 项补参照牌实际参数(费用 -2、`CardRarity.SPECIAL`)、第 5/6 项注明补丁落点、
  **新增第 8 项"原版判定点拦截(补丁包)"**;Requirement Mapping 改写 FR-012 一条并补 EC-010/EC-011;
  Testing Strategy 的 T-P1 增加第五问(枚举移除面 + 诅咒池规则 + 钩子时序)、T-V3/T-V6 补观察项;
  Risks 增加两条(入口枚举不全、被随机诅咒来源发出),并把参照牌的中英文原文写进兜底。
- **tasks.md**:T004 增加枚举职责;T005 补费用 -2 与 `CardRarity.SPECIAL`;T007 改为"建立
  `patches/vanilla/` 并实现两处拦截";T009 承接随机诅咒池排除;T029 改测试步骤并加 `EC-011`;
  T032 加诅咒池观察并加 `EC-010`。**未新增任务**,编号仍为 T001–T045。

## 门禁实测(改动后)

```
derive-stage   : ok=true stage=tasked spec=valid plan=valid tasks=valid tasks=45
select-tasks   : ok=true tasks=45 incompleteDependencies=0
check-artifacts: ok=true tasks=45 requirements=29 problems=[]
```

## 本轮学到的两条工具规则(已升入 facts,见 f006)

两次返工都由 helper 抓出,而项目自建检查器看不见:

1. **依赖必须前置**:`T007 (depends: T004, T005, T009, T046)` 被 `select-tasks` 判
   `MALFORMED_ARTIFACT: Dependency T009 must precede T007`。据此把补丁包并入 T007、诅咒池并入 T009,
   不再引入后置任务。
2. **spec 的机器 token 必须全局唯一**:`derive-stage` 判 spec invalid 而 diagnostics 为空;
   读 `lib/workflow.js` 的 `specValid`/`tokensValid` 才知 `US|FR|SC|EC|OQ` token 不得重复——
   EC-010 里写了 `FR-011` 造成跨引用。改成自然语言指代后恢复 valid。

## 未处理(留给下一轮)

二轮 analyze 的其余发现仍未动:`F-002`(T002 先于 T003)、`F-003`(缺 `ModTheSpire.json`)、
`F-004`(T042 依赖不含验收对象)、`F-005`(SC-001/002 无观察手段)、`F-006`(FR-010 多副本验收未落到 T027)、
`F-007`(spec 第 72/78 行与 EC-003/第 79 行矛盾)、`F-008`(描述文本三处并行写)、`F-009`(触发式洗牌无覆盖)、
`F-010`(OQ-005 由任务层决定)、`F-011`(T043 未承接门禁扩展)、`F-012`(接口名 `CustomModeMods`)、
`F-013`(字符串字面量无验收)、`F-014`(SC-005 映射)、`F-015`(`.gitignore` 白名单)、`F-016`(控制台可用性)、
`F-017`(宪法第七/九条无落点)。

## 下一步

提交三层(specs → memory → 顶层指针)并推送;再决定是否批量处理上述 16 项;实现前需先把
ModTheSpire / BaseMod / StSLib 装进游戏目录的 `mods/`(当前该目录不存在)。
