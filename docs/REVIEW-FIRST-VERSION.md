<!-- ⚠️ 已过时（2026-08-20 标注）: 第一版检阅已完成，反馈清单在 docs/FEEDBACK-2026-08-19.md，勿再作为现行依据。 -->

# REVIEW-FIRST-VERSION.md — 第一版检阅报告（2026-08-18 晚）

> 目标：可演示第一版。3h 内完成「可走通 + 截图 + 已知问题」，不铺 50 页。
> 交付物：①web/www 可运行（0 外联）②本报告 ③web/dev/diffs/review-*.png（18 张）。
> 会话 = 上一会话（HAR 定版 §20）之后的第一版检阅冲刺。

## 一、验收基线（本报告生成时实测）

| 指标 | 结果 |
|---|---|
| smoke 基线 | `hit=16 miss=0 blocked=0`，outbound=0 |
| 构建 | `bash web/build.sh` 通过，fixtures reference=70 → global-shared 22 条 |
| 8088 | background 常驻表已恢复（python3 静态服务 web/www） |

## 二、每页状态总表（✅可走通 / 🟡有瑕疵 / ❌未做）

| 页面 | 路由（真实入口） | 状态 | 截图 |
|---|---|---|---|
| 首页 | `/zdj-home` | ✅ 完整（重点服务+政策+卡片） | review-home.png |
| 办&查 | `/zdj-service` | ✅ 19 项入口全渲 | review-service.png |
| 待办 | `/zdj-pending-tasks` | ✅ 3 条待办+去申报/去处理 | review-pending.png |
| 消息 | `/zdj-message` | ✅ 列表+筛选+分类 | review-message.png |
| 我的 | `/zdj-profile` | ✅ 张伟+9 项菜单 | review-profile.png |
| 收入纳税明细 | `/IncomeTaxPayment/taxRecordList` | ✅ 收入合计 157600+明细列表 | review-mayi-record.png |
| 完税证明 | `/taxProof/taxProofQuery` | ✅ 年度选择+证明入口 | review-taxproof-query.png |
| 专项附加列表 | `/declareRecord` | ✅ 7 条（子女×2/继续/大额/房贷/赡养/照护） | review-declareRecord-list.png |
| 专项附加详情 | `/education/detail`（从列表点击） | ✅ **本轮做透**：手机/邮箱/地址/子女/学校/扣除比例/申报方式全渲染 | review-declareRecord-detail.png |
| 申报记录 tab | `/declaration_record_general` | 🟡 仅 tab 头（数据依赖 store 预置状态，见 §三） | review-declare-tabs.png |
| 发票-我的票夹 | `/invoice/walletList` | ✅ 4 tab 渲染 | review-walletList.png |
| 发票-抬头管理 | `/invoice/invoiceTitle` | 🟡 "很抱歉"错误态（历史矛盾，见 §三） | review-invoiceTitle.png |
| 发票-提交开票 | `/invoice/scanCodeInvoicing` | 🟡 同上 | review-scanCode.png |
| 综合所得年度汇算 | `/ndhsqj/beforeDeclare` | ✅ **白屏修复验证**：子路由渲染完整 | review-blank-ndhsqj.png |
| 涉税专业服务机构 | `/queryInvolveTax/list` | ✅ 子路由渲 + 空态正常 | review-blank-queryInvolveTax.png |
| 异议申诉记录 | `/taxdisputeappeal/disputeAppealList` | ✅ 子路由渲 + 空态正常 | review-blank-taxdisputeappeal.png |
| 税务消息详情 | `/tax_message/details` | 🟡 标题渲、正文空（需消息 id 参数） | review-blank-tax_message.png |
| 完税证明（另测） | `/taxProof/taxProofQuery` | ✅ | review-blank-taxProof.png |
| 税收优惠备案 | `/tax/preference/record` | ✅ **补 1 条**（赡养老人专项附加扣除/2026.03.15/生效） | review-taxpref.png |

## 三、本轮关键修复（5 白屏 + 6 miss + 专项详情做透）

### 3.1 「5 个白屏页」根因定论（非 bug）
裸 `$router.push('/ndhsqj')` 等**无参直开不匹配子路由** → 壳不渲染。
真实路径都是子路由，带子路由进入全部正常：

| 菜单名 | 真实入口 | 验证 |
|---|---|---|
| 年度汇算 | `/ndhsqj/beforeDeclare` | ✅ 流程图+申报按钮 |
| 涉税机构 | `/queryInvolveTax/list` | ✅ 地区/搜索/排序筛选+空态 |
| 异议申诉 | `/taxdisputeappeal/disputeAppealList` | ✅ 申诉事项/类型/状态筛选+空态 |
| 税务文书 | `/tax_message/details` | 🟡 需消息 id |
| 完税证明 | `/taxProof/taxProofQuery` | ✅ |

### 3.2 6 个新 miss 补默认（global-shared.json）
运行时 override 实测无 toast/无 console error 后落库：
`basecode/vn/DM_ZRR_SSJGLB`、`basecode/DM_DJ_SJ_DM_GY_XZQH_HZM`、`basecode/list/DM_DJ_XJ_DM_GY_XZQH_HZM`（行政区划/机构类别字典）、`zyss/mysslb/query/v2`（涉税机构列表）、`zyss/sszt/query`（申诉状态）、`cxCsnrBydm`（参数内容）、`swws/mx/find`（税务文书明细）。

