# f024 — MTS 3.30.3：旧式 `@SpirePatch` 的 postfix 不能替换返回值；`@SpirePatch2` 才行，且其 handler 参数按目标参数名（LocalVariableTable）匹配

**status**: verified

**feature**: 001-anthonys-wrath

**coldStart**: false

**scope**: 本项目 `libs/ModTheSpire.jar` = 3.30.3 + Java 8；用于需要「补丁改变原方法返回值」或「按名传参」的 mod 代码。换 MTS 版本须重跑同一批反汇编。旧式 `@SpirePatch` 的按位置/类型传参不受影响。

**结论**

- MTS 3.30.3 的补丁参数映射分两条路径（`ParameterPatchInfo.doPatch`）：`isSpirePatch2()` 为真时用 `ParamInfo2` / `PostfixParamInfo2`（**按名匹配**），否则用旧的 `ParamInfo`（按位置 + 类型匹配）。
- `isSpirePatch2()`（`PatchInfo.isSpirePatch2`）判断 patch 注解对象的 `AnnotationImpl.getTypeName()` 是否为 `SpirePatch2`。`Patcher` 会扫描 `@SpirePatch`、`@SpirePatches`、`@SpirePatch2`、`@SpirePatches2` 四种注解，并把 `@SpirePatch2` 通过 `convertSpirePatch2To1` 转成 `SpirePatch` 代理（类型名仍是 SpirePatch2）⇒ **StS1 的 MTS 3.30.3 支持 `@SpirePatch2`**。
- **只有 `@SpirePatch2` 的 postfix 能替换返回值**：`PostfixPatchInfo.returnsValue` 只由 `PostfixParamInfo2.specialNameCheck("__result")` 设置（且要求 handler 返回类型非 void）；`PostfixPatchInfo.alterSrc()` 在 `returnsValue` 时把调用改写成 `return ($r)handler(...)`。旧式 `@SpirePatch` 的 postfix 即使返回类型与目标一致，也只会生成一条调用语句，**返回值被忽略**（不会报错，属于静默失效——排查陷阱）。
- `@SpirePatch2` 的 handler 参数按**名称**匹配目标方法的参数名：`ParamInfo2` 用 `findName` 从目标方法的 `LocalVariableTable` 取名，与 handler 参数名逐字比较；`__instance`（实例）/`__args`/`__result`（postfix）/`___xxx`（私有捕获）是特殊名，其余参数必须与目标参数名一致。故目标方法的参数名是补丁 API 的一部分；mod 编译时须保留 LocalVariableTable（Maven `debug=true` 默认包含，命令行 `javac` 需 `-g`）。
- 目标方法解析（`Patcher.patchParamTypez`）：空 `paramtypez` 数组 = **恰好零参数**（精确匹配）；`paramtypez = {Void.class}` 才是「按方法名匹配且要求唯一同名方法」的标记。

**验证方法（2026-10-29）**

- `javap -p -c` 于 `libs/ModTheSpire.jar`：`ParameterPatchInfo.doPatch`（`isSpirePatch2` 分支）、`PatchInfo.isSpirePatch2`、`PostfixPatchInfo`/`PostfixPatchInfo$PostfixParamInfo2`（`returnsValue`/`takesResultParam`）、`ParamInfo2`（`findName` 名称匹配）、`Patcher`（四种注解扫描、`convertSpirePatch2To1`、`patchParamTypez`）。
- 项目内落地：`patches/vanilla/CardLibraryGetCursePatch`（两个 `@SpirePatch2` postfix，两参重载参数名 `prohibitedCard` / `rng` 与目标一致）与 `patches/vanilla/CardGroupGetPurgeableCardsPatch`（`@SpirePatch2` postfix 返回过滤后的 `CardGroup`）。
- 离线自检：`target/patchcheck/PatchCheck.java` 复刻两套映射规则（含用 javassist 读取 LocalVariableTable 的名称匹配），26/26 PASS；负例（把 `prohibitedCard` 改名为 `avoid`）按预期 FAIL，证明名称匹配确实被检查。
- 目标参数名实读：`javap -p -l` 于 `CardLibrary.getCurse(AbstractCard, Random)` → `prohibitedCard` / `rng`。

**用途**: 本项目 T027 / T029 的实现依据；后续任何需要替换返回值或按名传参的补丁（T035 之后的维护）都适用。

**evidence**: `memory/log/029-20261029-us4-implementation.md`；`memory/log/030-20261029-us5-implementation.md`；`specs/001-anthonys-wrath/research.md` §R-007 / §R-008（Implemented）
