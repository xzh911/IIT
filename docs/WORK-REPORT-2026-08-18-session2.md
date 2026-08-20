<!-- ⚠️ 已过时（2026-08-20 标注）: 历史报告，勿再作为现行依据。现行入口 = docs/STATE.md（文档地图）→ docs/HANDOVER.md / docs/WORK-REPORT-2026-08-20-r8.md。 -->

# 会话交接报告 — 2026-08-18 16:30（P0 完成 + P1 部分完成，提前收尾新开对话）

> 主入口：`docs/HANDOVER.md`（已在本文件末尾追加 §12 指针）。
> 本次范围：P0（全局共享接口 + 20 入口闭环）✅、P1 两项（申报记录/专项附加）✅、P1 收入明细详情（情报收集完，fixture 未写）→ 下会话、P2 tab 徽标 → 下会话。
> 全程 **未 commit/push**；8088 静态服务仍在跑（background_process）；`web/www` 已含本次全部 fixtures。

---

## 1. 本次已完成（★ WebKit 实证，miss=0 无 toast）

### 1.1 P0 — 全局共享接口 fixture（§11.2 表）
新增 **`web/fixtures/reference/global-shared.json`**（14 条路由，每条先看消费 chunk 确认数组/对象）：

| 接口 | 方法 | 消费证据 → 类型 | 返回 |
|---|---|---|---|
| `/sb/yd/yh/zxfjkc/v2/queryZxfjkcysqlb` | GET | 101/106/15/20 全用 `.length/.filter` → **数组** | 7 条示例（见 §2.2） |
| `/sb/yd/yh/zxfjkc/queryZxfjkcZtzt` | POST | 333 用 `.forEach`/`.length` → **数组** | `[]`（不弹异常提醒） |
| `/sb/yd/grylj/queryTips` | GET | 67 要求 `tipsContent[1].split('<blue>')` → **≥2 元素数组** | 官方 data() 默认同款 3 条文案 |
| `/sb/yd/grylj/tips/replay` | GET | 67 `forEanch` `{key,text}` → **数组** | `[]` |
| `/common/basecode/vn/SB_NEW_SRNSMXSDXM_YDWEB` | GET | 233 `{value,label}` forEach → **数组** | `[]` |
| `/invoice/ttxx/init/brtt` | POST | 58/161 `'Y'===resp` → **字符串** | `"N"`（不弹气泡且进入列表加载） |
| `/invoice/ttxx/ttxxList/query` | POST | 58/161 `{fpTtxxList}` → **对象** | `{fpTtxxList:[]}` |
| `/invoice/fpxq/querytips` | POST | 44 `resp.message` → **对象** | `{}`（不弹红字提示） |
| `/sb/yd/fhbxzctz/queryFhbxzctzBaList` | GET | 427 `recordList=resp` → **数组** | `[]` |
| `/sb/yd/yh/ssjm/sq/list` | GET | 441 `.map/.length` → **数组** | `[]` |
| `/common/basecode/CS_XT_YY_PZ/values/HLW_NSJL_KJFW` | GET | 231 `timeSection=resp\|\|'3'` 数值比较 → **标量** | `"3"` |
| `/zrr/zjxx/list/query` | GET | 231 `(resp\|\|[]).map` → **数组** | `[]` |
| `/zh/afs/config/query` | GET | commons `Object.assign(resp,{requested})` → **对象** | `{}` |
| `/sb/yd/tstz/tzdkba/queryTzdkBaList` | GET | 444/445 list → **数组** | `[]` |

**验收**：16 个菜单入口 + 5 tab 全 sweep，miss=0、无「很抱歉，我们正在努力恢复」toast（唯一残留：`/taxProof/payTaxDetailedQuery` 与 `/tstzyhba_list` 各有 1 个 **非阻塞** `common/captcha/base64Image` miss —— AFS 兜底请求，页面无可见异常，**保持 miss 即可，不要 mock**：mock 反而可能显示假验证码图）。

