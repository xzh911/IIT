# 仿个人所得税 1:1 复刻版 · Plan（v4：进度盘点 + 聚焦视觉复刻）

> ⚠️ **已归档（2026-08-19）**：本文件为历史规划，部分结论已过时（如阶段3 官方壳提取/重签名路线已被自建 cordova-ios 壳 + 免签 CI 出包取代，见 `docs/HANDOVER.md` §22）。
> **现行计划以 `docs/PHASE1-REPORT.md` §5 轮次表为准**；最新状态见 `docs/STATE.md`。

> 上一版 v3 之后，深入调查了 TLS/证书/pinning（结论见 `docs/WORK_REPORT.md` §6）。
> 该调查已终止——不影响视觉复刻，不再投入。v4 只做视觉复刻相关的事。

## 目标（用户原始需求）

高还原度视觉复刻官方「个人所得税」App：离线、零外联、无验证、可自定义数据、隐蔽 dev 入口、iOS SideStore 安装（GitHub Actions macOS runner 重签名）。

## 参考基线（已冻结）

| 基线 | 位置 | 说明 |
|---|---|---|
| **CDN www（主基线）** | `reference/cdn-www/` | 1587 文件，md5 全过，release 2026.07.29 |
| IPA www（对照） | `reference/ipa-www/` | 1586 文件，diff 记录于 `reference/analysis/manifest-diff.json` |
| 官方壳 | `ios/shell/` | 1791 文件，签名已剥离 |

## 进度盘点

### ✅ 已完成

1. **参考冻结**：CDN 全量下载 + 校验、IPA www 对照、diff 清单、截图归档
2. **架构逆向**：Cordova + WKWebView、Vue SPA、594 路由、状态栏沉浸式真相、HTTP 调用链（bridge dump 实证）、两套网络栈差异
3. **工具链**：逆向链（JDK17/jadx/apktool/rizin/py-libs）+ Playwright 容器 WebKit（`wk` wrapper）+ vision-tools
4. **前端可运行证明**：CDN www 在 WebKit 中完整渲染首页（`cordova.js` mock 已写）
5. **仓库**：git init/push、.gitignore（官方内容全排除）、`etax-input.zip` 打包脚本
6. **工作报告**：`docs/WORK_REPORT.md`（全部技术结论存档）

### ⏳ 进行中 / 待做

见下方阶段 2~5。

## 阶段 2：复刻前端（核心，全部视觉相关工作）

### 2.1 基线生成

```bash
cp -r reference/cdn-www/. web/www/
```

✅ 已由 `web/build.sh` 承担（构建管线，重复可重建）。

### 2.2 覆层补丁（`web/overlays/`）

| 补丁 | 内容 | 状态 |
|---|---|---|
| `cordova.js`（mock） | deviceready + Device/Http/statusbar/app/LaunchHotCode/etasIfaa 最小方法；sendRequest 委托给 api-stub | ✅ `web/overlays/cordova.js` |
| `api-stub.js` | 拦截 `cordova.plugins.http.sendRequest` + SMGNativeJS.nativeRouter，按 `fixtures/` 返回 mock；跨域 fetch/XHR 拦截（零外联兜底） | ✅ `web/overlays/api-stub.js` |
| `telemetry-remove` | build.sh 内：移除高德外联脚本 + yata 替换为 noop 存根（app.js 仅用 setConfig/track） | ✅ 已应用 |
| `dev-entry` | 「关于&更新」页「自然人办税服务平台」连点 5 次 → 全屏 /dev 开发者面板（fixture 模式切换/重置/日志） | ✅ `web/overlays/dev-entry.js` |
| `config-overrides.js` | `__ETAX_OFFLINE__` 等运行时覆盖；server.json/chcp.json 由 build.sh 本地化 | ✅ `web/overlays/config-overrides.js` |
| `safe-area.css` | 保留官方 754+888 处，不动 | 无操作 |

### 2.3 API → UI 影响分析（新核心工作）

