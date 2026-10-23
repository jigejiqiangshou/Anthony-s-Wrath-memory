# e002 — 在 DSH 沙箱内直接运行 `mvn package` 构建/验证 mod jar

## 尝试过的路

在项目根用 Maven 3.9.16 + JDK8 直接构建：`mvn -q package`（以及 `mvn -o -q package`），目标是产出 `target/anthonyswrath.jar` 并验证 pom 配置。

## 失败原因

`constraint-violation`。沙箱同时满足两个不利条件：

1. Maven 本地仓库为空（`~/.m2/repository` 无构建插件缓存）；
2. 无外网：Maven Central 与配置的阿里云镜像均不可达（`curl` HTTP 000），无法下载插件。

于是 `mvn -o package` 在插件解析阶段失败（exit 1），`mvn package` 联网同样不可行；而 `mvn -o validate` 因不解析构建插件仍可过。相关证据与实测命令见 `memory/facts/f008-maven-build-blocked-in-dsh-sandbox.md`。

## 改用的路

- 源码级验证：JDK8 `javac` + `libs/` 四个 jar 直接编译入口类（成功）；
- 结构级验证：手工替换资源占位符后用 `jar` 打包，确认 `ModTheSpire.json` 与 class 在 jar 根（成功，仅结构验证）；
- 正式构建：交给普通终端联网执行 `mvn -q package`，或提供离线仓库后用 `-Dmaven.repo.local`。

## 什么情况下值得重试

见索引 `reopenIf`：沙箱可访问 Maven 仓库（联网 / 代理），或工作区内出现含 maven-resources / compiler / jar 插件的离线仓库，或普通终端构建后已把 `~/.m2` 复制为工作区仓库。