### 1.2 P0 — 20 菜单入口闭环
16 菜单入口（declaration_record_general / declareRecord / deposit-info-manage / IncomeTaxPayment / invoice×3 / ndhsqj / nonmonetary/record/list / queryInvolveTax / taxdisputeappeal / tax_message / tax/preference/record / taxProof / taxProof/payTaxDetailedQuery / tstzyhba_list）+ 五 tab（zdj-home/service/message/pending-tasks/profile）全部可达、不白屏、无 toast。

### 1.3 P1 — 申报记录 `declaration_record_general`（含三 tab）
新增 **`web/fixtures/reference/record-tabs.json`**（4 条路由，消费链全部核过）：
- `POST /zs/jkjl/query`（getTaxRecord）→ 3 条缴税记录，字段：`ddbh/state/zfje/jkfsMc/payTime/wszmztDm`
- `POST /zs/jkpz/query`（getPzList）→ 2 条缴税凭证，字段：`pzMc/pzztMc/pzje/kjrq/pzDm/pzzlDm`
- `POST /zs/tssq/records/query`（getTaxRefundRecord）→ `{records:[2]}` 退抵税记录，字段：`tdszlDm/tdszlmc/tdsje/djje/tsje/sqrq/tdsjdDm/tdsjdblzt/tdsjdblztmc/processData/yhhbdm/tdssqxh`（含一条 06/04 失败态示范「失败原因+修改银行卡」）
- `POST /sb/yd/grsdsndzxsb/v2/cxsbxx`（getNdhsqjDetails）→ 申报详情对象 `{sblsh,skssnd,nsrxxVO:{jsztDm,ktse,tssq:{tdssqxh}},grsdsndzxsbZb:{sfbhjwsd,sqts}}`
- **注意**：三 tab 属子路由，直接 `#/declaration_record_general/js` 深链也能测；但**必须用 sweep/`$router.push` 流程**（直接 hash 进入部分组件不触发）。上次 sweep 首页入口默认 tab（申报记录）无数据是正常的（该 tab 内容由 store `recordSbxh` 等驱动，需从真实申报流程进入）。

### 1.4 P1 — 专项附加 `declareRecord`（★ 关键坑）
`record` store action = `appList`（queryZxfjkcysqlb）。**必须给 items 加 `tyMap:{sfycfjl:'N'}`**，否则：
- `tyMap` 缺省 → `repeatRecord`/`noRepeatRecord` 都是 `[]` → 页面**既无列表也无空态**（sweep 文本只剩标题，截图全空白）；
- `sfycfjl:'Y'` → 进 8 个类型分组列表（znvList/jxjyList/...），每个带橙色「重复填报」标签；
- `sfycfjl:'N'` → 进 `noRepeatRecord` 平铺列表（**正确形态**）。

已写入 7 条示例（0201 子女教育×2、0202 继续教育、0203 大病医疗、0204 住房贷款利息、0206 赡养老人、0207 婴幼儿照护），item 字段：`zxfjkclxDm/zxfjkcmc/fsdxxm(附随姓名)/cjrlxDm(01本人02扣缴义务人)/kjywrmc/sbkcnd/xgrq/yxbz/zzbjDm/sfyztxs/tyMap/zxfjkcJtcysfxxbhfTxbz/cjlsh/cjxh`。
行内标签逻辑（qjyU render）：`N===yxbz`→已作废、`Y===sfyztxs`→已暂停享受、`Y===zx.fxxbhf`→身份验证不通过；`（fsdxxm）`仅对 0201/0203/0206/0207 显示（0202/0204/0205 不显示）。
**vision_analyze_image 已确认**：截图与官方风格一致、无错乱。

---

## 2. 剩余任务 + 已收集情报（下会话直接开工用）

