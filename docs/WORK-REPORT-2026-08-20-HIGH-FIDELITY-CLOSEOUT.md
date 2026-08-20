# 高保真收口工作报告与交接（2026-08-20）

> 本文是 2026-08-20 高保真收口批次的完整工作报告，也是后续维护的首要交接入口。
> 短状态看 `docs/STATE.md`；历史技术定论看 `docs/HANDOVER.md`；r8 早期滑块批次看 `docs/WORK-REPORT-2026-08-20-r8.md`。

## 1. 结论摘要

本轮已把项目从“核心业务可演示”推进到“指定参考状态可确定性复现”的收口阶段。主要成果是：建立 38-case 参考矩阵和严格 WebKit runner，完成首页 2025 参考内容、收入明细状态、个人信息编辑与脱敏、纳税记录滑块闭环、手势密码卡死修复，并移除离线版无意义的短信验证码返回流程。

必须准确理解当前完成度：

- 38 个 reference case 已建档，其中 37 个可运行、1 个是导出 JPG 证据；这不等于 38 个都已通过或逐像素签收。
- 发布前有明确严格 PASS 证据的 case 为 6 个：`IMG_3936`、`IMG_3949`、`IMG_3950`、`IMG_3951`、`IMG_3983`、`IMG_3984`；本轮 3983/3984 已在最后一次字体/tabbar 调整后重跑。
- 严格 runner 的 PASS 代表路由、文本、网络、错误门和白屏检查通过；它目前不生成并排图/差异区域，也没有应用 `maskRegions`，所以不能替代人工视觉签收。
- 首页年度卡和 6 张宣传图来自私有参考截图的局部裁切。源图和裁图不会提交公开 Git；公开 CI 的干净 checkout 不具备这些像素，发布 IPA 需要独立注入。

## 2. 本轮目标与实际范围

### 2.1 原计划目标

- 建立 402×874 @3 的正确视觉基线和 27 个原始参考状态。
- 收口滑块、个人信息、识别号脱敏、首页、收入明细、纳税记录及空态。
- 优先复用官方资源；找不到独立资源时允许对独特宣传画或整张卡片做局部裁切。
- 保持真实交互，不把整页、表单、滑块或按钮贴成不可交互截图。
- 离线运行、零外联、fixture 协议稳定，并保留模拟证明的非官方标识。

### 2.2 实际交付范围

- 参考矩阵从原 27 张扩展到 38 个 case，加入 `IMG_3983`–`IMG_3994` 的首页、待办、消息和我的页面证据。
- 首页完成 2025 汇算卡、橙色提醒、重点服务、6 张宣传轮播、四组内容列表和底栏玻璃效果。
- 收入明细完成筛选、禁用态、动态过滤/合计、列表分组、详情和滚动参考状态。
- 个人信息完成地区、详细地址、学历、民族、保存回显、识别号脱敏/查看。
- 纳税记录完成可拖动滑块、通过回调、生成、申请列表和已有预览链路。
- 手势密码完成设置、二次确认、保存、验证和修改前校验；修复二次绘制后卡死。
- 短信验证码返回流程已从离线个人信息查看链路移除。
- `/dev` 仍保持 `{match, method, data}` 覆盖契约；宫格化重做未纳入本轮。

### 2.3 明确不在本轮

- 594/714 级别全部路由逐页高保真。
- 完整 `mobilezty` 外部专题 H5。
- 实时官方业务、扫码、推送、生物认证等原生服务等价实现。
- 将模拟税务材料伪装成真实官方凭证。

## 3. 完成内容明细

### 3.1 参考矩阵与严格 runner

新增 `web/dev/reference-cases.json`：

- 共 38 个 case；37 个可运行，`img-3957-taxproof-exported-document` 为无路由 JPG artifact。
- 首页 case 21 个，覆盖默认、返回、年度卡、提醒轮播、宣传轮播、通知公告、热点问题和政策解读。
- 统一字段包含 `referenceImage`、`route`、`viewport`、`fixtureSeed`、`query`、`uiState`、`scroll`、`maskRegions` 等。
- 默认 WebKit viewport 为 402×874、DPR 3，固定时间、随机种子和 localStorage，支持 route/query/action/滚动/expectedText。

新增 `web/dev/verify-reference.js`：

- 非白名单 API miss、外联、blocked、requestfailed、HTTP ≥400、白/空屏、page error、console error、路由不符和 expectedText 缺失都会失败退出。
- 支持 manifest 自检、单 case 和 `all` 执行。
- 当前只输出 `actual.png` 与 `report.json`；尚未实现 side-by-side、差异区域和实际 mask 运算。

