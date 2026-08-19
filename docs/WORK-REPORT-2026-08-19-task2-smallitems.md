# WORK-REPORT — 任务2 遗留三小项收尾：免征额 toast / 申报详情字段 / Promise Rejection（2026-08-19 下午）

> 目标（HANDOVER §23 遗留优先级）：① 全页 toast「查询免征额出错！」；② 申报详情「税款所属年度/所属期/汇算地」等字段空；③ record-hub Unhandled Promise Rejection。
> 结果：**三小项全部达成，且启动期 2 个连带 rejection 一并清零（REJS: []）**。未 commit/push（按惯例由用户推进）。
> 验证管线：`bash web/build.sh` → `wk __probe/task2_probe.js` / `wk __probe/task17_rejstack.js`（WebKit 容器，UA=ETaxClient/2.3.3，390×844@3x）。

---

## 1. 改动清单（本轮 5 文件：2 改 + 1 改修 + 1 新 fixture + 1 overlay）

| 文件 | 改动 | 对应小项 |
|---|---|---|
| `web/fixtures/reference/income-config.json` | cxCsnrList map 增加 `"ZS_JKJECSPZ": 60000`（标量） | ① 免征额 toast |
| `web/overlays/api-stub.js` | 动态路由 `common/system/globalsystemtime` 与 `zrr/jbxx/query` 的 data 改为 `{code:'SUCCESS', data:...}` 包装 | ②③ 根因 |
| `web/fixtures/reference/record-tabs.json` | `grsdsndzxsbZb.skssqq=1767196800000`、`skssqz=1798732799000`（**ms 时间戳**，原为 "2026-01" 字符串） | ② 日期字段 |
| `web/overlays/cordova.js` | `LaunchHotCode.hotCodeAnalytics` 成功回调改传 **JSON 字符串 `'{}'`**（原传对象 `{}` → 被 String() 成 "[object Object]" → JSON.parse 崩） | ③ 连带 rejection |
| `web/fixtures/reference/query-task-v2.json`（新建） | `POST zrr/task/queryTodoTask`（首页待办事项卡，queryTaskListV2 实际 URL）2 条 | ③ 连带 rejection |

> 注：`startEnvDetection/appOnCreate/NativeAnalytics` 插件 stub 为 task2 阶段已有改动（boot 噪声消除的一部分），本轮未动。

---

## 2. 各小项根因与修复

### 2.1 ① 免征额 toast「查询免征额出错！」（0.5-1h 档，实测 ~1h）

- **调用链（确定性定位，deob 树）**：`V2jO.js`（组件名 ProductionDetailFooter，web/deob/commons/）≈L615-640 `checkPayTaxBtnAvailable(this.ybtse)` → `z0WU.js:474 getExemptionFromQuota()` dispatch `GET_CSNR_BY_DM({csdm:'ZS_JKJECSPZ'})` → 从 csnr 缓存 map 按 csdm 取豁免额 → 该 key 不存在 → resolve 空 → reject → toast。
- **根因**：`cxCsnrList` fixture 的 map 里没有 `ZS_JKJECSPZ`（个人所得税减免税代码，60000 元/年）条目。消费端把该 key 的 value 当**标量数值**与 `ybtse` 比较，不是对象。
- **修复**：income-config.json 加 `"ZS_JKJECSPZ": 60000`。
- **验证**：task2_probe record-hub 段无 toast；task3 探针截图（task3-after-click.png）确认 toast 不再出现。
- **坑**：`GET_CSNR_BY_DM` 的值类型按 key 不同而不同（有的对象有的标量），补 fixture 前须确认消费端取值方式（此处为标量比较）。

### 2.2 ② 申报详情「税款所属年度/所属期/汇算地」等字段空（1-2h 档，实测 ~2h）

- **此前证伪（WORK-REPORT task2 §5）**：探针显示详情页发出 `cxCsnrList`×2 + `zrr/jbxx/query`×2 而 `cxYsbxx` 未发 → 曾推断"详情页不走 cxYsbxx"。**本轮证伪此结论**。
- **真根因（本轮定论）**：`RecordDetailNdhsqj`（chunk 73：q0zm.js 路由 / jIjH.js 逻辑 / irQK.js 模板）`created → init → getJbxx().then(getDeclareDetailData)` 链中，`getJbxx()` 依赖 `zrr/jbxx/query` 与 `common/system/globalsystemtime` 两个**动态路由**；api-stub 对其返回裸 data（`Date.now()`、裸用户对象）→ 响应拦截器按 `code!=='SUCCESS'` 判失败 → `getJbxx()` reject → `.then(getDeclareDetailData)` 永不执行 → `cxYsbxx`（POST `/sb/yd/grsdsndzxsb/cxYsbxx`，cfc5.js:161）**从未发出** → 详情字段全部回退「—」。
- **修复**：
  1. api-stub.js 将两个动态路由包装为 `{code:'SUCCESS', data:...}`（与静态 fixture 形状一致）；
  2. record-tabs.json 的 `cxYsbxx` fixture 中 `skssqq/skssqz` 改为 **ms 时间戳** —— `jIjH.js:376-394 setFormatSkssq` 对它们执行 `Number()+moment()`，传 "2026-01" 字符串会得到 "Invalid date"。
