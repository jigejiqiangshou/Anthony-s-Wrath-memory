# 025 — 记忆分类裁定：f018 属 facts 而非 dead-ends；并修正其过界证据

日期：2026-10-24 20:08–20:12
状态：用户质疑 `memory/facts/f018` 是否应归 dead-ends；按 skill 契约复核后维持 facts 分类，并修正该条「旁证」里的越界表述与对 spec 的重复。
依据：用户 2026-10-24 20:0x 提问「@memory/facts/f018… 这不算 /agent-dev-memory 中的 deadends 吗」；`agent-dev-memory` 的 `references/semantics.md` §Fact and dead-end contract、§Memory vs spec。

## 1. 契约判定

- **dead-ends** = 「Which route is blocked, and until when / Guarded prohibition」。硬规则：**No attempt, no dead end**——只记真的试过并失败的路线；只是判断不可能、或还没试就认定不行，不算；`reason` 必须取自固定枚举（`api-absent` / `perf-insufficient` / `dependency-conflict` / `constraint-violation` / `conclusion-was-wrong`），且必须带 `reopenIf`。
- **facts** = 「What is verified true / Empirical claim」，要求 method（`verified` 字段）。
- f018 的结论来自「f010（抽牌方向 / 搬运顺序）+ f017（洗牌调用点全集）+ spec 的 FR-008 / FR-010」联合推导，并用原版调用链核对，有明确方法；它**没有**在成品里实际跑过耗尽重洗并失败，因此不满足 dead-end 的「试过并失败」前提 → **维持 facts / `status: verified`**。
- 它「提醒未来不要重试」的守卫作用由 `scope` 承担：成品适用；US3 关闭的探针版不适用；设计变更（不置底 / 延迟判负 / 第三方能移出牌）即失效——这与 `reopenIf` 的语义等价，但作为事实的范围而不是路线禁区。

## 2. 复核时发现的两处真问题（已修）

1. **证据越界**：f018 原文把「第一次抽空抽牌堆时本牌在手中、弃牌堆里没有它」写成日志旁证；实际复核 2026-10-24 `awprobe.log`（73 行）**没有跑到耗尽**——结束时 `drawPile=11`、`discardPile=0`、无 `patch.emptyDeckShuffle` 事件。该句把推导写成了观测，违反「No method, no fact」。已改为「旁证只到置底生效 + 抽牌方向；耗尽时本牌在手中是推导」。
2. **与 spec 重复**：f018 原文复述了验收口径修订（SC-002 / EC-001 / US2 场景 2 / Assumptions）。按 §Memory vs spec「facts 不得复制 spec 文本，最多给指针」，已把该段收敛为指向 `spec.md` / `quickstart.md` 的指针。

## 3. 若希望进死路库的合规路径

唯一合规做法是**真的去试并失败**：在成品里尝试把「抽牌堆耗尽重洗」当作验收场景（观察不到含本牌的耗尽重洗），或在探针版做两轮耗尽验证失败。届时记 e004（`reason: constraint-violation`；`reopenIf`：US3 关闭 / 设计改为延迟判负或不置底 / 第三方 mod 或新版游戏能把牌移出抽牌堆），正文指向 f018。未尝试前记 dead-end 会违反契约、污染路线库。

## 4. 本轮改动与提交

- `memory/facts/f018-exhausted-reshuffle-unreachable-in-final-product.md`：修正 corroboration、补「为什么不是 dead-end」与 spec 指针。
- `memory/facts/INDEX.json`：f018 的 `verified` 去除越界旁证，改为「验收口径见 spec，本条不复制」。
- `state.json`：notes 记录分类裁定与证据修正；`updated` 更新。
- 提交：memory 与顶层各 +1（src / specs 无改动）；推送顺序不变（src → specs → memory → top）。
