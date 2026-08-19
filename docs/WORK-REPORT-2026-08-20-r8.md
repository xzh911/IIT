# WORK-REPORT — r8 批次：/dev 入口 + 角标清零 + 纳税记录开具页滑块链路（2026-08-20）

> 来源授权：`docs/HANDOVER.md` §30（用户 r7 真机确认后 7 项反馈）。本报告 = r8 交接 + 工作报告。
> 验证管线：`bash web/build.sh` → `wk web/dev/verify.js <名>`（容器 WebKit，targeted 验证）。
> 进度：batch1 已 push（2ebe452）；batch2（纳税记录开具页）**已完成验证全绿，本轮 commit+push**；batch3（个人信息页+眼睛 toggle）待开工。

---

## 1. 已完成 — batch1（commit 2ebe452，已 push）✅

对应 HANDOVER §30 问题 3 + 问题 5（部分）。

| 文件 | 改动 | 效果 |
|---|---|---|
| `web/overlays/dev-entry.js` | /dev 触发从「document capture 阶段全局 click + 文案祖先链匹配」改为「仅首页底部 tabbar（`.zdj-home-tabbar`）内 text=我的 的 `.tabbar-item` 连点 5 下」 | 其它位置点 5 下不再误触（用户反馈复现点消除） |
| `web/fixtures/reference/task-unread-num.json` | `/zrr/task/unRead/query` counts 1+0+1 → 0+0+0 | 待办角标数字消失（taskUnReadNum 求和=0） |
| `web/fixtures/reference/message-unread-v2.json` | `/zrr/message/v2/wdxxsl/query` normalWdsl 2 → 0 | 消息角标数字消失 |

**验证（容器实证）**：`r8_dev_probe` — 首页 tab×5 不开面板 / 我的 tab×5 开面板 / 无数字角标；smoke hit=19 miss=1 blocked=0 无回归。已 commit + push（CI 出包待）。

**遗留确认**：用户「2 个待办 + 2 个消息」指的就是首页 tab 数字角标（非待办页列表），本轮已清零。若真机仍见角标需再截图确认列表页数据。

## 2. 已完成 — batch2：纳税记录开具页滑块验证 + 证件号只读 + 生成链路（commit 待 push）✅

对应 HANDOVER §30 问题 4（滑块验证码）+ corrections「纳税人识别号脱敏」。

### 2.1 根因（已实锤，勿重探）
- 页面 = `web/deob/chunks/231.34d40394f7f21aa7ad56/z7VU.js`（PayTaxDetailedListView）。
- `/zrr/nsqd/kj`（生成接口）本无 fixture → api-stub 兜底 520 误伤；`/zrr/zjxx/list/query` fixture 返回 `[]` → 证件号显示「请输入」。
- `switch.json` 的 `app.afs.switch` 原为 "N"；`/zh/afs/config/query` 返回空 → 老版滑块渲染链断。
- **AFS 决策链定论**（KOtm.js map 实锤）：`EMBOo=(K,q)=>K!==q`、`DEVzJ=(K,q)=>K===q`、`jLESI=(K,q)=>K!==q`、`UoeFZ="afsSig"`、`GQOBK="#nc"` →
  老版 `window.noCaptcha` 滑块分支要求 `/zh/afs/config/query` 的 **`newAfsSwitch!=="Y"`（fixture 定 "N"）**；`renderScrollBlock` 注入 `#nc`；
  `afsIncomplete` 老版分支（`jLESI("Y",newAfsSwitch)` 且无 `localStorage.afsSig`）→ 弹「请先拖动滑块验证」；提交 body 含 `afsYzm:{afsScene,afsSessionId,afsSig,afsToken}`。
  `newAfsSwitch="N"` 为确定方案；`"Y"` 的 initAliyunCaptcha 分支未走（`afs-slider.js` 保留 aliyunStub 兜底）。
- 生成按钮禁用仅看年份区间（`isNextBtnDisabled`）；提交即 `POST /zrr/nsqd/kj`；成功 `$router.push('/taxProof/applyList')`；按钮文案 i18n=`payTaxDetailed.set.query.confirm`=「生成纳税记录」。
- 完整 API 清单（wJJF.js）：生成 `POST /zrr/nsqd/kj`；证件 `GET /zrr/zjxx/list/query`；配置 `GET /zrr/nsqdxx/config`（`nssqMaxNum:"30"`，applyList body 必需）；申请列表 `POST /zrr/nsqd/kjsq/list`；并库检查 `GET /zrr/zrrIsInBkSf/check`（页面 onLoad 必发，缺失 404 也会挡）。
- `reference/cdn-www/nc.js` 是真实阿里 JSONP 客户端但 index.html 未引用（build.sh 移除正则为 no-op，无害）。

