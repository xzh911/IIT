# 项目进度报告 — 个人所得税 App 高保真复刻（2026-08-18）

> 本文档是当前项目状态的**总报告**。历史细节见 `docs/WORK_REPORT.md`（逆向阶段）、`PLANv4.md`（执行计划）、`docs/API-UI-IMPACT.md`（API→UI 影响表，持续更新）。
> 结论标注：★ = 容器 WebKit 运行时实证；[静态] = 混淆代码分析结论。

---

## 1. 项目概览

**目标**：高保真复刻官方「个人所得税」iOS App —— 离线运行、零外联、无卡密/登录验证、登录后页面可直达、可注入/生成自有数据（自定义层）、最终打包为可 SideStore 安装的 IPA。

**核心策略**（已定案，不再变更）：**官方 CDN 前端全量本地化 + 复刻层（cordova mock / api-stub）**，页面 UI 100% 来自官方 bundle；自定义能力全部放在独立 overlay 层，不修改官方代码。

---

## 2. 阶段完成度总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| 逆向调查 | 官方/仿照版双重分析，确认技术栈与可行路线 | ✅ 已收官 |
| 阶段 1 | 参考冻结（CDN 1587 文件）、工具链、可运行证明 | ✅ 完成 |
| 阶段 2 | 基线 + O1-O6 overlays + fixtures + 验证管线 + API 影响表 | ✅ 主体完成 |
| 阶段 3 | iOS 壳打包（patch_www/resign/SideStore） | ⏸ 未开始（等前端稳定） |
| 阶段 4 | WebKit 截图比对视觉回归 | ⏸ 部分（截图存档已建） |

---

## 3. 参考源与证据盘点

| 来源 | 位置 | 规模 | 用途 |
|---|---|---|---|
| 官方 CDN 前端（主基线） | `reference/cdn-www/` | 1587 文件（index.html + static/ 全量） | **复刻基线**，即官方 App 实际运行的前端 |
| 官方 IPA www（对照） | `reference/ipa-www/` | 1586 文件 | CDN/IPA diff 验证（`reference/analysis/manifest-diff.json`） |
| 官方 IPA 解包 | `ipa_unpacked/` | 壳+签名信息 | 阶段 3 打包用（插件清单、图标、签名结构） |
| 仿照版 APK | `reference/inputs/geshui.apk` + `reference/geshui-apk-unpacked/` | 空壳 uni-app | **已评估：无价值**（见 §8） |
| 仿照版远程 web | `reference/alternate-web/` | 121 文件（41 html） | 仅替代视觉参考（见 §8） |
| 官方截图资产 | `reference/screenshots/` | shot.png/shot2/shot3.png | 仿照版演示截图（不是官方截图，仅一般参考） |
| 抓包材料 | `packetSniffing/` | — | HTTP 调用链实证（bridge dump） |

---

## 4. 逆向结论（官方 App 架构，已实证）

1. **技术栈**：Cordova iOS + WKWebView + Vue 2 SPA（webpack 655 chunk，**594 条前端路由**）；页面 UI 全部在本地 bundle（CSS/图片齐全）。
2. **请求链路**（★ 实证）：
   ```
   业务方法（API 表）→ axios 克隆（拦截器）→ MK5j.request → cordova.plugins.http.sendRequest
   ```
3. **响应协议（最关键发现，★ 实证）**：
   - 业务响应体 = `{ code: 'SUCCESS', data: <业务数据> }`；
   - 缺 `code:'SUCCESS'` 或结构不符 → 拦截器判业务失败 → reject `{msg:'很抱歉，系统正在努力恢复…'}` → 页面空态；
   - `sendRequest` 成功回调必须传 advanced-http 格式 `{status, url, headers:{'content-type':'application/json'}, data:<JSON字符串>}`（MK5j 对 data 做 JSON.parse，传对象会抛错）。
