# 会话交接报告 3 — 2026-08-18 23:00（HAR 内容定版 + 外链 pass-through；总进度 / 剩余 / 难度 / 边界）

> 新会话入口顺序：`docs/STATE.md`（50 行）→ `docs/HANDOVER.md`（§18-§20 权威判定）→ 本文件（总进度与下会话清单）。
> **2026-08-18 23:15 追加：计划已改**——用户决定不做 50 页铺开（100h 无时间），改为 **3h 内出"第一版检阅"**。冲刺计划：`.kilo/plans/first-version-review-sprint.md`（本会话只按它执行，其余全部冻结）。
> 上一会话：`docs/WORK-REPORT-2026-08-18-session2.md`；总览 `docs/PROGRESS-REPORT.md` 部分段落已过期（以本文件 + HANDOVER 为准）。
> 全 repo 仅 1 commit（init）；**不 commit/push**；`reference/`（含两个 HAR）只读。

---

## 1. 本会话完成（HANDOVER §19 任务清单第 1 项）

**任务：分析两个新 HAR，提取宣传文章/banner/政策/FAQ，评估本地化并落 fixture。**

### 1.1 先行基线
`wk web/dev/verify.js smoke 12` → **hit=14 miss=0 blocked=0 outbound=0**（PAGEERROR 是 cordova 插件缺失基线噪音，非回归）。

### 1.2 HAR 结构（已拆，勿重探）
| HAR | 规模 | 构成 |
|---|---|---|
| `packetSniffing/Stream-2026-08-18 22_08_47.har` | 793 条 | 502×`12366.chinatax.gov.cn`、217 空 host 断连噪音、50×`m.etax:18443`、6×`wcdn`、8×阿里云 captcha 域 |
| `packetSniffing/proxypin_export_2026-08-18.har` | 119 条 | 67×`fgk.chinatax.gov.cn`（法规库）、35×`m.etax:18443`、4×`www.chinatax.gov.cn`、2×`zfwzgl.www.gov.cn` |

### 1.3 m.etax:18443 响应全集（本 HAR 出现的全部业务响应）
- `cjwt/query`（1157-2286B）、`cjwt/lx/query`（202B）、`cjwt/v2/lx/query`（446-750B）→ 已有 `faq-dynamic.json` ✅
- `basecode/CS_SB_XGCS/values/SB_ZXFJKCUP2023_ZCSM`（542B 政策 HTML）→ **`policy-content.json` 与本 HAR 载荷字节级一致**（复用 §HANDOVER §10 老 fixture，无需新动作）✅
- `yybs/queryyybspzxx`（439B）→ 已有 ✅；`common/flow/bypass`（250B）→ 已有 ✅
- `mobilezty/`（26KB HTML×多，m.etax 主站 + wcdn 图片）→ 外部 H5，见下

**结论：App 自身消费的公共内容接口全部已落地，HAR 无任何新增缺口。** tzgg/lamp/rdwt 类请求两个 HAR 均未出现（HANDOVER §19 任务 2、3 无操作可做）。

### 1.4 核心判定：12366 / mobilezty = 外部站点，不本地化（★ 实证）
- 办税指南 / 最新法规 / 热点问题 = bundle 常量 `GOBAL_EVENT_OUT_LINK_TAX_{GUIDE,POLICY,HOT}`（`web/deob/app/deobfuscated.js:54890`+UUAu 模块）→ `$native.InAppBrowser.open(url)` 直开 `12366.chinatax.gov.cn` **独立网站**；HAR 证实打开的就是该站 WAP 壳 + sui/zepto JS + `/wap/wapi/*` 接口（rdwt 50 条分页、rdDetail、toDetail、bszn 目录+正文均捕获）
- App 专项扣除 H5 深链 `mobilezty/#/{special-deduction-policy,warning-case}` = m.etax 外站（主 JS `yata_v_0_1_11.js` HAR 未含，离线不可跑）
- **处置（本次改动）**：
  - `web/overlays/cordova.js` 增 **InAppBrowser pass-through mock**：外链 URL 直接 `window.open(url)` 直开真实站点（联网原样），返回 `{addEventListener('exit')}` 空壳防 TypeError（此前一点就抛错，属缺陷）
  - **撤回**临时提取的 `wap-12366.json`（fixtures 只保留 App 自身消费数据；原始素材仍在 HAR）
  - `fgk.chinatax.gov.cn` = 法规库整站镜像（zcfgk/xhtml 静态+图片），不本地化