### 3.2 首页高保真收口

内容层：

- 橙色反诈提醒冻结为三条参考文案，保持上下轮播结构。
- 提醒文字沿用官方字体链 `-apple-system / PingFang SC`，针对 Linux WebKit 偏细问题把该区域字重从官方原始 400 调到 500。
- 2025 综合所得年度汇算采用 `IMG_3983` 的完整卡片局部裁切，CSS 按 376×208 等比显示，避免透明抠图产生黑边、锯齿和人物边缘瑕疵。
- “进入专题页”和“开始申报”不是死图：卡片上保留两个透明、可访问的 DOM 点击热区。
- 重点服务推荐恢复官方内部比例，只调整与年度卡之间的纵向关系。
- 6 张首页宣传轮播来自 `IMG_3986`–`IMG_3991` 的局部裁切。
- 警示案例、通知公告、热点问题和政策解读优先复用官方 bundle 内的 `jsal/tzgg/rdwt/zcjd` 插画资源。
- tabbar 使用官方 `.zdj-outter` 容器，在原 12px blur 基础上把白色背景提升到 84% 不透明度并增加轻微饱和，保留原尺寸和图标比例，减少橙色内容透出。

资源治理：

- `web/fixtures/reference/home-assets-manifest.json` 记录来源、裁切坐标、尺寸、页面、用途和 SHA-256。
- 原始截图与裁图目录均 gitignore；仓库只提交清单和代码。
- `web/build.sh` 本地检测到 `web/fixtures/private/home/` 时复制首页裁图；缺失时不让构建脚本崩溃。
- 当前私有目录有年度整卡、6 张宣传图和一个未使用的 `home-annual-artwork.png`。

### 3.3 收入纳税明细

- 修正 9 类所得编码与名称；发布前审计还修正了“偶然所得所得”为“偶然所得”。
- 默认勾选工资薪金、劳务报酬、稿酬、特许权使用费四类。
- 支持展开其余五类、全不选时禁用查询。
- API stub 按 `sdxmDms/kzzd` 动态过滤，重新计算收入合计和已申报税额。
- 列表数据与详情数据联动；支持分组、详情跳转和详情下半段滚动。
- `income_filter_probe.js` 现有证据为 5/5 PASS。
- 严格 `IMG_3949/3950/3951` 已 PASS，诊断项均为 0。

### 3.4 个人信息与脱敏

- 新增 `personal-base-info.json`，补齐学历、民族、地区和个人基础信息。
- 地区、详细地址、学历、民族可编辑；保存写入 localStorage，并在后续查询中回显。
- 证件号码保持只读。
- 纳税人识别号默认脱敏，眼睛切换直接在本地显示/隐藏，不再进入短信验证码返回流程。
- `personal_info_probe.js` 已证明选择、输入、保存、回读和眼睛切换；但脚本不是严格断言门，现有记录仍含启动期 Promise 噪声与 1 个 `querymycygnlb` 非阻塞 miss。

### 3.5 纳税记录与滑块

- `afs-slider.js` 提供真实 DOM 滑块，不使用滑块截图。
- 支持按住拖动、轨道变绿、绿勾“验证通过”、官方页面回调和 `afsSig` 状态。
- 补齐证件列表、AFS 配置、并库检查、生成、申请列表等 fixture。
- 生成后可进入申请列表，并继续使用已有详情/预览链路。
- `afs_slider_probe.js` 现有报告证明：证件号只读脱敏、按钮可点、拖动后 `afsSig=Y`、生成接口命中并跳转申请列表。
- 该 probe 仍记录 `Unhandled Promise Rejection` 和 Cordova `Connection.UNKNOWN` 噪声，因此属于功能证据，不是严格全绿门。

### 3.6 手势密码

- 官方安全中心已有“手势登录”和“修改手势密码”页面；复刻页面此前在第二次绘制后卡死。
- 根因是离线 SM2 配置缺少合法公钥，官方状态机在二次确认后的加密/保存阶段无法继续。
- 补齐合法测试公钥以及 status/verify/find/set/change/forgot/deregister 离线响应。
- 保留官方九宫格绘制交互，记录用户设置的图案；需要验证时弹出并按本地记录校验。
- `gesture_probe.js` 覆盖首次设置、保存、安全中心恢复和修改前验证，最新发布前运行 `ok=true`；本次运行没有命中“不一致重试”分支（`mismatchRetry=false`），该分支保留在脚本中但不计入本次绿灯声明。

### 3.7 离线、安全与构建

