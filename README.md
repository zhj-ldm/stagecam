# StageCam 展台

面向教室大屏（触控一体机 / 智慧黑板）的实物展台软件，纯 Electron 实现，Mac 开发、Windows 运行完全一致。

## 功能

- 无边框满屏摄像头画面，右侧贴边半圆把手可折叠相册
- 底栏六键：浏览 / 批注分段、画笔（含全色域取色）、锁定画面、橡皮（带擦除范围圈）、拍照 / 回到实时
- 批注按图像坐标保存，缩放平移始终严丝合缝、任意倍率都清晰
- 拍照后照片进相册（单列、最新在最上、可多选删除），本地持久化，可改存储目录

## 开发

```bash
npm ci
npm run dev          # 开发模式
npm run typecheck    # 类型检查
npm run test         # 单元测试（vitest）
npm run lint         # ESLint
npm run dist:mac     # 打 macOS dmg
npm run dist:win     # 打 Windows NSIS 安装包
```

## 手势

- 单指（批注模式）：书写 / 橡皮擦除
- 单指（浏览模式）：平移；双击复位
- 双指：捏合缩放（跨度比语义 + 抖动死区 + 单次限幅，大触控屏不抽搐）
- 触控板：双指捏合缩放，双指滑动平移；页面缩放已在主进程禁用

## 目录

```
src/main       主进程：窗口、IPC、相册与设置存储
src/preload    contextBridge 暴露 window.api
src/renderer   渲染层：React + WebGL 画面 + Canvas 笔迹引擎
src/shared     主进程与渲染层共享的类型契约
tests          geometry / squircle / pinch 的单元测试
```

## CI

`.github/workflows/ci.yml`：在 macOS 与 Windows 上跑类型检查、单测、构建、Lint；通过后在 Windows 上打包 NSIS 安装包并上传为构建产物。