### 3.3 专项附加详情做透（高价值页，唯一做透项）
`queryZxfjkcZnjyXq`（POST）字段逐一对齐（从混淆模板取真实字段名）：
- `znjyzc`: `xm/csrq/sjyjdmc/sjyrqq/yjbysj/zjsjysj/jdgjhdqmc/jdxx/fpbl/yxbz/sbkcnd`
- `tyxx`: `nsrsjhm/nsrdzyx/nsrtxdz/sbkxfs/kjywrMc/dwdjxh`
- `znjyzcList[0].yfpbl`、`eduSpouseInfo.sfypo`
渲染验证：#/education/detail 手机 13800138000、邮箱、地址、张小明、2015-06-01、小学、2022-09~2028-06、中国大陆、实验小学、50%（平均扣除）、年度自行申报，**无 miss 无"很抱歉"**。

## 四、已知问题（下一轮处理优先级）

1. **申报记录 tab 数据缺失**（declaration_record_general 仅 tab 头）：数据依赖 store 预置 `recordSbxh/recordSblsh/recordYwlxdm/tabIndex`，需从真实入口（待办/缴税记录进入）触发。已熔断跳过，未深挖。
2. **发票 invoiceTitle/scanCode 错误态**：历史矛盾（HANDOVER §16），接口 hit 但页面"很抱歉"。熔断，需重新对 `invoice/ttxx/init/brtt` + `ttxxList/query` 真实响应形状。
3. **tax_message 详情空**：非无参，消息详情需从列表带 id 进入。
4. **首页 flex 间距/字体**：未逐像素比对（第一版不做）。

## 五、下一轮建议优先做哪 3 页

1. **申报记录 tab**（`/declaration_record_general`）：从缴税记录真实入口触发 store 链路，3 tab 数据（zs/jkjl、zs/jkpz 已备 fixture）→ 打通「申报→缴税→退抵」主闭环。
2. **发票抬头管理修复**（`/invoice/invoiceTitle`）：对照 HKW 真实响应修 `ttxx/init/brtt` + `ttxxList/query` 形状，消除"很抱歉"。
3. **税收优惠备案列表**（`/tax/preference/record`）：✅ **已完成**（2026-08-19）：接口定论 `GET /sb/yd/yh/ssjm/sq/list`（queryTaxPreferenceApplyList，chunk 441），字段 `jmsxmc/lrrq/ztDm/ztmc/yhjmsXh/yhsqmxXh`，global-shared 补 1 条 → 页面渲染「赡养老人专项附加扣除/提交日期 2026.03.15/生效」✅（探针 __probe/review_taxpref.js，截图 review-taxpref.png）

## 六、截图清单（web/dev/diffs/review-*.png，18 张）

`review-home / review-service / review-pending / review-message / review-profile / review-mayi-record / review-taxproof-query / review-declareRecord-list / review-declareRecord-detail / review-declare-tabs / review-walletList / review-invoiceTitle / review-scanCode / review-blank-ndhsqj / review-blank-queryInvolveTax / review-blank-taxdisputeappeal / review-blank-tax_message / review-blank-taxProof`

### 逐张一行标注（2026-08-19 凌晨 vision_analyze_image 补，18/18）

| 截图 | 一行标注 |
|---|---|
| review-home | 首页：通知公告弹窗提示年度汇算，含确认按钮及选项框 |
| review-service | 办&查：渠道合并公告弹窗 + 知晓按钮 + 多项涉税业务入口 |
| review-pending | 待办：年度汇算清缴、专项附加扣除、退税进度 3 条待办 |
| review-message | 消息：个人与税务消息列表，浮窗提示消息迁移（跳过/知道了） |
| review-profile | 我的：张伟纳税信息 + 功能快捷入口 + 底部频道更名提示弹窗 |
| review-mayi-record | 收入纳税明细：收入/税额合计 + 综合所得、劳务报酬等明细 |
| review-taxproof-query | 完税证明：开具年度、开具范围选项 + 底部蓝色确定按钮 |
| review-declareRecord-list | 专项附加查询：2026 年选项 + 子女教育/大病医疗等填报明细 |
| review-declareRecord-detail | 填报详情：基本信息列表 + 子女教育信息 + 扣除比例设置 |
| review-declare-tabs | 申报记录：申报记录/缴税记录/退抵税记录 3 选项卡（仅 tab 头） |
| review-walletList | 我的票夹：发票卡片 + 蓝色新手引导弹窗 + 下一步按钮 |
| review-invoiceTitle | 抬头管理：默认个人抬头"小明" + 设置默认 + 蓝色引导提示框 |
| review-scanCode | 提交开票：纳税人信息 + 引导核对信息提示气泡 |
| review-blank-ndhsqj | 年度汇算：申报年度选项 + 开始申报/查看申报记录按钮 |
| review-blank-queryInvolveTax | 涉税机构查询：地区筛选 + 名称搜索框 + 无结果插画空态 |
| review-blank-taxdisputeappeal | 异议申诉：事项/类型/状态筛选栏 + 居中空状态插画 |
| review-blank-tax_message | 税务消息详情：返回箭头 + 顶部"详情"标题 + 大片空白内容区（🟡 需 id） |
| review-blank-taxProof | 完税证明（另测）：开具年度与范围选项 + 蓝色确定按钮 |

## 附：探针新增

- `__probe/review_*` 系列：白屏子路由验证/6 miss override 实测/专项详情点击链路/检阅包截图（8 个）
- 均为临时探针，可复用可删