### 2.1 下一个子任务建议：P1-3 收入明细详情 `IncomeTaxPayment/taxRecordDetail`

**已完成的探路情报（非常值钱，别重探）**：
- 路由：`n1TS` 模块 → `{path:'/IncomeTaxPayment/taxRecordDetail', component: chunk 0xd9 → '8Tdj'}` → **`217.9dcac765f5afe9a20728.js`**
- 详情接口：**`POST /sb/yd/gg/cxNsmxXq`**，方法名 `queryTaxRecordDetailNew`（app bundle API 表）。
- 页面流程（217 chunk `created`/`getDetailInfo`）：
  - 若 `incomeDetailObj && incomeDetailObj.jbqkDetail` 存在（store 预热）→ 直接 `setDetailPage` + `getTransacInfo()`；
  - 否则 `getDetailInfo()` → `queryTaxRecordDetailNew($route.query)` → `setDetailPage({...resp, jbqkDetail:{...resp.jbqkDetail||{}, sdxmDlDm, sdxmDlmc,...}})`。
- `setDetailPage(context)` 读字段：`context.jbqkDetail`（→`taxRecordDetailObj`，经 `setTaxDate` 处理）、`context.bqDetail`（→`currentPeriodObj`/`srkcObj`）、`context.skjsDetail`（→`skjsObj`）。
- **taxRecordDetailObj（jbqkDetail）必用字段**：`ywlxDm/sdxmDm/sdxmDlDm/sdxmDlmc/sfljsd(计税方式 Y=按累计)/zsfsDm(征收方式)/yjfsDm(缴款方式)/jsbs(计税算?)` + 展示字段（`kjywrMc/skssqq/skssqz/sblsh/mxxh` 等，看模板渲染）。
- **字段映射表**（chunk 217 模块内，决定展示哪些金额行）：
  - `SDXM_FLJ_FIELD_MAP`（按所得类型分月应纳）：key 0103/0107/0110/0108/0112/0113（工资薪金各子类）、0111/0114/0115/0109、0401/0404/0489/0499/0500/0600（劳务/稿酬/特许权/经营/利息股息）、0700/0800/0900（财产租赁/财产转让/偶然）/1000(0x3e8)/... 
  - `SDXM_LJ_FIELD_MAP`：只 0101/0109/0402/0403/0404/0489（**按累计**的所得）
  - `FJM_SDXM_FIELD_MAP`：0102/0104/0108/0400-0499/0500/0600/0109/0115
  - **字段 value 名核心**：`ynssde`(应纳税所得额)/`sl1`(税率,isRate)/`sskcs`(速算扣除数)/`ynse`(应纳税额)/`yjse`(已缴税额)/`jmse`(减免税额)/`ykjse`(应扣缴税额)/`ljynssde`/`ljynse`/`hdyynssde`(核定月应纳税所得额)/`sndyjynssde`
- 建议响应骨架（可直接起稿）：
  ```json
  { "jbqkDetail": { "ywlxDm":"A061001019","sdxmDlDm":"01","sdxmDlmc":"综合所得","sdxmDm":"0103","grsdssdxmmc":"工资薪金所得","kjywrMc":"示例科技有限公司","skssqq":"2026-01-01","skssqz":"2026-01-31","sblsh":"MOCK...","mxxh":"1","nsrdah":"...","sfljsd":"N","zsfsDm":"100","yjfsDm":"01","jsbs":"3" },
    "bqDetail":  { "ynssde":15800, "sl1":0.03, "sskcs":0, "ynse":474, "yjse":0, "jmse":0 },
    "skjsDetail":{ "ynssde":15800, "sl1":0.03, "sskcs":0, "ynse":474, "yjse":0, "jmse":0 }
  }
  ```
  （`sfljsd` 决定走 SDXM_LJ_FIELD_MAP 还是 FLJ 系列；`sdxmDm` 必须命中映射 key，否则 `srkcFileds=[]` 只显示基本情况。）