- 探针证据：`__probe/har123_probe.js`（$native/InAppBrowser 结构 + 打开现状）、`__probe/ibab_pass.js`（实测 `noThrow:true, retType:'object'`）

### 1.5 验证与本轮文件
- `bash web/build.sh` 通过（fixtures-inline reference=63）；smoke 复验无回归
- 改动：`web/overlays/cordova.js`、`docs/STATE.md`（≤50 行）、`docs/HANDOVER.md` §20、`__probe/{har123,ibab_pass}.js`

---

## 2. 项目总进度与完成度

### 2.1 分层完成度（估，已含本会话）
| 层 | 完成度 | 说明 |
|---|---|---|
| 逆向/技术栈/协议 | ~100% | 协议、登录态、动态内容机制、WAF/18443 定版（勿重探） |
| 复刻管线（build/overlays/fixtures/verify/sweep/deob） | ~90% | 流水线成熟，单页 20min |
| 核心用户链路 | ~100% 可演示 | 首页/我的/消息/待办/办&查/收入明细（列表+详情）/完税证明全流程/帮助中心/留言咨询/银行卡/家庭成员/协议；16 菜单入口 + 5 tab 可达 miss=0 |
| 高频页面数据铺开 | ~30% | ~50 个核心页尚未逐页磨数据（估算 100-130h） |
| iOS 壳 + IPA | **0%** | `ios/out` 空、无 `.xcodeproj`，12-16h |
| 视觉回归（规模化） | ~20% | 截图/vision 管线有，全量比对未铺 |
| **总体** | **~35-40%** | 剩余 ≈ 120-150h |

### 2.2 已交付物清单（会话 2+3 新增，均有实证）
- fixtures：`global-shared.json`（14 条共享路由）、`record-tabs.json`（申报记录 hub：缴税记录/缴税凭证/退抵税记录/申报详情）、`declareRecord`（专项附加 7 条，**关键 tyMap.sfycfjl='N'**）、`tax-record-detail.json`（cxNsmxXq 收入明细详情，0101+Y 形态）、`task-unread-num.json`、`message-unread-v2.json`、`help-center.json`、`help-detail.json`、`tax-service.json`、`bypass-post.json`
- 链路实证：收入明细列表→详情（列表点第一条）、完税证明选年度→列表→生成→预览（taxproof-mock.svg）、菜单 shim（menu-config/menu-shim）、帮助中心三级、tab 切换（limit/check DYNAMIC 兜底）
- 工具：`tools/deob-export.sh`（web/deob 模块树 1881+557+656，物化 8609 表）、`tools/deob-materialize.js`、`__probe/list_routes.js`（714 路由）

---

## 3. 剩余清单（缺什么，按优先级）

### P1 页面铺开 —— ~50 核心页（~100-130h）
- 类型单价（HANDOVER §8）：简单列表 0.5-1h / 记录页 1-2h / 表单页 2-3h / 复杂流程 3-5h
- 起步法：`__probe/list_routes.js` 提 714 路由 → `sweep.js` 批量 → 对新页面 miss 先比 **HANDOVER §11.2 共享接口表 + global-shared.json**（多数已覆盖）→ 逐页字段映射
- 高价值优先：申报记录进入链路、专项附加详情、发票（发票抬头/walletList）、年度汇算 ndhsqj、非货币性/税收优惠备案/天使投资抵扣空态补数据

### P2 打磨项
1. **申报记录 tab 数据**：默认 tab 由 store `recordSbxh` 驱动，需真实申报流程进入（中-难，勿硬填）
2. **收入明细详情 `sfljsd='N'` 形态**（0103 全年一次性奖金/劳务，走 `SDXM_FLJ_FIELD_MAP`）：fixture 按 URL 匹配不支持按 body 区分 → 需 DYNAMIC 或新方案
3. **invoice/invoiceTitle DOM-vs-截图矛盾**（已熔断，记录即止；探针 p3_* 存档）
4. **消息 tabbar 徽标真实触发**：本地无可达代码路径（updateBigUnread 无调用者），需真机推送验证（已归档 p2-badge-evidence-final.json）
5. **mobilezty H5 补抓**（可选）：yata_v_0_1_11.js 未在 HAR，若想离线展示专项扣除 H5 需用户 Stream 再点一次

### P3 iOS 壳打包（阶段 3，12-16h）
- `ios/out` 空 → 需新建 `.xcodeproj`/工程，或复用 `ios/shell/`（官方 Payload 解包，已剥签名，1791 文件）
- 流程：web/www 打包 → patch config.xml/Info.plist（§4.5 清单）→ 重签（zsign 自签 / SideStore 设备端 Apple ID）→ GitHub Actions mac runner（最小 public repo，产物走 Release asset）
- 需 mac runner + Xcode + 签名密钥；**唯一需要外部环境的环节**

