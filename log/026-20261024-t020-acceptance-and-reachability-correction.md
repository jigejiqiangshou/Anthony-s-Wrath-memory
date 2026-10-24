# 026 — T020 验收通过（US2 完成）+「抽牌堆耗尽重洗」可达性二次修正

日期：2026-10-24 21:28–21:40
状态：**US2 完成**（T016~T020 全部勾选，Phase 4 Checkpoint 通过）；下一会话进入 US3（T021 入手判定）。本轮顺带推翻了 20:0x 的「耗尽重洗成品不可达」判断并回写 spec/quickstart/research。
依据：用户 2026-10-24 21:26 交回 `awprobe.log`（235 行，21:22:03~21:26:23；探针版 jar 为 19:36 构建，不含 TRACKED 修复，故 `tracked={none}`）。

## 1. 本轮运行概况

- 新档：观者 + Draft + 「安东尼之怒」选项；21:22:19 进入第一场战斗（masterDeck=16，含本牌）。
- 第一场战斗：首洗 → 两次 `awprobe shuffleaction` → 打到抽牌堆耗尽触发重洗 → 胜利；21:24:54/21:25:19 两次 `awprobe addcard anthonyswrath:AnthonysWrath`（期间 21:25:06~21:25:14 净化之泉事件删掉一张，见 §4）。
- 第二场战斗：21:25:21 开始（masterDeck=17，两张本牌）；21:26:23 `awprobe sinktest`。

## 2. T020 判定：全部通过

| 场景 | 判定 | 证据（`awprobe.log` 事件号） |
| :--- | :--- | :--- |
| QS-03 首洗置底（新档 + Draft） | **PASS** | #10~#14：临时 DRAW_PILE 组首洗后 #11 本牌索引 0，`initializeDeck.after`(#12)、`preBattlePrep.after`(#13)、`StartBattle`(#14) 的 drawPile 均索引 0；#38 `cmd.drawpile` 摸 5 张后仍索引 0 |
| QS-04 牌触发非耗尽重洗 ×2 | **PASS** | #42~#45：洗前 0 → `ShuffleAction` → `cmd.drawpile` 0；#151~#154 再次 0（#152 探针 `patch.shuffle().after` 显示索引 5，属探针后处理早于置底，仅作旁证） |
| QS-04 抽牌堆耗尽重洗 | **PASS**（意外收获，见 §3） | #106~#129：draw=0 时弃牌堆 10 张含本牌（索引 9）→ 洗后索引 0 → `emptyDeckShuffle.after` 自 drawPile=size=1 起本牌始终索引 0；#147 耗尽重洗后摸牌，本牌仍 0 |
| QS-05 多副本成组 | **PASS** | #163~#169：第二场首洗前 masterDeck 17（本牌在 15、16），洗后 drawPile 索引 0、1 为本牌；#193 摸 5 张后仍 0、1。`awprobe sinktest` #195~#199：4 用例全 PASS（含两张副本 uuid 序：`block=19449ef9,32ecbb32 expectedBlock=19449ef9,32ecbb32`） |
| QS-17 第二场战斗重新置底 | **PASS** | #169、#193：第二场 `StartBattle` 与 `cmd.drawpile` 均为索引 0 |

结论：勾选 T020，US2 完成；`tasks.md` Phase 4 Checkpoint 标通过。

## 3. 可达性二次修正（推翻 20:0x 结论）

20:0x 我们（依用户质疑）把「抽牌堆耗尽重洗」判为成品不可达并回写 spec（SC-002 / EC-001 / US2 场景 2 / Assumptions）、quickstart、research，并把 f018 记为 verified。本轮日志证伪：

- 本牌在整局中**从未**出现 `addToHand` / `addToTop(hand)` 事件（两个入手通道的补丁正常记录其它牌）；
- 21:23:51 抽牌堆耗尽时 `draw=0 discard=10 hand=4 exhaust=2`，本牌在 `discardPile` 索引 9；
- 随后 `EmptyDeckShuffleAction` 洗弃牌堆，本牌到索引 0，重洗后 drawPile 自 size=1 起本牌始终在索引 0。

