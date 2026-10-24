# 016 — T004 探针首次加载失败（MTS 重载方法参数解析）与修复

日期：2026-10-24 15:11–15:25
状态：探针已修正并在沙箱内通过离线补丁目标自检；等用户重新构建/安装/运行采集。
依据：用户回报「进入游戏失败，直接卡在 modthespire 界面」并贴出 `mts_process_launch.log` 报错；主 agent 复现分析 MTS 参数解析逻辑后修复。

## 1. 现象

用户启动 ModTheSpire 时卡在加载界面，日志报：

```
com.evacipated.cardcrawl.modthespire.patcher.MissingParamTypesException: Patch anthonyswrath.probe.ProbePatches$ShuffleNoArg
Patching .shuffle:
Has overloads and no paramtypes defined
	at com.evacipated.cardcrawl.modthespire.Patcher.injectPatches(Patcher.java:486)
```

`%USERPROFILE%\awprobe.log` 未生成（探针类在 patch 阶段即失败，尚未加载）。

## 2. 根因

`CardGroup` 有两个 `shuffle` 重载：`shuffle()` 与 `shuffle(com.megacrit.cardcrawl.random.Random)`。T004 首版对无参版本写的是 `@SpirePatch(clz = CardGroup.class, method = "shuffle")`，未声明参数类型。

`javap -c com.evacipated.cardcrawl.modthespire.Patcher` 实测其 `patchParamTypez` 逻辑：**仅当 `paramtypez` 长度为 1 且元素等于 `Void.TYPE` 时返回 null（视为未声明）**；其余情况按数组元素生成 `CtClass[]`。参数类型为 null 且目标方法有重载时，MTS 抛 `MissingParamTypesException`。

## 3. 修复

- `ProbePatches$ShuffleNoArg` 的注解改为 `@SpirePatch(clz = CardGroup.class, method = "shuffle", paramtypez = {})`：空数组明确表示「无参数」，MTS 会生成空 `CtClass[]` 并精确命中 `shuffle()` 重载。
- 新增**离线补丁目标自检**（不写入交付物）：用 MTS 自带的 `javassist` 读取编译后的 `ProbePatches$*` 类，复刻 MTS 的 `patchParamTypez` / `getDeclaredMethod` 解析逻辑，并校验每个 `@SpirePrefixPatch` / `@SpirePostfixPatch` handler 的参数个数与类型（`[实例?] + 目标方法参数`）。检查代码临时放在 `target/checker/`（已被 `.gitignore` 忽略）。
- 自检结果：**ALL 15 PATCHES OK**，无 FAIL/WARN（含 `CardGroup.shuffle` 两个重载、`getPurgeableCards`、`removeCard` 两个重载、`FountainOfCurseRemoval.buttonEffect`、`transformCard` 三参版本等）。
- 检查完毕后删除 `target/checker/` 与 `target/probe-classes/`；JDK8 `javac` 重新编译通过（20 个 class）。

## 4. 剩余风险与兜底

- 若 MTS 对 handler 签名还有更严格的运行时校验，报错日志会指出具体 patch 类；按同样方式修正即可，用户侧无需改代码。
- 探针只读；`awprobe addcard / transform / shuffledeck` 只在开发测试局中操作牌组。

## 5. 本轮本地提交（未推送）

| 顺序 | 层 | 内容 |
| :-- | :-- | :-- |
| 1 | `src` | `ProbePatches` 修复（`paramtypez = {}`） |
| 2 | `memory` | 本记录 + `state.json` |
| 3 | 顶层 | 推进 gitlink（src→本轮、memory→本轮） |

`specs` 本轮无改动，不产生提交。推送顺序 src → memory → 顶层。

## 6. 下一步（用户）

1. 推送本轮三个提交（src / memory / 顶层）。
2. `mvn package` 重新构建，覆盖游戏目录 `mods/anthonyswrath.jar`。
3. 删除旧 `%USERPROFILE%\awprobe.log`（若有），启动游戏，按 `quickstart.md` §3 的六场景采集。
4. 交回 `awprobe.log`；收到后回写 research §R-004～§R-008、勾选 T004。
