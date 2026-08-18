# 阶段性评估报告 — 个人所得税 App 复刻（2026-08-18）

> 文档目的：回答「现状完整性 / 18443 与抓包价值 / 功能取舍 / 动态内容方案 / 是否可封包 / 仓库策略」。
> 详细历史见 `docs/PROGRESS-REPORT.md`（进度）、`docs/API-UI-IMPACT.md`（API 影响表）。

---

## 1. 你问的 18443 是什么？重要吗？

**18443 = 业务 API 服务器**（`m.etax.chinatax.gov.cn:18443`），不是"缺失的资源"。
- 前端**静态资源**（HTML/JS/CSS/图片）走 `wcdn.etax.chinatax.gov.cn` CDN —— **已全量下载**（`reference/cdn-www` 1587 文件）。
- 18443 是**接口**服务器：curl 直连被瑞数类 WAF 挡（404 挑战页）；App 内正常调用（有签名/UA）。
- **复刻不依赖它**：官方 UI/布局/样式全在本地 bundle，18443 只负责"填数据"。数据我们用 mock（fixtures）替换。
- **结论：没有 18443 的实时响应，能完整仿出**官方 UI/交互/流程；缺的只是"实时公告/真实用户数据"——而那些本来就不该进复刻（隐私 + 项目规则禁止）。

## 2. packetSniffing 抓包有价值吗？

**非常有价值，不是已被囊括**。HAR（12MB，3 个文件）包含 18443 的**真实官方响应体**，是 mock 结构的金标准：

| HAR 真实响应 | 价值 | 处置 |
|---|---|---|
| `/commonbusiness/cjwt/query` | 真实 FAQ 问答文本（wtbt/wtda） | ✅ 已转 fixture |
| `/commonbusiness/cjwt/v2/lx/query` | 真实分类结构 + **jtzydz 动态脚本 URL**（发现动态内容机制） | ✅ 已转 |
| `/sb/yd/yybs/queryyybspzxx` | 预约办税时间窗真实字段（之前 mock 空） | ✅ 已转 |
| `/common/flow/bypass` | 真实结构（group/urlList） | ✅ 已转 |
| basecode 政策说明 | 专项扣除新政 HTML 全文 | ✅ 已转 |
| wcdn 动态脚本入口 | 揭示 FAQ 内容在 CDN 脚本里，静态可下载 | ✅ 4 个真实脚本已下载 |

**动态内容难题已被推翻（不难）**：官方"文章宣传/FAQ/专题"机制 = **接口返回脚本 URL（jtzydz/csnr）→ 页面动态加载脚本注册数据**。与 menu-shim 完全同款。CDN 静态文件带 UA 下载即可（已验证 4 个 FAQ 脚本 92KB/96KB 等成功下载并注册 `questionnaireData`）。h5/newcomer（新人专区）、h5/mobilezty（专题）也已确认可下载。

## 3. 功能取舍评估

| 功能 | 重要度 | 状态 | 建议 |
|---|---|---|---|
| 任职受雇 | 高（个人中心核心） | 页面/接口已通（`/incomeType/employed` + `sgdw/query`） | 只差 item 字段打磨（~0.5h），不阻塞 |
| 申报记录 | 高（高频） | 待探（预期现成模式，1-2h/页） | **可做**，与完税证明同构 |
| 专项附加扣除 | 中-高（高频入口，7 项多步表单） | 未做 | **可延后**：视觉缺参考 + 表单工作量大；先做"进入/列表/填报表单渲染"，提交闭环走 mock 判定 |
| 文章/宣传/FAQ | 中 | 方案已验证 | 脚本本地化 + 接口指向本地（menu-shim 同款），不算难 |

## 4. 当前完整性评估

**已打通（全部 miss=0、无错误 toast）：**启动/首页/我的/消息（列表+详情）/待办（列表）/办&查/收入纳税明细（列表）/完税证明（**全流程含生成+预览**）/帮助中心/留言咨询（表单渲染）。

**已对接 API ≈ 30 个**，6+ 主页面零 miss。自定义层（登录态无验证、/dev 面板生成、全局状态）完整实证。

**结构完整性：基础框架完整**（导航/布局/数据链路/动态内容机制/自定义层），**业务页面细节仅覆盖 ~15/594 路由**——缺的是"批量铺开"（估算 ~50 核心页，1-2 周）。

## 5. 是否可封包 + 测试策略

- **建议先模拟器/本地体验测试一轮再上 iOS 壳**：检查点 = 各主入口可进、无白屏、断网/弱网不崩、引导页/弹窗行为、滚动/固定元素、登录后可直达。
- **iOS 壳（阶段 3）可以启动**：打包栈（patch_www/resign/pack）已规划，`web/www` 即为可打包产物；GitHub Actions（mac runner）构建方案此前已定。
- **不必等 100% 页面再封**：先封一版"核心可演示"的包做真机体验，再迭代补页面。

## 6. Public 仓库策略（仅为跑 mac Actions）

**强烈建议 public 仓库只放必要材料**：
- ✅ 放：`web/build.sh`、`web/overlays/*`、`web/fixtures/*`（可再现构建）、`web/www`（可运行产物/或作为 Release asset 外挂）、GitHub Actions workflow、`etax-input.zip`（已有打包脚本）
- ❌ 不 public 放：`reference/`（cdn-www 1587 文件 + alternate-web 121 文件 + HAR 12MB + APK/IPA 解包，体积大且含官方版权资产）、`packetSniffing/`、`ipa_unpacked/`
- 方式：构建产物可放 GitHub **Release asset**（公开 repo 的私有 Release asset 仍需 public）或 Actions 内从私有对象存储拉取；最小化 public 暴露 = 只放"可复现构建脚本 + workflow"，大文件走 Release/外部。

---

## 下一步建议（排序）

1. **本地体验测试一轮**（模拟器 + 桌面 WebKit 断网）→ 修明显问题
2. 补齐高价值页面：**申报记录**、**任职受雇字段**、常见问题入口（脚本本地化）
3. 启动 **iOS 壳打包**（GitHub Actions mac runner + 最小 public 仓库结构，大文件走 Release）
4. 持续铺核心页面（专项扣除延后、动态内容脚本批量本地化）