- 验证：写 `data` 到新 fixture（如 `web/fixtures/reference/tax-record-detail.json`，match `/sb/yd/gg/cxNsmxXq`，method post）→ `bash web/build.sh` → `wk web/dev/sweep.js /IncomeTaxPayment/taxRecordList?xx 6` 无法直接带 query → **用探针**：`__probe/` 里导航 `#/IncomeTaxPayment/taxRecordList` 点击第一条进详情，或直接 `$router.push({path:'/IncomeTaxPayment/taxRecordDetail',query:{sblsh:'MOCK202601010000000001',mxxh:'1',nsrdah:'MOCK110101199001011234',skssqq:'2026-01-01',sdxmDlDm:'01',sdxmDlmc:'综合所得'}})` → dump `__API_STUB__` + innerText → vision_analyze_image 确认。
- `getTransacInfo()` 会再调一个接口（查交易信息按钮），等真的点开再补。

### 2.2 下一个子任务建议：P2 tab 徽标（~30 分钟）
- `POST /zrr/task/unRead/query`（待办未读数）
- `GET /zrr/message/v2/wdxxsl/query`（消息未读数 v2）
- 先 `grep -rl 'task/unRead/query' app bundle` 拿方法名与消费 chunk，确认响应字段（大概率 `{count}`/`{wdCount}` 之类）再写 fixture；注意别覆盖 `message-unread.json` 已 mock 的 `/zrr/message/type/wdxxsl/query`（旧接口）。首页/待办 tab 的徽标目前 miss=2（§10 遗留）。

---

## 3. 环境/文件状态（下会话直接沿用）

- **8088**：`curl localhost:8088` 返回 200（本会话用 background_process 起的 `bash web/dev/serve.sh 8088`；若新会话发现挂了，先重启再动）。
- **构建**：`bash web/build.sh` 已含两个新 fixture；`web/www` 是 build 产物（gitignore）。
- **本次新增/改动文件**：
  - 新增 `web/fixtures/reference/global-shared.json`、`web/fixtures/reference/record-tabs.json`
  - 新增 `__probe/record_tabs.js`、`__probe/record_tabs2.js`、`__probe/declare_check.js`、`__probe/declare_state.js`（均 CommonJS `.js`，容器可用；record_tabs2/declare_state 读 `window.__API_STUB__`）
  - `web/dev/diffs/sweep-report.json` 已更新（latest：declareRecord 含数据）
  - 截图：`web/dev/diffs/sweep-declareRecord.png`（vision 已确认）、`sweep-declaration_record_general.png` 等
- **sweep/verify 用法**：`wk web/dev/sweep.js /路由A,/路由B 6`；直接 `verify <名字>` 会默认进 `/zdj-home`（名字≠路由，别用 verify 测具体路由，用 sweep 或自写探针）。

## 4. 提醒（新会话必读）
- 主文档 `docs/HANDOVER.md` §5 踩坑、§11 背景；本文件是推进会话的增量说明。
- 全部保持未 commit；参考 `reference/` 只读。
- 访问深层路由一律过 `$router.push`（sweep 已封好）；探针脚本放 `__probe/`（`/tmp/kilo` 不挂容器）。

---

## 5. 增补：P1-3 收入明细详情 taxRecordDetail（同会话后半，已完成通过探针验证）

### 5.1 完成情况
- 新增 **`web/fixtures/reference/tax-record-detail.json`**：match `POST /sb/yd/gg/cxNsmxXq`（queryTaxRecordDetailNew）。
- **`web/fixtures/reference/income-config.json` 增补** `SB_LWZB_QUERT_SDXMLB:"[]" / SB_LWZB_SF_ZDTS:"N" / SB_LWZB_YYSS_KG:"N" / SB_LWZB_QUERY_KG:"N"` —— 使 `getTransacInfo`（AffH mixin，commons chunk）确定性提前 return，不触发 `queryLwzbMx`（`/sb/yd/lwzb/query/lwzbMx`），避免新增 miss。
- 新探针：`__probe/tax_detail.js`（列表点第一条进详情 + 截图）、`__probe/tax_detail_vm.js`（vm 调试，现仅作存档）。
- 截图：`web/dev/diffs/sweep-taxRecordDetail.png`。