- fixture 继续统一 `{code:"SUCCESS", data:...}`；运行时覆盖继续使用 `{match, method, data}`。
- 正常参考页面不增加全局“模拟版”水印。
- 模拟证明/导出仍保留“测试/非官方”标识，内部数据保留 `source:"mock"`。
- `.gitignore` 补充原始截图、私有裁图、Playwright 和敏感参考目录，防止误提交。
- `web/build.sh` 注入年度卡 overlay，并复制本地私有首页资源。

## 4. 关键文件地图

新增：

- `web/dev/reference-cases.json`：38-case 参考矩阵。
- `web/dev/verify-reference.js`：严格 WebKit runner。
- `web/fixtures/reference/home-assets-manifest.json`：首页资源来源与哈希。
- `web/fixtures/reference/personal-base-info.json`：个人信息基础 fixture。
- `web/overlays/home-annual-card.js`：年度整卡、点击热区、首页字体与 tabbar 表面样式。

重点修改：

- `web/overlays/api-stub.js`：收入筛选、个人信息持久化、手势状态机等动态路由。
- `web/overlays/afs-slider.js`：滑块交互和官方回调兼容。
- `web/overlays/mock-login.js`：登录态/个人信息同步。
- `web/fixtures/reference/menu-shim.js`：首页年度专题、宣传栏和内容区配置。
- `web/fixtures/reference/tzgg-mock.json`：首页橙色提醒内容。
- `web/fixtures/reference/global-shared.json`：所得类型、证件、AFS 和公共字典。
- `web/fixtures/reference/tax-record-list.json`：收入参考数据。
- `web/fixtures/reference/batch-safety.json`：手势相关安全配置。
- `web/build.sh`：overlay 与资源接入。
- `.gitignore`：私有证据保护。

## 5. 验证状态

### 5.1 已确认

- `bash web/build.sh`：通过。
- `git diff --check`：通过。
- reference manifest：38 个 referenceImage 本地存在。
- 严格 PASS：`img-3936-home-default`、`img-3949-income-list`、`img-3950-income-detail-top`、`img-3951-income-detail-lower`、`img-3983-home-2025-reference`、`img-3984-home-mid-scroll`；本轮重跑的 3983/3984 与 3949/3950/3951 均通过。
- targeted：收入筛选探针退出码 0；手势 `ok=true`；AFS 最新报告再次证明真实 widget、脱敏只读、拖动后 `afsSig=Y`、生成接口命中并跳申请列表。

### 5.2 尚未确认

- 38 个 runnable case 尚未全量跑通；不能写“38-case 全通过”。
- `IMG_3986/3992` 在服务恢复后重跑，网络/路由/页面错误均为 0，但 `expectedText` 要求读取宣传图片内文字，当前 runner 无 OCR/alt，因此仍为 FAIL；应修正验证描述或增加可访问文本后再计入严格通过。`3993/3994` 尚未重跑。
- `IMG_3952` 路由已从错误的 `/taxProof/taxProofQuery` 修正为 `/taxProof/payTaxDetailedQuery`；页面和 expectedText 已出现，但严格门仍收到 Cordova `Connection.UNKNOWN` 启动噪声。`IMG_3953` 的 runner 自动拖动尚未成功，不能算严格 PASS；AFS targeted probe 已通过真实拖动闭环。
- 38 张均未人工生成并排图和差异区域，未逐张像素签收。
- 真机状态栏、Dynamic Island、安全区、键盘、触控、滚动、冷启动仍需安装 release 后反馈。

### 5.3 runner 能力边界

- `maskRegions` 当前只入报告，未参与图像运算。
- 单 case `summary.json` 会覆盖前一次，不是历史聚合。
- PASS 不包含字体抗锯齿、原生状态栏和 Dynamic Island 的自动容差判断。

## 6. 发布资源链与隐私边界

仓库 `xzh911/IIT` 为 PUBLIC。以下内容禁止进入 Git 历史：原始截图、HAR、原 IPA/APK、私有裁图目录。

本轮首页 7 张裁图不在 Git，普通 CI checkout 无法复制它们。直接使用现有 workflow 生成的 IPA 会缺年度卡并使宣传栏退化。发布必须采用以下流程：

1. 提交并 push 代码，让现有 GitHub Actions 生成新的未签名 IPA 和 release。
2. 本地执行 `web/build.sh`，得到包含私有裁图的 `web/www`。
3. 下载该次 CI 的未签名 IPA，在 Linux 本地解包，只替换 App 内的 `www`，保持壳和插件不变。
4. 重新 zip 为 IPA，并以同名 `etax-sim.ipa` 覆盖本次 release asset。
5. 解包最终 asset 验证 7 张首页资源存在并校验 SHA-256。

