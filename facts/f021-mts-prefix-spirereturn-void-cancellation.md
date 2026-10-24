# f021 — ModTheSpire 3.30.3：`@SpirePrefixPatch` 可用 `SpireReturn` 跳过 void 目标方法的整个方法体

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 本项目 `libs/ModTheSpire.jar` 3.30.3 + Java 8 的 prefix patch 取消 / 改写执行。换 ModTheSpire 版本须重跑同样的反汇编再采信。

**结论**

- `@SpirePrefixPatch` handler 的返回类型可以是 `SpireReturn<T>`：返回 `isPresent() == true` 的值时，ModTheSpire 在目标方法的开头生成 `if (opt.isPresent()) { ... }` 包装——**目标方法返回 void 时直接 `return;`，整个方法体被跳过**。
- `SpireReturn` API（3.30.3）：`Continue()`（不取消）、`Return(T)`（带返回值改写）、`Return()`（无参重载，返回 `SpireReturn<Void>`，供 void 目标使用）。
- 判据（`javap -p -c libs/ModTheSpire.jar`）：
  - `PrefixPatchInfo.<init>` 置 `canSpireReturn = true`；
  - `ParameterPatchInfo.doPatch` 仅在 patch 方法返回类型为 `SpireReturn` 时启用（否则 `canSpireReturn` 置 false）；目标方法返回 `void` 时生成无返回值的 `return;`（字符串常量 `if (opt.isPresent()) { return`），非 void 时生成 `return (T) opt.get()` / 基本类型转换。
- 与「boolean 前缀返回 false 取消」是两套机制；`SpireReturn` 可在同一 handler 内区分「继续 / 跳过 / 改写返回值」。

**验证方法（2026-10-24）**

```
javap -p -classpath libs/ModTheSpire.jar com.evacipated.cardcrawl.modthespire.lib.SpireReturn
javap -c -p -classpath libs/ModTheSpire.jar com.evacipated.cardcrawl.modthespire.patcher.ParameterPatchInfo
javap -c -p -classpath libs/ModTheSpire.jar com.evacipated.cardcrawl.modthespire.patcher.PrefixPatchInfo
```

`SpireReturn` 方法列表含 `Continue()` / `Return(T)` / `Return()`（返回 `SpireReturn<Void>`）；`ParameterPatchInfo.doPatch` 的字节码在 `canSpireReturn` 分支中按目标返回类型生成带 / 不带返回值的 `return`。离线编译 + 离线目标自检已把该 prefix 计入 22/22（`memory/log/027`）。

**用途**: 001-anthonys-wrath US3 的 `patches/vanilla/AbstractPlayerDrawPatch`（判负后跳过 `AbstractPlayer.draw(int)`，EC-004 的入口级短路）。任何「满足条件时整段跳过原版方法」的补丁都可复用本结论。

**evidence**: `memory/log/027-20261024-us3-implementation.md`；`specs/001-anthonys-wrath/research.md` §R-005 Implemented