4. **登录态**（★ 实证）：路由守卫只查 `localStorage.authToken`；**官方 deviceready 时会无条件清除 authToken** → 预置注入无效 → 需在 deviceready 触发后补写（已实现，见 §6 O1/O6）。
5. **埋点/外联**：官方 = yata（gdm 遥测）+ 高德地图外联 + 阿里云验证码/极验（触发式）；yata/高德已在 O3 移除，其余由 api-stub 跨域拦截兜底（★ outbound=0）。
6. **热更新**：server.json/chcp.json 本地化后 LaunchHotCode 无需处理（build 时改写）。

---

## 5. 当前代码结构（web/）

```
web/
  build.sh                  # 构建管线：基线复制 → O3 补丁 → overlay 注入 → fixtures 内联 → server.json/chcp.json 本地化 → 图片资源复制
  www/                       # [gitignore] 构建产物（= 可打包的复刻前端）
  overlays/                  # 复刻层 + 自定义层脚本（5 个）
  fixtures/
    reference/               # 冻结参考内容（14 文件）——我官方内容/开关/公告/theme/banner 等
    custom/                  # 用户可编辑数据占位（6 文件，均带 source:mock 约定）
  dev/
    serve.sh                 # 本地静态服务（0.0.0.0:8088）
    verify.js                # 容器 WebKit 验证：渲染/截图/stub 日志/console 错误/外联统计
  sweep.js                # 批量路由巡检：miss 清单/页面文本/截图 → sweep-report.json
    diffs/                   # 验证截图存档（16 张，见 §7）
```

### Overlays（5 个）

| # | 文件 | 层 | 职责 |
|---|---|---|---|
| O1 | `cordova.js` | 复刻层 | deviceready 触发 + Device/Http/statusbar/app/LaunchHotCode/etasIfaa/sim 等插件 mock；deviceready 后**补写 authToken**（mock 登录态） |
| O2 | `api-stub.js` | 复刻层 | sendRequest/nativeRouter 路由到 fixtures；跨域 fetch/XHR 拦截（零外联兜底）；`window.__API_STUB__` 日志 |
| O3 | `build.sh` 内 | 复刻层 | index.html 移除高德外联 + yata 替换为 noop |
| O4 | `dev-entry.js` | 自定义层 | 隐藏入口（协议页「用户注册协议」5 连击）→ 全屏 /dev 面板：模式切换 / 一键生成 mock 数据（用户/税务记录/消息/完税证明/任职受雇模板）写入运行时覆盖层（localStorage.etax_custom_overrides，刷新即生效）/ 覆盖层 JSON 编辑器（导入导出清空）/ 日志 / 重置 |
| O5 | `config-overrides.js` | 复刻层 | `__ETAX_OFFLINE__`/server.json/chcp.json 本地化 |
| O6 | `mock-login.js` | 自定义层 | Vuex 就绪后 commit `@USER/SET_BASE_INFO` + 注入 `state.userInfo.userInfoObj`（张伟/纳税人识别号）→ 我的页显示用户 |

---

## 6. 已对接 API → UI（★ 均为运行时实证）

### 6.1 启动/全局

| API | 使用方 | 说明 | fixtures |
|---|---|---|---|
| `/zh/switch/query` | 启动 `@GLOBAL/BUSSNESS_SWITCH_STATUS` | 数十项功能开关；字段名已从 mutation 映射（`zssj.validate.switch` 等），全 N → 关闭 | `switch.json` |
| `/commonbusiness/tzgg/pop/find` | 首页弹窗 | 公告弹窗；`{content:[{contentId,title,content}]}` | `notify-pop.json` |
| `/zrr/common/theme/query` | 主题色 | 响应=主题代码字符串（`NORMAL`） | `theme.json` |
| `/zrr/common/appdist/query` | 首页轮播 | `{bannerVOS:[{bannerUrl(本地图),bannerCode,cls}], bannerInterval, ztyVOS}`；图加载失败→自动回退本地默认轮播（★ 官方自带的离线友好逻辑） | `banners.json` |

