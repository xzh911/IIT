# STATE.md — 项目当前状态（会话开始读一次，里程碑后更新，保持 ≤50 行）

完整历史见 `docs/HANDOVER.md`（§18-§22 权威）；总进度/剩余见 `docs/WORK-REPORT-2026-08-18-session3.md`；第一版检阅交付见 `docs/REVIEW-FIRST-VERSION.md`；**阶段评估/问题分类/时间表/dev 面板改进见 `docs/PHASE1-REPORT.md`（2026-08-19 新）**。更新用 `/checkpoint`。

## 当前状态（2026-08-19 00:55）：交付收尾 + 最小 Cordova 壳文件就绪（待 push）
- **可演示基线**：smoke hit=14 miss=0 blocked=0，outbound=0；8088 常驻正常
- **本轮完成**：
  0. App 名统一「个人所得税」（根 ios/config.xml + platforms config/plist 两处已一致）
  1. REVIEW §六 18 张截图 vision 一行标注全补（18/18）
  2. 税收优惠备案补 1 条：接口 `GET /sb/yd/yh/ssjm/sq/list`（queryTaxPreferenceApplyList，chunk 441），字段 `jmsxmc/lrrq/ztDm/ztmc/yhjmsXh/yhsqmxXh`，global-shared 落 1 条 → 「赡养老人专项附加扣除/2026.03.15/生效」渲染 ✅（探针 __probe/review_taxpref.js）
  3. **IPA 路线 B 文件就绪**（自建最小 Cordova 壳，待用户 push + Actions + SideStore 真机验证）：
     - `ios/config.xml`（id=com.etax.sim、名"个税模拟"、portrait、deployment 13.0）
     - `ios/platforms/`（cordova-ios@7.1.1 生成工程 136 文件，Info.plist 已手调：状态栏 Light、ATS 任意加载、显示名）
     - `ios/build-ipa.sh`（填 www→覆盖 mock cordova.js→xcodebuild CODE_SIGNING_ALLOWED=NO 免签→zip）
     - `.github/workflows/build-ios.yml`（macos-latest，产物 upload-artifact；无 zsign/无证书/无官方加密包）
- **关键定论**：官方壳全部 Mach-O **cryptid=1 FairPlay 加密**（主二进制+6 Frameworks 实测）→ 官方壳复用路线废弃；自建壳零原生插件，cordova.js 用现有 mock（api-stub 零外联核心）

## 最新定论（HANDOVER §18-§21，勿重探）
- 18443 WAF 过不去已弃；新增 fixture 一律 `{code:'SUCCESS', data:<业务>}`；直开 hash 路由被守卫重定向 → 验证必须 `$router.push`（review_core_shots.js 模式）
- 插件触点盘点（实证）：http×14=api-stub 挂载点（勿真实现）；app×36/etasIfaa×34/LaunchHotCode×18/sim×30 等全 JS mock；weibo×0 唯一零引用；官方原生 SDK 全部不带

## 遗留（优先级序）
1. **用户动作（IPA）**：push 全部新文件 → Actions 跑 build-ios.yml → 下载 etax-sim.ipa → SideStore 导入安装 → 验证打开首页
2. 若 SideStore 拒绝免签包：兜底 `codesign -s -`（Xcode 自带 ad-hoc）需用户加一行到 build-ipa.sh；真机验证后才能定论
3. 申报记录 tab（store 预置 recordSbxh/…，需真实入口触发）
4. 发票抬头/scanCode（ttxx 响应形状，§16 历史矛盾）
5. tax_message 详情需 id；真机状态栏/安全区像素对齐（规则 §11）；启动图仍默认（图标已换官方蓝标）

## 关键文件位置
- fixture：web/fixtures/reference/（global-shared 22 条）；overlay：web/overlays/（cordova.js mock 浏览器/壳共用）；探针：__probe/；截图：web/dev/diffs/；参考只读：reference/、packetSniffing/*.har

## 验证命令（工作目录=项目根）
- `bash web/build.sh`；`wk web/dev/verify.js <名> 15`；`wk web/dev/sweep.js /路由 12`；8088 用 background_process `bash web/dev/serve.sh 8088`（会话间挂）；IPA 构建 `bash ios/build-ipa.sh`（仅 macOS）

## 已知坑
- 缺 code:'SUCCESS' → 空态+toast；data 必须 JSON.stringify；fixture method 须与实际请求一致
- captcha/base64Image 是 AFS 兜底别 mock；首次启动需点「同意」+「跳过」否则截图被遮罩
- 预算：用户 ~$4 紧张，只做 targeted 验证；不 commit/push（用户推进）；reference/ 不动
