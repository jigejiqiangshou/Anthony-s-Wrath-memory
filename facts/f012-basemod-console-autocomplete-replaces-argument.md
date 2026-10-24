# f012 — BaseMod 5.56 控制台 Tab/→ 补全会用 extraOptions 候选整词覆盖当前参数

## 结论

- `DevConsole.execute()` 只做 `trim()` + 按空白 `split` + 逐 token `trim`，**没有** lowercase、没有引号/转义处理；`tokens[0]` 是命令名。`depth` = 命令派发消耗的 token 数：未注册 followup 的顶层命令（如 `awprobe`）恒为 **1**。
- Tab(61) 与 →(22) 调 `AutoComplete.fillInSuggestion()`：用候选**替换「最后一个空格之后的当前词」并追加一个空格**；Enter(66) **不采用候选**，直接执行输入框原文。候选来自 `ConsoleCommand.autocomplete(tokens, depth)`：先取 `followup` 键（按 `tokens[depth]` 前缀过滤），再取 `extraOptions(tokens, depth)`（按 **`tokens[tokens.length-1]`** 前缀过滤，大小写不敏感），排序后默认选第一个。
- 因此命令若在「参数位」也返回子命令名作为候选，Tab 会把残缺参数替换成某个子命令词：旧探针 `awprobe addcard C|Cu|Cur…` + Tab 唯一候选 `cursepool`，输入行变成 `awprobe addcard cursepool `；继续输入会落到第 4 个 token，命令只读前 3 个 ⇒ 日志 `unknown cardID: cursepool`。
- 正确写法：`extraOptions` 只在子命令位返回子命令；参数位返回真实参数候选（BaseMod 自带 `deck add` 用 `ConsoleCommand.getCardOptions()`，`transform` 用 `getCardOptionsFromCardGroup(masterDeck)`），空前缀最好不给候选；参数解析应大小写不敏感。
- BaseMod 自带 `deck add <cardID>`（`DeckAdd`，`requiresPlayer=true`、`minExtraTokens=1`、`maxExtraTokens=3`）走 `ShowCardAndObtainEffect`，可作为控制台排障兜底。

## 验证方法

- `javap -p -c -constants` 反汇编 `libs/BaseMod.jar`：`basemod.DevConsole`（execute / onKeyDown / onKeyUp）、`basemod.devcommands.ConsoleCommand`（execute / suggestions / autocomplete / last）、`basemod.AutoComplete`（`<clinit>` 键位、fillInSuggestion、suggest、getTextWithoutRightmostSpaceToken）、`basemod.devcommands.deck.DeckAdd` / `DeckManipulator`。
- 游戏内证据：`awprobe.log` #561 `cmd.addcard | unknown cardID: cursepool`（654 行日志里唯一命令行；此前无 `cmd.usage`，说明进入了 `addcard` 分支且 `tokens[2]` 非空）。
- 修复后离线自检：用与 `autocomplete` 相同的「末词前缀 + 排序 + 取第一」逻辑驱动 `AwProbeCommand.extraOptions`，`c/cu/cur/curse/cursep` 前缀得到的唯一候选均为 `CurseOfTheBell` 或空，不再出现子命令词（`memory/log/018`）。

## 适用范围

`libs/BaseMod.jar` = BaseMod **5.56.0**（SHA256 C3353C10…FBAF）。换 BaseMod 版本须重新反汇编 `DevConsole` / `ConsoleCommand` / `AutoComplete` 再采信；键位常量（Tab=61、→=22、Enter=66、L_Shift=59）可能随版本变化。
