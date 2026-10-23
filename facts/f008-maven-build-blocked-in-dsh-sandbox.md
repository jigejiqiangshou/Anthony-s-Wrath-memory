# f008 — 沙箱内无法完成 Maven 打包（空本地仓库 + 无外网）

## 结论

在本机 DSH 沙箱里，`mvn package` 走不通：

- `~/.m2/repository` 实际为空（0 字节级），没有缓存 maven-resources / compiler / jar 插件；
- 沙箱内无法访问 Maven 仓库：`curl https://repo.maven.apache.org/maven2/` 与 `https://maven.aliyun.com/repository/public/` 均返回 HTTP 000（连接被关闭），`Invoke-WebRequest` 同样失败；
- 因此 `mvn -o package` 在插件解析阶段就失败：`Plugin org.apache.maven.plugins:maven-resources-plugin:3.2.0 or one of its dependencies could not be resolved ... Cannot access aliyunmaven ... in offline mode`（exit 1）；`mvn -o validate` 仍可通过（validate 不需要解析构建插件）。

工具链本身没问题：JDK 8（`C:\Program Files\Java\jdk1.8.0_501`）与 Maven 3.9.16 均在，`javac` 直接以 `libs/` 四个 jar 为 classpath 编译入口类成功。

## 验证方法

2026-10-24，在本项目根：

```
mvn -o -q validate            # exit 0
mvn -o -q package             # exit 1：maven-resources-plugin:3.2.0 无法解析
curl.exe -s -o NUL -w "%{http_code}" https://repo.maven.apache.org/maven2/          # 000
curl.exe -s -o NUL -w "%{http_code}" https://maven.aliyun.com/repository/public/    # 000
Invoke-WebRequest -Uri https://repo.maven.apache.org/maven2/ -Method Head -UseBasicParsing
# → 失败：基础连接已经关闭: 接收时发生错误
# ~/.m2/repository 下无 maven-compiler-plugin / maven-jar-plugin / maven-resources-plugin 目录
javac -encoding UTF-8 -source 1.8 -target 1.8 \
  -cp "libs\desktop-1.0.jar;libs\ModTheSpire.jar;libs\BaseMod.jar;libs\StSLib.jar" \
  -d target\classes src\main\java\anthonyswrath\AnthonysWrathMod.java                 # exit 0
```

## 工作方式调整

- 需要 `mvn package` 时：在**普通终端**（联网）执行，或把带插件的离线 Maven 仓库放进工作区并用 `-Dmaven.repo.local=<dir>`；不要在沙箱内反复重试。
- 仅验证 Java 源码能否编译时，可用 JDK8 `javac` + `libs/*.jar` 直接编译（已成功），但这不是 `mvn package` 的等价验收。
- 若要让后续沙箱会话也能构建：普通终端首次构建填充 `~/.m2` 后，把该仓库复制为工作区 `.m2repo/`（加入忽略），再用 `mvn -o -Dmaven.repo.local=.m2repo package`。

## 适用范围

本机 Windows + Maven 3.9.16 + JDK 8 的 DSH 沙箱，且项目依赖需要从 Maven 仓库解析插件时。换机、沙箱放开网络、或提供离线仓库后需重测。与 f007（沙箱推送不可用）同属沙箱环境约束；与 f001/f003 的 `sh.exe` 信号管道问题不同源。
