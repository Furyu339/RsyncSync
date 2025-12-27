# RsyncSync（Electron + WebGL）

目标：双击运行的 mac 应用（Apple Silicon），使用 mac 原生目录选择框（中文），底层调用内置 `rsync`，界面提供环形进度 + 炫酷烟花特效（可调）。

## 开发

```bash
cd ~/Desktop/RsyncSync
npm install
npm run dev
```

## 打包（生成 .app）

```bash
cd ~/Desktop/RsyncSync
npm run vendor:rsync
npm run dist:mac
```

产物：
- `~/Desktop/RsyncSync/release/RsyncSync.app`
- 也会复制到 `~/Desktop/RsyncSync.app`

## 说明

- 默认：`--delete` 开，`--dry-run` 关。
- 目录选择使用 mac 原生面板，语言跟随系统；同时在打包配置中声明 `zh-Hans` 本地化以避免面板变英文。

