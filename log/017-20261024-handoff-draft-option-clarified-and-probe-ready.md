# 017 — 交接：自定义模式选项澄清（Draft 等）、探针已可运行、规格措辞修正

日期：2026-10-24 15:30–15:45
状态：本会话交接结束。规格中错误的「清空初始牌组」表述已全部修正；探针已成功加载并产生启动日志；下一次会话用户将以 `/speckit-implement` 启动，第一步按 `quickstart.md` §3 采集探针数据。
依据：用户反馈「自定义模式里没有『清空初始牌组』这个选项」；主 agent 对 `desktop-1.0.jar` 的 `run_mods.json` 与 `AbstractPlayer#initializeStarterDeck` 逐条核对；`awprobe.log` 启动证据；用户已放开写权限。

## 1. 「清空初始牌组」不存在，错误表述已修正

- 本体 `localization/{eng,zhs}/run_mods.json` 共 45 个自定义选项，**没有任何**「清空 / 置空初始牌组」的选项。唯一名称近似的是 ID `Starter Deck`（描述：Start with Busted Crown and Binary），它给的是遗物，不改牌组。
- 真正会改写开局牌组的原版选项：

| ID | 英文名 | 行为 |
| :-- | :-- | :-- |
| `Draft` | Draft（轮抽） | 自定义起始牌组；`initializeStarterDeck` 不加入任何初始牌，创建后牌组**为空**，随后由选牌界面填充 |
| `SealedDeck` | Sealed Deck（封印牌组） | 从 30 张随机牌中构筑牌组 |
| `Insanity` | Insanity（疯狂） | 随机 50 张牌开局 |
| `Shiny` | Shiny（闪亮） | 起始牌组替换为每种稀有牌 1 张 |
| `Chimera` | Chimera（奇美拉） | 起始牌组为全角色融合 |
| `Starter Deck` | Starter Deck（初始牌组） | 破碎金冠 + Binary（遗物；牌组不变） |

- 证据：
  - `localization/eng/run_mods.json` 全量 45 个 ID，无空牌组相关选项；
  - `javap -c AbstractPlayer#initializeStarterDeck`：启用 Draft / Chimera / SealedDeck / Shiny / Insanity 任一后把「加入普通起始牌组」的标志置为 false；Chimera / Insanity / Shiny 各有加牌分支，**Draft / SealedDeck 没有加牌分支**。因此 Draft 下 `PostCreateStartingDeck`（`initializeStarterDeck` 的 postfix）时 `masterDeck` 为空，选牌填充发生在其后——这正是 EC-002 所指的「空开局牌组」场景。
- 已修正的规格措辞：`spec.md` US1-AS4 / EC-002 / FR-003、`research.md` R-006、`quickstart.md` §3（场景与问题 3）/ QS-03 / QS-08、`tasks.md` T004 / T012 / T015 / T020 / US1 Goal。`specs/_archive/` 保留历史原文不动；memory 旧日志按只追加原则不改。

## 2. 探针已成功加载（关键进展）

用户在修复后重新构建并启动成功；`C:\Users\Zhaoji\awprobe.log` 已生成（816 B，两次启动记录，2026-10-24 15:22:10 / 15:24:36），每条均含：

```
hook.PostInitialize | floor=0 room=null draw=0 discard=0 hand=0 exhaust=0 masterDeck=0
probe.console | DevConsole.enabled=true (toggle with the grave/backquote key)
probe.console | registered command: awprobe info|purge|cursepool|transform <cardID>|addcard <cardID>|shuffledeck
```

说明：MTS 补丁修复（`paramtypez = {}`）生效，`ProbePatches` 全部应用成功；探针、控制台命令与日志双写通道都可用，只差进一局游戏采集场景数据。

## 3. 本轮提交（未推送）

| 层 | 内容 |
| :-- | :-- |
| `src` | 本轮无改动（探针修复提交 `37b7ddb` 在上一轮，仍待推送） |
| `specs` | 上述 4 个文件的措辞修正 |
| `memory` | 本记录 + `state.json` |
| 顶层 | 推进 gitlink（specs / memory） |

推送顺序 src → specs → memory → 顶层。远端基线仍为 top `23f631d` / memory `45bbb2c` / specs `ccbc03b` / src `4ff5f7e`。

## 4. 下一次会话（用户以 `/speckit-implement` 启动）的第一步

1. 推送四仓（清单见 `state.json` 的 `git.pendingPush`）。
2. 按 `quickstart.md` §3 采集（日志自动写入 `C:\Users\Zhaoji\awprobe.log`，控制台用反引号键）：

| 场景 | 操作 |
| :-- | :-- |
| 1 | 自定义模式开两局：一局勾「轮抽（Draft）」——若弹出选牌界面随意选满即可；一局不勾任何改写牌组的选项 |
| 2 | 第一场战斗打 2–3 回合（首次洗牌 + 起手摸牌） |
| 3 | 打到抽牌堆耗尽（弃牌堆洗回） |
| 4 | 控制台 `deck add SecretTechnique`（或 `hand add SecretTechnique`）后打出，从抽牌堆取一张牌 |
| 5 | 控制台 `awprobe addcard CurseOfTheBell`；`gold 999` 后进商店移除（或休息点移除 / 净化之泉）；再 `awprobe transform CurseOfTheBell` |
| 6 | 退出游戏，交回 `C:\Users\Zhaoji\awprobe.log` |

3. 收到日志后：结论回写 `research.md` §R-004～§R-008，勾选 T004，写 `log/018`；Phase 2 收尾（T005 / T006 骨架）；进入 US1（T007 选项类 → T010 卡牌 → T011 注册 → T012 注入）。

## 5. 未决与注意

- Draft 的选牌界面实际操作需用户确认；探针日志会记录 `PostCreateStartingDeck` 时的空牌组与随后的填充时序，可直接验证 §1 的结论。
- 商店移除需要金币（`gold 999`）与至少一张可移除牌；当天没有商店时可用 `awprobe purge` 直接验证判定函数，或跳过该场景。
- 若控制台打不开或找不到 `awprobe` 命令，自动日志（钩子 + 补丁观测）仍能回答大部分问题，不必阻塞。