### 2.2 改动清单
| 文件 | 改动 |
|---|---|
| `web/overlays/afs-slider.js`（新） | 自供 `window.noCaptcha(opts)` + `initAliyunCaptcha` 桩；官方老版样式滑块注入 `#nc`：grab 42px 拖到最右→轨道变绿→绿勾「验证通过」→`callback({value:'pass',csessionid,sig})`；`.render/.reset/.upLang`；drag 收 document 级事件（修 grab 上 mouseleave 提前复位 bug） |
| `web/fixtures/reference/global-shared.json` | `GET /zrr/zjxx/list/query` → `[{zjxh:"Z-CERT-001",sfzjlxMc:"居民身份证",sfzjhm:"3****************6",zzjbz:"Y",source:"mock"}]`；`GET /zh/afs/config/query` → `{newAfsSwitch:"N",appKey:"nc_mocka_key",scene:"nc_login",sessionId:"MOCK-AFS-SESSION",source:"mock"}` |
| `web/fixtures/reference/switch.json` | `app.afs.switch` "N"→"Y" |
| `web/fixtures/reference/taxproof-nsqd-kj.json`（新） | `POST /zrr/nsqd/kj` → `{code:"SUCCESS",data:{kjsqxh:"MOCK-NSQD-KJSQXH-2026-001"}}` |
| `web/fixtures/reference/taxproof-bk-check.json`（新） | `GET /zrr/zrrIsInBkSf/check` → `{code:"SUCCESS",data:[]}` |
| `web/fixtures/reference/taxproof-nsqdxx-config.json`（新） | `GET /zrr/nsqdxx/config` → `{code:"SUCCESS",data:{nssqMaxNum:"30"}}` |
| `web/fixtures/reference/taxproof-nsqd-kjsq-list.json`（新） | `POST /zrr/nsqd/kjsq/list` → `{code:"SUCCESS",data:{total:0,list:[]}}` |
| `web/build.sh` | 注入列表加 `./afs-slider.js` + `cp` overlay 到 www；nc.js 标签移除正则（现行 index.html 无此标签，no-op） |
| `__probe/afs_slider_probe.js`（新） | 端到端验收：直达路由→查证书号/按钮态→鼠标拖滑块→查 `localStorage.afsSig`→点生成→查跳转+stub 命中+截图 |

### 2.3 验证（容器 WebKit 全绿）
- 证件号 `3****************6` 且 disabled=true（非「请输入」）；生成按钮 enabled（仅年份区间）。
- 鼠标拖到底 → `localStorage.afsSig="Y"`、滑块 ok 绿勾 display=flex；点「生成纳税记录」不再弹「请先拖动」→ `POST /zrr/nsqd/kj` 命中 → 跳 `#/taxProof/applyList` 且无 nssqMaxNum 相关报错。
- stub 命中：afsConfig=1 zjxx=1 bkCheck=1 nsqdKj=2；截图 `web/dev/diffs/afs-pre.png.png` / `afs-after-slide.png.png` / `afs-after-generate.png.png`。
- 探针坑记录：拖不到底 = 终点 `tr.right-gw/2` 得 p=0.997<1 未达标，改过冲 `tr.right-5`；官方「发现新版本」弹窗 DOM 整链 `display:none` 不挡交互；探针截图名会因 shot() 追加 `.png` 出现双后缀。

## 3. 后续批次排期（承接 HANDOVER §30）

| 优先 | 问题 | 状态 | 方案 |
|---|---|---|---|
| 1 | 个人信息编辑页项不可编辑（HANDOVER §30 问题 2） | **batch3 进行中** | bundle-investigator：定位编辑页 chunk + 接口清单（区域树/学历/民族/保存 update）→ 补 fixture |
| 2 | 纳税人识别号显示/隐藏无效（问题 1） | **batch3 进行中** | 与问题 2 同域一次 investigation：眼睛按钮 handler + mask 函数 |
| 3 | /dev 面板宫格化（问题 7） | 未动工（batch4） | 仿 `reference/alternate-web/site-8082/` 宫格首页；契约 `{match,method,data}` 不变；可与 batch3 同批复核 |
| 4 | 手势密码（问题 6） | **建议暂缓** | 定论：官方原版无手势功能，做=纯自定义层新功能且偏离保真；用户已给台阶 |

## 4. 决策变更记录（本次生效）

- `constraint.captcha_miss_not_mock` **已反转**：用户明确要「按住滑块拖到最右侧→滑动左绿→完成绿勾验证通过」真实可交互滑块。旧约束作废；**勿直接 mock 静态验证码图骗过页面**。滑块 mock 策略待 2.3 组件定位后定案。
- batch1 入口已按用户变更后的需求：仅「首页 tabbar 我的」5 连击触发（非初始协议页 5 连击方案）。

## 5. 提交状态

- 已 push：`2ebe452 fix: r8 batch1 — /dev 入口限定「我的」tab 连点5下触发 + 待办/消息角标清零`
- 本轮将 push：batch2（纳税记录开具页滑块+证件号只读+生成链 fixture + afs-slider overlay + build.sh）+ 本报告 + STATE.md。
- 全程未 commit 后续改动（batch3/4 待用户推进 → CI 出 r8 → 用户真机）。

## 6. 给下会话的开场摘要

1. 读 `docs/STATE.md`（顶部状态）+ 本报告 §2（batch2 已完成全绿，勿重探）。
2. **滑块方案已定案（勿再探 KOtm.js 决策链）**：`/zh/afs/config/query` 返回 `newAfsSwitch:"N"` + overlay 自供 `window.noCaptcha`（`web/overlays/afs-slider.js`）；`localStorage.afsSig="Y"` 由页面代码写入。AFS 语义映射：EMBOo=`!==`、DEVzJ=`===`、jLESI=`!==`、GQOBK=`#nc`、UoeFZ=`afsSig`。
3. batch3（个人信息页，问题 1+2 同域）：派 bundle-investigator 定位编辑页 chunk + 接口清单（区域树/学历/民族/保存 update）+ 眼睛按钮 handler/mask 函数，一次调查后补 fixture。
4. batch4（/dev 宫格化）契约 `{match,method,data}` 不变，仿 site-8082 宫格首页。
