# RsyncSync（macOS / Electron）

目标：双击运行的 mac 应用（Apple Silicon），使用 mac 原生目录选择框（中文），底层调用内置 `rsync`，界面提供环形进度与“克制的成功庆祝粒子”。

## 功能

- 源目录 → 目标目录镜像同步（默认开启 `--delete`）
- 可选 `--dry-run`（预演）与 `--checksum`（更严格但更慢）
- 实时进度（rsync `--info=progress2`）+ 日志抽屉（可保存/复制）
- 深/浅色主题（设置页切换），并持久化上次选择

## 环境要求

- macOS（Apple Silicon / arm64）
- Node.js 20+（用于开发/打包）
- 可选：Homebrew 的 `rsync`（用于打包内置 rsync：`/opt/homebrew/bin/rsync`）

## 开发

```bash
npm install
npm run dev
```

## 打包（生成 .app 与 .dmg）

```bash
npm run vendor:rsync
npm run dist:mac
```

产物：
- `release/` 下生成 `.app` 与 `.dmg`
- 同时会复制到桌面：
  - `~/Desktop/RsyncSync.app`
  - `~/Desktop/RsyncSync.dmg`

## 说明

- 默认：`--delete` 开、`--dry-run` 关。
- 目录选择使用 mac 原生面板，语言跟随系统。

## 常见问题

### 其他 Mac 上提示“无法验证/来自未知开发者”

本项目当前使用 ad-hoc 签名（未做 Developer ID 签名与公证），在其他 Mac 上可能被 Gatekeeper 拦截。

可选处理方式：

- Finder 里对 `.app` 右键 → “打开” → 再确认一次
- 系统设置 → 隐私与安全性 → “仍要打开”
- 仍被拦截时（终端）：
  ```bash
  xattr -dr com.apple.quarantine /Applications/RsyncSync.app
  ```
