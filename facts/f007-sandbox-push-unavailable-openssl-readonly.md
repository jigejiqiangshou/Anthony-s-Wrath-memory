# f007 — 沙箱内推送不可用;远端只读核对须改用 openssl TLS 后端

## 结论

在本机 DSH 沙箱里:

- 默认 `http.sslBackend=schannel` 下,任何访问 GitHub 的 git 远端操作(含**匿名** `ls-remote`)都失败:`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)`。
- 加 `-c http.sslBackend=openssl` 后,**只读**远端操作(`ls-remote`,以及匿名仓库的 `fetch`)可以正常工作。
- **推送不可用**:默认与 openssl 后端都拿不到凭据——credential helper(`manager`)经 `sh.exe` 取密码时该进程被杀(`couldn't create signal pipe, Win32 error 5`),git 报 `fatal: unable to get password from user`(exit 128);本机也没有 `gh` CLI。因此提交只能本地落盘,推送须由用户在**普通终端**执行。

## 验证方法

2026-10-23,对四个仓库(顶层 / specs / memory / src)逐条实测:

```
git -C <repo> ls-remote origin master
# → fatal: unable to access 'https://github.com/...':
#   schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS (0x8009030e)

git -c http.sslBackend=openssl -C <repo> ls-remote origin master
# → 四仓均成功,返回的 SHA 与本地 HEAD 相同
#   (top 3441bc4 / specs db482e6 / memory 62a4644 / src 6f99259)

git -c http.sslBackend=openssl -c credential.interactive=false -C <repo> push origin master
# → sh.exe: fatal error - couldn't create signal pipe, Win32 error 5
#   fatal: unable to get password from user      (exit 128,memory 与顶层同错)

"protocol=https`nhost=github.com`n`n" | git credential fill   # 同样 sh.exe 失败、无输出
Get-Command gh                                               # 无结果
```

## 工作方式调整

- 核对云端 gitlink / 远端提交:用 `git -c http.sslBackend=openssl ... ls-remote`(只读,无需凭据);不要用默认后端,否则会误判为"网络不通"。
- 需要推送时:先在沙箱内完成 memory→顶层的本地提交,再把命令交给用户在普通终端执行;不要反复重试沙箱内 push。
- 不要用 `credential.interactive`/`GCM_*` 变量试图绕过:失败发生在凭据获取与信号管道层,不是交互提示层。
- 交接时必须写清"本地已提交、远端未推"以及待推的提交数与顺序,否则下一会话会把 `origin/master..HEAD` 的非零差值误读为异常。

## 适用范围

本机(Windows + Git for Windows 2.53.0)的 DSH 沙箱,远端为本项目的四个 GitHub HTTPS 仓库。换机、改用 SSH 远端、或沙箱/凭据环境变化后需重测。与 f001(`sh.exe` 信号管道致 `git submodule` 系列命令 exit 66)同源。