✅ 产出 `docs/API-UI-IMPACT.md`（响应格式实证 / 字段映射 / 启动链路 / 待补清单）。
已 mock 并对接：`/zh/switch/query`（全 N 开关）、`/commonbusiness/tzgg/pop/find`（公告弹窗）、`/zrr/common/theme/query`（主题）、`/zrr/common/appdist/query`（宣传轮播，本地图）、`/sb/yd/gg/cxCsnrList`（参数）、`/sb/yd/gg/cxNsmxList`（**收入纳税明细列表**）、`/zrr/wszm/*` 6 接口（**完税证明全流程：列表/生成/轮询/预览**）。
发现：MK5j 包装层要求响应 `data` 为 **JSON 字符串**（content-type json 时 JSON.parse）；**业务响应必须 `{code:'SUCCESS', data:<业务数据>}`**（缺 code 即被拦截器判失败 reject）；banner 图加载失败自动回退本地默认（离线天然兼容）。
登录态：官方 deviceready 无条件清 authToken → `cordova.js` deviceready 后补写 + `mock-login.js`（`@USER/SET_BASE_INFO` + `userInfoObj` 注入）→ **全部登录后路由可直达**（实证：我的页显示 mock 用户 + 9 项完整菜单）。`/mportal/common/menu/config` 为远程菜单脚本接口，**不 mock**（失败→静态菜单更完整）。
替代版（仿照版）已全量评估归档：`reference/alternate-web/`（121 文件 + README）——自绘切图拼贴、无业务逻辑、字段不兼容，**不可缝合，仅作缺官方截图时的替代视觉参考**；官方 CDN 已在本地，重新镜像仅官方发新版时需要（分钟级）。

### 2.4 夹具（`web/fixtures/`）

✅ 结构就绪：`reference/`（banners/switch/notify-pop/theme 已填，notices/questions 占位）、`custom/`（user/employment/messages/deductions/tax-records/batch-import 占位，路径待探针）。
构建时内联为 `www/fixtures-inline.js`（reference+custom 双套，运行时 `etax_fixture_mode` 切换，custom 优先）。

### 2.5 开发/验证工具（`web/dev/`）

✅ `serve.sh`（0.0.0.0:8088 静态服务）+ `verify.js`（容器 WebKit 渲染→截图→stub 日志/console 错误/外联请求统计）。
✅ `web/build.sh`（基线+O1-O5+fixtures 内联全自动，幂等可重跑）。

### 2.6 完成标准（阶段 2）

- [x] `web/www` 基线 + overlays 应用后 WebKit 启动无 JS 报错（实证：consoleErrors=0）
- [ ] 首页/办税/查询/记录页与参考截图对齐（pixel_diff < 5%，几何优先）
- [ ] 594 路由可点入（mock 渲染非白屏）— 已跑通首页；其余待巡检
- [x] 零外联（实证：verify.js outbound=0）
- [ ] 隐僻入口 /dev 可进，reference/custom fixture 可切换（已实现，未端到端点验）
- [ ] 自定义数据可编辑（fixtures/custom 待填路径）
- [x] mock 数据带标识（meta.source:mock）/ 可重置（dev 面板）/ 导出隔离（fixtures 独立目录）

## 阶段 3：iOS 壳 + 重签名（GitHub Actions macOS runner）

- [x] 壳提取（`ios/shell/`，签名剥离）
- [ ] `ios/scripts/`：patch_www.sh（web/www + overlays → 壳）、resign.sh（zsign 自签或未签名）、pack.sh
- [ ] `.github/workflows/ios-build.yml`：checkout → 下载 Release 资产 `etax-input.zip` → 现场生成 shell/www → patch → resign → 打包 ipa → upload artifact
- [ ] 改 Info.plist（bundle id `com.<id>.etax.sim`、显示名）、config.xml（去 chcp/遥测插件、access 仅本地）
- [ ] 真机验证：SideStore 安装，状态栏/Safe Area/键盘与官方一致
- [ ] 上传 `etax-input.zip`（`tools/pack_input.sh --with-www`，77MB）到 GitHub Release

## 阶段 4：验证循环（贯穿阶段 2/3）

1. `web/dev/serve.sh` → 2. `wk web/dev/verify.mjs` → 3. 截图入 `web/dev/diffs/` → 4. pixel_diff 比对 → 5. 修最大差异 → 重复

## 阶段 5：后端（不做，占位）

```
backend/   静态目录占位，第一版纯离线
```

## 最终完成标准

- [ ] 阶段 2 全部勾选
- [ ] iOS IPA 可 SideStore 安装，外观/交互与官方一致
- [ ] 零外联、无验证、离线可用
- [ ] 差异清单记录（参考图不可变，派生物另存）