### 6.2 收入纳税明细（入口 ✓）

| API | 说明 | fixtures |
|---|---|---|
| `/sb/yd/gg/cxCsnrList` POST | 页面参数（csdm 配置，key=csdm） | `income-config.json` |
| `/sb/yd/gg/cxNsmxList` POST | **明细列表**：`{nsmxList:[{sdxmDlDm,sdxmDlmc,grsdssdxmmc,ywlxDm,kjywrMc,sre,ybtse,skssqq/skssqz}], ybtseHj, sreHj}` | `tax-record-list.json` |

★ 实证：列表完整渲染（4 条 mock：工资薪金×2/劳务报酬/经营所得，收入合计 157600.00 元、已申报税额合计 13487.99 元）。

### 6.3 纳税记录开具（完税证明，核心，整流程打通）

| API | 说明 | fixtures |
|---|---|---|
| `/zrr/wszm/query` POST | 列表：`{list:[{sdxm,skssqq/skssqz,sjtse,skssjg,sz,ypzh,sbrq}], total, hjse}` | `taxproof-list.json` |
| `/zrr/wszm/kjcs` GET | 已开/可开次数 `{ykjcs,zkjcs}` | `taxproof-kjcs.json` |
| `/zrr/wszm/kj` POST | 生成证明 → `{kjsqxh}` | `taxproof-generate.json` |
| `/zrr/wszm/kjcx` GET | 轮询开具结果 → `{wszmPics:[{fileId}]}` | `taxproof-result.json` |
| `/zrr/dzzl/url/query` GET | 证明图 URL → `{viewUrl}`（本地 `taxproof-mock.svg`，带"非官方"水印标识） | `taxproof-img-url.json` |
| 证明图资源 | — | `taxproof-mock.svg`（build.sh 复制到 static/images/） |

★ 实证：年度选择 → 列表（2 条 + 合计 ¥13487.99）→ 生成 → 轮询 → **预览页（1/1、添加到相册）完整渲染**。

### 6.4 我的 / 消息 / 待办 / 办&查（批量巡检后状态）

| API | 说明 | 状态 |
|---|---|---|
| `@USER/SET_BASE_INFO` + `userInfoObj` 注入 | 我的页显示 mock 用户（张伟/识别号）+ 9 项完整菜单 | ✅ |
| __待办__ `/zrr/task/pageQuery` | 待办列表（3 条 mock 任务）+ tab 结构 | ✅ |
| __消息__ `/zrr/message/classify/query` / `znx/list/query` / `znx/content/query` | 分类筛选/消息列表/详情页（HTML content） | ✅ |
| `/mportal/common/menu/config` + `menu-shim.js` | **mock 指向本地官方菜单 shim**（菜单完整 + 无 toast） | ✅ 已打通 |

### 6.5 /dev 数据面板（自定义层，已交付 ★ 全链路实证）

