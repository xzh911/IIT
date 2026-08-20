<!-- ⚠️ 已过时（2026-08-20 标注）: 历史报告，勿再作为现行依据。现行入口 = docs/STATE.md（文档地图）→ docs/HANDOVER.md / docs/WORK-REPORT-2026-08-20-r8.md。 -->

# WORK-REPORT — 任务2：申报记录 / 发票抬头 / 消息详情 三页不空态（2026-08-19）

> 目标（PHASE1-REPORT §5 第 2 轮）：修复 3 处核心缺口，验收 = 三页不空态。
> 结果：**目标达成**（探针 5 路由全验证通过），遗留 3 小项（§5），未 commit/push（按惯例由用户推进）。
> 验证管线：`bash web/build.sh` → `wk __probe/task2_probe.js`（WebKit 容器）。

---

## 1. 改动清单（4 文件，未 commit）

| 文件 | 改动 | 作用页 |
|---|---|---|
| `web/fixtures/reference/swws-message.json`（新建） | 4 条路由：`GET commonbusiness/swws/list/query`（2 条，cllx=2 待办/1 已处理）、`GET commonbusiness/swws/sign/status/query`（qdzt=1 已签）、`GET commonbusiness/swws/content/query`、`POST commonbusiness/swws/sign` | 消息列表/签收 |
| `web/fixtures/reference/global-shared.json` | `fpTtxxList` +2 条抬头；`commonbusiness/swws/mx/find` 从 `{}` 补全详情数据 | 发票抬头/扫码开票、消息详情 |
| `web/fixtures/reference/record-tabs.json` | +`POST sb/yd/grsdsndzxsb/cxYsbxx` fixture（申报详情，按 v2/cxsbxx 形状扩展） | 申报详情 |
| `web/overlays/mock-login.js` | boot 时预置 recordStore：`recordSblsh/Sbxh`（MOCK 单号）、`recordYwlxdm=A061009014`、`tabIndex=0` | 申报记录直开不空态 |

新增探针 `__probe/task2_probe.js`（5 路由：record-hub `/declaration_record_general`、msg-list `/tax_message/list`、msg-detail `/tax_message/details`、invoice-title `/invoice/invoiceTitle`、scan-code `/invoice/scanCodeInvoicing`；输出 DOM 文本摘要 + stub hit/miss 日志 + 截图到 `web/dev/diffs/task2-*.png`）。

## 2. 各页根因与修复

### 2.1 消息列表 `/tax_message/list`（chunk 174，API 模块 6GYo）
- **根因**：`GET commonbusiness/swws/list/query`、`GET commonbusiness/swws/sign/status/query` 均 miss → api-stub 零 miss 兜底返回 `data:null` → 列表代码 `_$Y.forEach` 对 null 执行 → **PAGEERROR `TypeError: null is not an object`**（探针基线实证）。
- **修复**：新建 swws-message.json 提供 list 2 条 + sign 状态。
- **关键字段**：列表项 `cllx`（"1"=已处理/"2"=待办，tab 分组用）；签收状态 `qdzt==="1"` → 列表头部显示「您已于…签订《税务文书电子送达确认书》」+「查看确认书」链接。

### 2.2 消息详情 `/tax_message/details`（chunk 627）
- **根因**：`GET commonbusiness/swws/mx/find` 已命中但 global-shared 里 data 为 `{}` → 页面空白。
- **修复**：补全详情：`wsxh/wslx/wsbt/sdsj/sdfs/bjzt/cyzt/content/tips/button.buttonText/images[].wswjid`。
- 注：`swws/updateswwsydzt`（已读标记上报）仍 miss，api-stub 兜底 SUCCESS 无害，未补。

### 2.3 发票抬头 `/invoice/invoiceTitle` + 扫码开票 `/invoice/scanCodeInvoicing`（chunk 161）
- **根因**：`POST invoice/ttxx/ttxxList/query` 命中但 `fpTtxxList:[]` → 页面进入 refresh-page 空态「很抱歉」。
- **修复**：`fpTtxxList` 落 2 条：本人（`brtt=Y/mrtt=Y` 默认）、单位（`nsrsbh=91110108MOCK00000X`）。
- **字段**：`ttxh/ttxhType/nsrmc/ttlx/brtt/mrtt/nsrsbh`。
- **踩坑**：`invoice/ttxx/init/brtt` 返回字符串 `"N"`（truthy，非空字符串），此前误判为「返回 falsy 阻塞列表加载」——实证列表照样被调用，阻塞点是空数组本身。

### 2.4 申报记录 `/declaration_record_general`（hub chunk 342，store 模块 BxUD.js）
- **根因**：hub 只从 store 读预置，直开路由时 `recordStore` 全空 → created 分支跳过拉数 → 只渲壳。
- **真实入口链路**：申报入口 commit `recordSbxh/recordSblsh/recordYwlxdm="A061009014"/tabIndex=2` 后 push hub；hub created 按 `recordYwlxdm` 路由映射 replace 到子路由：A061009014→`/ndhsqj`（年度汇算申报）、其他→`/js`（缴税）/`/tds`（退抵税）。
- **修复**：mock-login.js boot 时若 `recordStore.recordYwlxdm` 为空则 commit 预置（tabIndex=0）。tabIndex=0 恰好 falsy → 走 case 47 → replace 到 ndhsqj → 详情页渲染缴款汇总（应退/滞纳金/已缴/申报明细表头）。
- **踩坑**：`store.commit('recordSblsh', …)` 是**无 namespace 前缀**的 mutations 名；boot 只执行一次（`window.__MOCK_LOGIN_DONE__` 守卫），必须在应用初始化后注入。