这样私有像素不会进入公开 Git 历史；它们只进入用户明确要求发布的最终安装包。若以后要求连 release asset 也不可公开，则必须改为私有仓库/私有对象存储或本地交付。

## 7. 工作量与进度评估

按本轮锁定的“27 张原参考 + 新首页参考 + 核心链路”范围：

- 代码与 fixture 实现：约 85%–90%。
- 可确定性运行矩阵建设：约 90%，但视觉 diff/mask 尚未完成。
- 严格自动验证覆盖：6/37 runnable 有当前明确 PASS 记录（另有历史证据但未做完整聚合），约 16%；核心收入链覆盖较好，首页内容图像文本、空态和滑块 runner 仍需补。
- 人工逐图签收：未完成系统性全量签收。
- 真机发布验收：等待本次 release。

如果验收标准是“指定核心页面肉眼非常接近官方并可离线演示”，当前已经接近封版，剩余主要是验证和小范围视觉回调。如果验收标准是“全部官方路由逐页截图级一致”，仍是远超本轮的长期工作。

## 8. 已知限制与风险

- `IMG_3950` 的“申诉”受官方业务条件控制；当前参考记录条件不满足，没有篡改 fixture 强行伪造。
- 首页整卡和宣传栏使用合法参考的局部裁图，不适合公开源码分发；交互仍由 DOM 热区承担。
- tabbar 样式覆盖使用全局 `.zdj-outter` 选择器，会影响所有使用该官方容器的页面；这是用户要求的统一磨砂效果，后续如只需首页应增加路由作用域。
- 个人信息/AFS 的现有探针有启动或 Cordova 噪声，应继续用严格 case 补齐，而不是把噪声误报成业务失败。
- 公开 CI 不含私有首页资源，必须保留本报告 §6 的 release 覆盖步骤。
- 未经真机验证，不应宣称 iOS 原生安全区、键盘和触控已经最终签收。

## 9. 后续建议顺序

### P0：本次 release 后真机回归

- 首页：年度卡、重点服务比例、提醒字重、tabbar 磨砂、宣传轮播。
- 收入：默认/展开/全不选、列表、详情滚动。
- 纳税记录：真实手指拖动滑块、生成、申请列表、预览。
- 个人信息：picker、键盘、保存、眼睛切换。
- 手势：设置两次、重启后验证、修改手势。
- 壳：冷启动、状态栏、安全区、底栏和返回。

### P1：补齐严格证据

- 至少重跑首页 `3983/3984/3986/3992`、收入 `3949/3950/3951`、滑块 `3952/3953`。
- 服务稳定后执行 `verify-reference.js all 3`，得到 37 runnable 的聚合结果。
- 为 runner 增加 side-by-side、diff region 和 mask 应用，再做逐图人工签收。

### P2：后续功能

- `/dev` 宫格化界面；保持覆盖层契约不变。
- 如有新官方证据，再补对应页面；无证据页面只标记“设计体系一致”。
- 外部专题 H5、实时服务和原生能力继续保持 out-of-scope，除非用户单独扩项。

## 10. 下次会话最短开场

1. 读 `docs/STATE.md`。
2. 读本文 §1、§5、§6、§8。
3. 不再调查已定案的 AFS `newAfsSwitch:"N"`、手势 SM2 公钥根因或收入动态过滤调用链。
4. 先确认最新 release 与真机反馈，再决定视觉微调；不因单个抗锯齿噪声重写结构。
5. 继续遵守：不整读混淆 bundle，连续两次不确定就用 grep/probe/运行时验证。

## 11. 发布记录

- 发布提交：`fdb277e`（`feat: 高保真收口首页与核心离线链路`），已 push `origin/main`。
- GitHub Actions：run `32359893998`，`Build iOS IPA (SideStore, unsigned)` 全部步骤成功。
- Release：`etax-sim-r10`，标题 `etax-sim IPA r10 — 高保真收口`。
- CI 原始 asset 生成后，本地用最终 `web/www` 覆盖 IPA 内 `Payload/ETaxSim.app/www`，随后以同名 `etax-sim.ipa` 覆盖 release asset。
- 最终 IPA：36,074,523 bytes；SHA-256 `c7ff224fca94e33c7b64dd8c7c21c774633226679c6844d45a050b8b01e401c9`。
- 最终包 ZIP 完整性通过；包内年度整卡 + `home-promo-01`–`06` 共 7 张资源存在，抽查哈希与 `home-assets-manifest.json` 一致。