- **入口**：协议页（`/register/agreement`）「用户注册协议」标题 5 连击（隐藏，不进正常截图）
- **运行时覆盖层**：`api-stub.matchRoute` 优先匹配 `localStorage.etax_custom_overrides`（JSON 路由数组，同 fixtures 结构）→ 编辑即时生效，**无需 rebuild**
- **一键生成模板**：示例用户（jbxx/query）、示例税务记录（cxNsmxList 覆盖 reference）、示例消息、示例完税证明、任职受雇（路径为推断值，待验证）
- **编辑器**：覆盖层 JSON 编辑/清空/复制（可粘贴至 fixtures/custom/*.json 持久化）
- ★ 实证闭环：5 连击 → 生成示例税务记录 → 刷新 → 收入明细页显示新数据（26200/1906，覆盖默认 4 条）
| 待 mock | `/zrr/jbxx/query`（个人信息）、`/common/srf/getToken`、`/zrr/sddq/query`、`/zrr/sqbs/bsqx/query`、`/zh/swrysf/query`、`/commonbusiness/event/query`、`/zrr/message/type/wdxxsl/query`（未读徽标）、`/sb/yd/gg/sbzt/cx` 等 | 📝 影响表待补 |



| API | 说明 | 状态 |
|---|---|---|
| `@USER/SET_BASE_INFO`（不发起网络） | logined=true + userInfo ↩ 名字/识别号显示 | ✅ mock-login.js |
| `userInfo.userInfoObj` 注入 | 我的页用户头像/识别号 | ✅ |
| `/mportal/common/menu/config` | **不 mock**（！！！）——返回的是远程菜单脚本（csnr=脚本 URL），mock 成功空数组反而让菜单消失；**失败→官方 fallback 静态菜单更完整** | ✅ 结论记录 |
| 我的页 miss | `/zrr/jbxx/query`、`/common/srf/getToken`、`/zrr/sddq/query`、`/zrr/sqbs/bsqx/query`、`/zh/swrysf/query`、`/commonbusiness/event/query`等 | 📝 已记入影响表，待 mock（/dev 生成功能的数据路径） |

---

## 7. 已验证状态（★ WebKit 容器实证）

| 页面 | 状态 | 截图存档 |
|---|---|---|
| 首页（#/zdj-home） | 全结构渲染（待办/办&查/消息/我的/搜索框/汇算区） | `home-final.png` |
| 我的（#/zdj-profile） | 张伟 + 纳税人识别号 + 9 项完整菜单（含退出登录） | — |
| 消息（#/zdj-message） | 分类筛选 4 项 + 3 条消息列表 + **详情页** | `sweep-zdj_message.png` |
| 待办（#/zdj-pending-tasks） | 3 条任务（状态标签/按钮/未读点） | `sweep-zdj_pending_tasks.png` |
| 办&查（#/zdj-service） | 服务列表完整 + miss=0 + 无 toast | `sweep-zdj_service.png` |
| 4 个主页面（首页/我的/消息/待办/办&查） | **全部 miss=0、无错误 toast**（★ 2026-08-18 晚） | `sweep-*.png` |
| 收入纳税明细 | 列表+统计完整 | `route-IncomeTaxPayment_taxRecordList.png` |
| 完税证明 3 步全流程 | 列表/生成/预览 | `taxproof-query.png` `taxproof-generate.png` |

其他留存脚本：`__probe/`（18 个探针：skip_guide、actions 订阅、who_clears、record、taxproof 等）。

---

## 8. 仿照版（替代版）评估结论（已归档）

- 服务器 **在线**（175.24.180.44:8080/8081/8082），但**带 UA+Referer 门禁**（`ETaxClient` UA 才放行，之前误判宕机）；正式版卡密墙，**试用版 8082 免卡密**（已全量爬取 121 文件）。
- 形态（★ 抽查实证）：**自绘 HTML+手写 SVG + 官方界面截图切图 jpg**，数据为死数据/自定义 PHP 后端（kufaka 卡密售卖），**无官方前端结构、无业务逻辑、字段与官方 bundle 不兼容**。
- **结论：不可缝合、零加速价值**；仅当官方缺某页截图（如首页/重点服务整图）时，它的页面截图可作为替代视觉参考；官方 CDN 已在本地（无需重爬；官方发新版时才需镜像 CDN — 分钟级）。

---

## 9. 关键知识 / 踩坑记录（新同事/继续工作前必读）

1. **fixture 响应结构模板**（新 mock 一律照此）：
   ```json
   {
     "match": "/zrr/xxx/yyy",
     "method": "get|post",
     "data": { "code": "SUCCESS", "data": { ...官方响应字段... } }
   }
   ```
2. **勿 mock `/commonbusiness/tzgg/lamp/list/query` 之外直接调 appdist 的链路**：首页轮播挂在 `clickTabItemHandler→theme→updateHomeBanner` 联动（登入/登录 chain），未登录时不是必调；硬 mock 会让页面进入非官方路径。
3. **响应 data 必须是 JSON 字符串**（经 `JSON.parse` 一层），不能直接传对象。
4. **官方 deviceready 清 authToken**：登录态由 cordova.js+mock-login.js 注入，**不在页面预置 localStorage**。
5. **零外联**：api-stub 拦截跨域 fetch/XHR（★ 验证 outbound=0）；ya ta/高德已在 O3 移除。
6. **fixtures/custom 数据契约**：user/employment/messages/deductions/tax-records/batch-import 均已建占位（routes:[]），带 `source:"mock"` 明文标注；生成记录必须可重置（dev 面板已提供 localStorage 重置）。

---

## 9.5 加速工具（本轮新增）

| 工具 | 作用 | 用法 |
|---|---|---|
| `web/dev/sweep.js` | **批量路由巡检**：一次进 N 页 → 自动收 miss 清单/页面文本/截图 → 汇总 `diffs/sweep-report.json`（= 待 mock 清单） | `wk web/dev/sweep.js /路由1,/路由2 ... 13` |
| `tools/api-fields.js` | **字段提取**：从官方混淆代码自动提取某 API 附近字段引用候选（去重+排序） | `node tools/api-fields.js <路径片段>` |

效果：单页「探针→miss→字段→fixture→验证」已从 ~2h 压到 ~20min；本轮批量对接 3 页面 6 接口（待办/消息列表/消息详情）全部一次成功。剩余重复部分主要是「字段候选→人工确认语义」与「fixture 值编写」，已无法再降。

## 10. 工作量评估与下一步

### 剩余工作量（估）

| 项 | 数量 | 单价 | 小计 |
|---|---|---|---|
| 简单列表/查询页（公告/常见问题/帮助中心…） | ~40 | 0.5-1h | 30h |
| 记录/结果页（申报记录/退税/消息…） | ~15 | 1-2h | 25h |
| 表单页（专项扣除/银行卡/任职受雇…） | ~10 | 2-3h | 25h |
| 复杂流程（年度汇算/退税/预约…） | ~8 | 3-5h | 30h |
| 强原生插件（实人认证/人脸/扫码） | ~5 | 降级处理 | 5h |
| /dev 面板生成/编辑/批量导入 UI | 1 | 6-10h | 8h |
| iOS 壳（阶段 3） | 1 | 8-16h | 12h |
| **合计** | — | — | **~120-140h** |

速度判断：协议与探针流程已成熟（收入明细+完税证明 8 接口全部一次对接成功），已从摸索期进入流水线期。

### 建议顺序

1. **消息页 + 我的页剩余 miss 接口**（用户直接可见，且为 /dev 编辑铺路）
2. **/dev 面板编辑/生成 UI**（读 custom fixtures → 写回 → build 即可生效）
3. 按「首页服务入口」逐项铺核心页面（办&查、申报、记录）
4. iOS 壳（阶段 3）与视觉回归穿插进行

---

## 11. 风险与注意事项

- 官方前端版本会变（本基线为 2026-08 冻结，`updateServiceSwitchTime` 等会判定新版本）→ 影响仅限版本号相关判断，不阻塞渲染。
- 部分接口（如 `/login/userLogin`）涉及实名/卡号/人脸等：只保 UI + 失败兜底，不强 mock 安全链路。
- 版权：复刻仅用于测试/演示；不发布于官方渠道，不得冒充官方服务（dev 面板 + mock 图均带「非官方」标识）。
- 参考文件**不可修改**（`reference/` 下原始截图/cdn-www 均只读），所有衍生改动在 web/（构建产物 www/ 可随时重建）。

---

*附：所有探针/构建/验证命令的用法见 `web/dev/` 下脚本注释与 `__probe/` 探针自身注释。*