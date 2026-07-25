# Rainy 数独训练

给孩子 Rainy 做的数独练习 PWA。纯静态站点,**没有构建步骤**——改完源文件直接刷新浏览器即可。

设计上极重视儿童动机:奖励、进化、动画都是为了让她愿意持续练下去,改动时优先考虑"她会不会更想玩"。

## 跑测试

系统默认 `node` 不可用,必须用完整路径:

```bash
/opt/homebrew/opt/node@20/bin/node tests/rewards.test.js && /opt/homebrew/opt/node@20/bin/node tests/puzzle-difficulty.test.js
```

没有 package.json,不用 npm。改动奖励/进化逻辑后务必跑 `rewards.test.js`。

## 发布

推 `main` → GitHub Actions 自动部署到 GitHub Pages(约 20 秒)。线上:
<https://deep-dai.github.io/rainy-sudoku-training/>

**每次发布必须同步升级三处版本号**(`tests/rewards.test.js` 有断言锁死,不一致会测试失败):

1. `scripts/app-utils.js` 里的 `const APP_VERSION = "NN"` —— 决定页面底部 `vNN` 角标
2. `sw.js` 里的 `CACHE_NAME = "rainy-sudoku-vNN"`
3. `index.html` 里全部 `?v=NN`(styles + 7 个脚本)

第 3 步可用:`sed -i '' 's/v=37/v=38/g' index.html`

## 文件结构

- `index.html` / `styles.css` —— 页面与样式(样式全在这一个文件里)
- `scripts/app-state.js` —— 全局 `state`、`settings`、`els`(所有 DOM 元素在此登记)
- `scripts/app-game.js` —— `init()`、事件绑定、出题与判题
- `scripts/app-rules.js` —— 数独生成与难度控制
- `scripts/app-rewards.js` —— 贴纸抽取、收藏册、贴纸大图
- `scripts/app-evolution.js` —— 4/5 级贴纸的能量进化系统
- `scripts/app-utils.js` —— 存档读写、Service Worker 注册与更新提示;**末尾调用 `init()`**
- `sw.js` —— 离线缓存;新版本等待,由页面点"更新"后 `SKIP_WAITING` 接管

## 约定

- 注释和 UI 文案都用中文,与现有风格保持一致
- 新增 DOM 元素要在 `app-state.js` 的 `els` 里登记
- 弹窗内的动画:元素在 `display:none` 时设样式不会触发过渡,必须等 `showModal()` 之后再设(能量条动画踩过这个坑)

## 两条红线

- **绝不提交 `video-edits/`**(171MB 视频素材,会永久撑爆仓库)。`dev-seed.html` 含"秒填答案"作弊按钮,也已在 `.gitignore` 里,别发布。
- **绝不建议用户"清除网站数据"来刷新**——Rainy 的贴纸星星存在 localStorage,会被一起清空。iOS 主屏图标是 standalone PWA,缓存顽固,安全的刷新方式是应用内下拉刷新,或在 Safari 打开带 `?v=` 的网址。