### 5.2 链路（WebKit 实证，miss=0 无 toast）
`#/IncomeTaxPayment/taxRecordList`（cxNsmxList HIT）→ 点击第一条（正常工资薪金）→ `taxRecordDetail`：`cxNsmxXq` HIT、`cxCsnrList` HIT → 页面完整渲染。

### 5.3 关键结论（下次别再重探）
- **组件 chunky 0xd9 = `217.9dcac765f5afe9a20728.js`**，name=`TaxPreferenceDetail`；渲染模板在模块 `+hXZ`（本 chunk 内），元素类 `c-item-box / c-item-box-title / c-item-box-info` 系。
- **i18n 文案在 `web/www/i18n.js`**（不是 bundle chunk！chunk 只引用 key）：`incomeTaxPayment.detail.*` 见 `i18n.js` 97273 附近（appbar.title=收入纳税明细详情、jnxx=纳税明细信息、基础情况组=纳税明细-基础情况、itembox 全字段 label 等）。
- **setDetailPage 字段归属**：`taxRecordDetailObj`←`jbqkDetail`（经 setTaxDate：skssqq/skssqz 取 `+值` 即**必须传时间戳 ms**，拼成 skssq='2026-01至2026-01'；sfhm→是/否）、`currentPeriodObj`=`srkcObj`←`bqDetail`、`skjsObj`←`skjsDetail`。
- **0101 正常工资薪金 + sfljsd='Y'（按累计）**：`currentPeriodFileds=SDXM_LJ_FIELD_MAP['0101']` = **本期字段集**（本期收入 sre / 本期免税收入 mssr / 本期减除费用 jbjcfy / 本期专项扣除 zxkchj{children: jbylbxf/jbyilbx/sybxf/gjj} / 本期其他扣除 qtkchj{children: nj/syylbx/qtkcqt/xdsl...} / 本期准予扣除的捐赠项目 zykcdjze）——**用本期字段名，不是 ljsre 等累计名**（累计名属于 LJ_SDXM_SKJS_MAP，另用）。
- 该形态无「收入与扣除详情」「税款计算」组（N 分支才有），只显示：纳税明细信息（sbjlSre/sbjlYbtse+查看税款计算链接）、基础情况、是否免申报、温馨提示（`isShowZxfjkcTip`=sfljsd='Y' && sdxmDm='0101'，即 `DECLARE_SDXMDM_ZCGZXJ='0101'`）、本期收入与扣除详情。
- 条件显示 flag：`isHideNsmxxx`(A061001019→false)、`isHideKjywr`、`isShowJcxxBtzdw/Hhrfpbl/Dzzd`；appbar 右侧「申诉」(`complaintBtnAvailable`)，**点击走 checkTransacInfo→nextAppeal→complaint→checkDisputeAppeal（未 mock，点开可能 miss，届时再补）**。
- 待办：sfljsd='N' 记录（如 0103 全年一次性奖金 / 劳务）单独渲染 `srkcFileds=SDXM_FLJ_FIELD_MAP[chooseKey]` + `skjsFields=FLJ_SKJS_FIELD`（非累计形态）——下会话如需覆盖其他所得类型再补 fixture（或改 DYNAMIC 动态路由按请求体分支）。
- 已知注意：fixture 单路由无法区分 query（所有列表记录的详情都返回同一份 0101 数据），mock 数据带 `source:mock` 合规。
- vision_analyze_image 本次临时 fetch failed；验证已用探针 innerText 证据。8088 仍存活；全程未 commit。