- **验证**：task2_probe / task17 TEXT 均显示：`税款所属年度：2026 / 税款所属期起：2026-01 / 税款所属期止：2026-12 / 汇算地主管税务机关：国家税务总局北京市朝阳区税务局 / 任职受雇单位：北京示例科技有限公司`，并继续渲染收入/扣除/应纳税所得额等全部明细行。stub 日志确认 `cxYsbxx` 已 hit。
- **坑**：**动态路由（globalsystemtime/jbxx 等）的 data 返回必须与静态 fixture 同形状（带 code 包装）**，否则页面级联静默断链，且探针只见"接口未发"表象，必须沿 Promise 链查门控。

### 2.3 ③ record-hub Unhandled Promise Rejection（0.5-1h 档，实测 ~1.5h 含连带）

- **主 rejection**：与 ②同根因 —— `globalsystemtime`/`jbxx` 裸 data → 拦截器 reject → 多个「很抱歉，系统正在努力恢复」unhandled rejection（task2 基线实证）。api-stub 包装修复后**全部消失**。
- **连带 rejection A（我引入的回归）**：`app.js:26` `$native.LaunchHotCode.hotCodeAnalytics().then(l => JSON.parse(l))` —— 消费端是 Promise 包装且对结果 `JSON.parse`；我的 stub 曾传对象 `{}` → `String({})` = "[object Object]" → `JSON Parse error: Unexpected identifier "object"`。改传 JSON 字符串 `'{}'` 后消除。
- **连带 rejection B（boot 期噪声）**：chunk 40 首页 `matterList = _$nD['content']` 无 null 守卫，`queryTaskListV2`（实际 URL `POST /zrr/task/queryTodoTask`）miss → api-stub 兜底 `data:null` → `null is not an object (evaluating '_$nD['content']')`。新建 query-task-v2.json（2 条待办卡，字段 `taskTitle/taskLxDm`）后消除。
- **最终验证**：`wk __probe/task17_rejstack.js` → **`REJS: []`**（零 unhandled rejection，含 JSON/content/null 过滤），TEXT 正常渲染。

---

## 3. 验证证据汇总（终验，build # 本轮重建 2 次）

| 探针 | 结果 |
|---|---|
| `task2_probe.js`（5 路由验收） | record-hub/ndhsqj 详情全字段渲染（2026 / 2026-01 / 2026-12 / 朝阳区税务局 / 北京示例科技）；msg-list、msg-detail、invoice-title、scan-code 均渲染 ✅；唯一 miss `swws/updateswwsydzt`（无害兜底） |
| `task17_rejstack.js`（rejection 专项） | **REJS: []** ✅；TEXT 含完整明细行（应退税额/已缴税额/境内收入/减除费用/专项附加扣除/应纳税所得额/税率…） |
| `bash web/build.sh` | 两次均构建成功（fixtures 目录 glob 自动纳入新 json，无需改 build.sh） |

截图：`web/dev/diffs/task2-*.png`、`task3-hub-open.png`、`task3-after-click.png`（toast 消失）。

---

## 4. 踩坑记录（新增，给后续会话）

1. **mock 回调传值类型必须匹配消费端**：插件 stub 若被消费端 `JSON.parse`，必须传 JSON 字符串而非对象（`String({})` → "[object Object]" 直接崩）。排查 rejection 时先看消费端对结果做了什么。
2. **「接口未发」≠「接口不被消费」**：cxYsbxx 未发是因为上游 `getJbxx().then()` 门控被拦截器失败打断；沿 Promise 链找门控，比猜页面换了数据源可靠。
3. **时间字段一律 ms**：任何被 `Number()+moment()` 消费的时间值必须是毫秒时间戳；字符串 "2026-01" 渲染成 "Invalid date" 且**不报错**（静默错）。
4. **api-stub 零 miss 兜底 `data:null` 的双面性**（task2 坑 1 延伸）：有的消费端 `.forEach` 崩（PAGEERROR），有的 `_$nD['content']` 崩（unhandledrejection）——兜底只对"判空后跳过"的页面安全；新页面先看 miss 日志。
5. **rejection 排查用 stack + logTail 组合**（task17 模式）：`unhandledrejection` 事件里同时抓 `reason.stack` 与 `__API_STUB__.getLog().slice(-12)`，一次定位到"哪个接口之后、哪个 chunk 崩"。

## 5. 工作量评估（实际 vs 预估）

| 项 | 预估 | 实际 | 说明 |
|---|---|---|---|
| ① 免征额 toast | 0.5-1h | ~1h | 主要耗时在确认消费端取值类型（标量） |
| ② 申报详情字段 | 1-2h | ~2h | 含一次假设证伪（cxYsbxx 未发链）+ 时间戳静默坑 |
| ③ Promise Rejection | 0.5-1h | ~1.5h | 主因同②；另修 2 个连带 rejection（含自查回归） |
| **合计** | **2-4h** | **~4.5h** | 与预估上界基本一致 |

**三小项验收标准全部达成**：无 toast、详情字段非空、REJS 清零。下一步轮次（PHASE1 §5）：③ dev 面板 V2 表单编辑器（~6h）或按预算决策。

## 6. 遗留/未做

- `swws/updateswwsydzt`（已读标记上报）miss 无害兜底，未补。
- `queryTodoTask` 点击跳转（gotoBusiness）未做交互验证（仅渲染态）。
- 真机验证任务1 IPA（用户动作）仍未进行。
- 未 commit/push；reference/ 未触碰。