## 3. 验证结果（修复后探针）

- **msg-list**：待办列表渲染「税务事项通知书/2026-08-01/电子送达」，已签收提示 + 查看确认书链接 ✅；无 miss 无 PAGEERROR。
- **msg-detail**：标题/时间/正文/tips 全渲染 ✅；miss 仅 `updateswwsydzt`（无害）。
- **invoice-title**：本人+单位 2 条抬头、默认标、税号、设置默认/编辑/删除按钮 ✅。
- **scan-code**：抬头选择列表渲染 ✅。
- **record-hub**：直开 → 自动 replace `/ndhsqj` → 缴款详情渲染（本次申报已缴税额等）✅。

## 4. 踩坑记录（给后续会话）

1. **api-stub 零 miss 兜底会让「缺 fixture」从空态变成 PAGEERROR**：`data:null` 传进 `.forEach` 即崩。凡新页面先跑探针看 miss 日志，再判断兜底是否安全。
2. **「hit 但形状错」比 miss 更隐蔽**：mx/find、ttxxList 都是 hit 但数据空/形状错 → 空态；跑探针时 stub 日志显示 hit 不代表渲染成功，必须看 DOM 摘要。
3. **fixture method 必须与实际请求一致**（POST/GET 混写即 miss，STATE 已知坑再验证）。
4. **store 预置类页面（recordStore）**：直开路由不拉数是设计行为，需在 mock-login 注入；注入点必须在 app 初始化后（boot 单次执行）。
5. **子路由 replace 型 hub**：验证时直接 probe 子路由（`/declaration_record_general/ndhsqj`）会绕过 hub 逻辑，须 probe 父路由 `/declaration_record_general` 看 replace 是否发生。
6. **chunk 73 假设被证伪**：此前推断申报详情页消费 `cxYsbxx`，探针显示实际请求是 `cxCsnrList`×2 + `zrr/jbxx/query`×2，`cxYsbxx` 未发出 → 遗留 ② 的根因方向要按实际请求链查（见 §5）。

## 5. 遗留 3 小项（下会话优先级）

1. **全页 toast「查询免征额出错！」**：`checkPayTaxBtnAvailable(ybtse)`（V2jO.js:620，chunk 283 内另有 2 处）Promise reject 触发；调用的免征额接口未确认（需查 `$R.default.checkPayTaxBtnAvailable` 绑定路由）。
2. **申报详情「税款所属年度/所属期/汇算地」等字段空**：详情页实际走 `cxCsnrList`+`jbxx` 而非 `cxYsbxx`；`cxCsnrList` hit 2 次但返回形状未对齐消费字段（`skssnd/skssqq/skssqz/hjdMc` 等显示「—」）。
3. **record-hub Unhandled Promise Rejection [object Object]**：未定位具体 promise（候选：jbxx 竞态、cxCsnrList 形状、flow/bypass）。

## 6. 工作量评估

见 §7（HANDOVER §23 同步此评估）。

## 7. 其他轮次/任务工作量（2026-08-19 更新版）

| 任务 | 预估 | 依据 |
|---|---|---|
| 遗留 ① 免征额 toast | 0.5-1h | 定位接口→补 fixture→探针确认；全局一条 fixture 即消 |
| 遗留 ② 申报详情字段空 | 1-2h | 按实际请求链（cxCsnrList/jbxx）对齐消费字段，涉及 1-2 处 fixture 形状调整 |
| 遗留 ③ Promise Rejection | 0.5-1h | 抓页面 console 定位 promise，多数是形状问题顺带修 |
| **三小项合计** | **2-4h** | |
| 真机验证任务1 IPA（用户动作） | 0h（agent）/ 用户 10-20min | SideStore 导入按 §22 清单验证，反馈后收尾 |
| 轮次② 验证码+图标 | 0.5-1h | 图标 CI 转换已在任务1 实现并验证（build-ipa.sh [1/6]）；剩验证码样式确认 |
| 轮次③ dev 面板 V2 表单编辑器 | ~6h | 设计已定（PHASE1 §4）；schema 推导 + 表单渲染 + 联动覆盖层 |
| 轮次④ 20 核心页铺开 | 10-20h | 空态/列表页 0.5h、表单页 1h；可砍到核心 8-10 页 ≈ 6-10h |
| REVIEW 🟡3 页像素打磨 | 1.5-3h | 0.5-1h/页（若预算允许） |

**优先级建议**：三小项（2-4h）→ 轮次③ dev 面板 V2（6h）→ 视预算轮次④。真机验证穿插在任一轮之后即可。

## 8. 下会话开场白（可直接复制）

见 HANDOVER §23 尾部「下会话开场白」。