即存在「不经手牌」的抽牌堆→弃牌堆转移。机制核对：`ScryAction` 对选中弃掉的牌调 `player.drawPile.moveToDiscardPile(card)`（`CardGroup.moveToDiscardPile` → `SoulGroup.discard`，不经手牌）；`JustLucky`/`CutThroughFate` 的 `use()` 都直接 `new ScryAction(...)`，当抽牌堆剩余张数 ≤ Scry 数时底部的本牌也进入可选范围。故：**该场景在成品中可达，但依赖牌组/效果**；完全没有此类效果的牌组仍不可达（那才是原判断的适用面）。

回写：`spec.md` Assumptions（两次澄清，第二次为准）/ SC-002 / EC-001 / US2 场景 2；`research.md` §R-004 Reachability（两次修正说明）+ T020 Verified 段；`quickstart.md` §4（T020 结果表 + 成品 T041 复现耗尽重洗步骤）与 QS-04 行；`tasks.md` T020 勾选与 Phase 4 Checkpoint。记忆侧：`f018` 转 **stale**（保留历史 + STALE 说明），新增 `f019`（Scry 非入手通道 + 可达性结论）。用户 20:0x 的推理在「纯抽牌牌组」范围内仍然成立，本次只是补上了漏掉的效果通道。

## 4. 其他观察（不阻塞 US2，留给后续故事）

- **净化之泉删除本牌**：#159 `getPurgeableCards`（masterDeck 17）→ #160 `removeCard(obj) masterDeck card=anthonyswrath:AnthonysWrath`（caller `PurificationShrine`）。US5（T029-T031）尚未实现，属**预期缺口**，不是 US2 回归；同时也是 US5 的现成实测样本。
- `curseCardPool` 仍含本牌（#6）：T027 待办。
- QS-01 屏幕中文文案仍无截图/记录：留 T041 或下会话顺手复核。
- 探针 `TRACKED` 修复（20:1x 提交）不在本次 19:36 的 jar 里，故日志 `tracked={none}`；下次构建起生效，不影响本轮判读（用 `ids` / `cmd.drawpile` 判读）。
- 多副本来自两次 `awprobe addcard`（原版没有作用于该诅咒的复制效果），符合 QS-05 的「否则用控制台加入第二张副本」分支。

## 5. 下一会话（US3）注意事项

- 流程：T021 入手判定 → T022 两个判定点（`addToHand` 与目标为手牌的 `addToTop`）→ T023 一次性守卫 + 终局短路 → T024 入口接入/必要补丁 → T025 实测 QS-06/07/09/15/16。
- 需要普通终端 `mvn package` 重建并覆盖 `mods/anthonyswrath.jar`（同时带上探针 TRACKED 修复）。
- **US3 实装后测试可行域变化**：探针版里「抽到本牌不判负」的前提消失；后续再验证「抽牌堆耗尽重洗」时不能靠先抽到本牌，必须按 §3 / quickstart 的 Scry 路线（先用 Scry 把本牌从抽牌堆放进弃牌堆）。
- US3 的失败流程落点（`AbstractDungeon.fail`/结算）与一次性守卫按 R-005 / data-model 实体 4 实现；实测时注意 #159 的净化之泉删除属 US5 缺口，别误判为判负相关回归。

## 6. 本轮提交（未推送；推送顺序 src → specs → memory → 顶层）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `specs` | T020 勾选 + Phase 4 通过；可达性二次修正（spec/QC/research/quickstart） |
| 2 | `memory` | 本记录 + f018 stale + f019 + state.json |
| 3 | 顶层 | 推进 gitlink（src 本轮无改动） |

`src` 本轮无代码改动，不产生提交；推送顺序仍为 src（待推的 2 个）→ specs → memory → 顶层。