### P4 工具/质量
- dev 面板生长（编辑/生成/批量导入 UI）6-10h
- 探针库沉淀 `__probe` → `tools/probe-lib.js`（可选）
- 规模化视觉回归：sweep 截图 + `vision_analyze_image` + `pixel_diff.py`（穿插）

---

## 4. 难度与风险排行（哪些最麻烦）

1. **复杂流程页**（年度汇算 ndhsqj、退税、预约）：3-5h/页，字段深且状态机多 → 最大剩余成本
2. **iOS 壳打包**：无现成工程、mac runner 环境未验证、签名/续期链路（SideStore 7 天）未跑通过 → 唯一外部依赖
3. **混淆字段映射**：仍是逐页主耗时（流水线期 20min/页，表单/复杂页更高）；只读代码时**先 web/deob 树 rg，勿碰原始 minify**
4. **强原生插件页**（实人/人脸/扫码）→ 已拍板走 `/function-not-open` 兜底，不强 mock
5. **invoice 矛盾未决**：不阻塞，熔断即止（§2 §5.17）
6. **消息徽标真触发**：需真机，本地无路径 → 记已知限制
7. **动态内容脚本**：wcdn 需 `ETaxClient/2.3.3` UA 下载；menu-shim+cjwt×4 已本地化，新脚本按 §2.5 模式继续

## 5. 边界范围（明确不做 / 已拍板，勿翻案）

- ❌ mock `captcha/base64Image`（AFS 兜底；保持 miss）
- ❌ 扫码/人脸/改名/注册 → 官方自带 `/function-not-open`
- ❌ 抄仿照版 `reference/alternate-web/`（§6 归档）
- ❌ 本地化外部站点：12366（办税指南/热点问题/最新法规）、mobilezty、fgk 法规库（本轮定版：联网直开）
- ❌ 真机 18443 业务抓包（WAF 瑞数过不去）→ 登录态业务页=合成 mock，**必须 `source:"mock"` 标记**
- ❌ `sfljsd='N'` 形态、消息徽标 v2 GET 真触发（需真机）
- ✅ 响应必须 `{code:'SUCCESS',data}` + stub 回调 data 为 JSON 字符串；请求路径带 `web/` 前缀
- ✅ 全程不 commit/push；`reference/` 只读；8088 静态服务会话间会挂需重启（background_process）

## 6. 下一会话任务清单（按序）

1. **预算问询**（已烧 ~$13；用户已定"外链不本地化，怎么快怎么来"）
2. 可选：用户 Stream 开抓包点一次「首页公告/公众服务」→ 真实 tzgg 数据（如要真实公告；非必需）
3. `wk web/dev/verify.js smoke 12` 基线 → `__probe/list_routes.js` → sweep 核心页查漏
4. 按 P1 逐页铺（新页面 miss 先查共享表；字段映射按 HANDOVER §7 套路）
5. 打磨项按 §3 P2；收尾更新 STATE/HANDOVER

## 7. 环境与工具提醒（新会话必读）

- 工作目录=项目根；容器 `wk <脚本>`（/work=根；探针放 `__probe/`，**勿用 /tmp/kilo**）；脚本用 `.js`（CJS）
- 改 overlays/fixtures → `bash web/build.sh` → `wk web/dev/verify.js <名> 15`
- 8088 挂了 → background_process `bash web/dev/serve.sh 8088`；先 `curl localhost:8088` 确认
- 反混淆：grep sourceMappingURL → `web/deob` 模块树（中文 desc/接口 URL 字面可读）→ 物化；REstringer 对本 bundle 无效
- VM 内存紧张：勿并发 webpack/webcrack；swap>3GB 停手

## 8. 证据/文件索引

- HAR：`packetSniffing/Stream-2026-08-18 22_08_47.har`、`proxypin_export_2026-08-18.har`（只读）
- 本轮探针：`__probe/har123_probe.js`、`__probe/ibab_pass.js`；上一轮：`p2_badge*.js`（徽标）、`p3_*.js`（空白/矛盾）、`p2-badge-evidence-final.json`（消息徽标无路径证据）
- 截图：`web/dev/diffs/`（sweep-*.png ×21、smoke.png、vision-notes.md）
- 计划：`PLANv4.md`、`.kilo/plans/1787002215959-tonight12-core-loop-plan.md`