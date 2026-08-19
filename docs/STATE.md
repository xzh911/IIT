# STATE.md — 项目当前状态（会话开始读一次，里程碑后更新，保持 ≤50 行）

完整历史见 `docs/HANDOVER.md`（§22-§25 权威）；总进度/剩余见 `docs/WORK-REPORT-2026-08-18-session3.md`；第一版检阅交付见 `docs/REVIEW-FIRST-VERSION.md`；**阶段评估/问题分类/时间表/dev 面板改进见 `docs/PHASE1-REPORT.md`（2026-08-19，§5 为唯一现行计划，PLAN.md/PLANv4.md/docs/PLAN.md 已归档）**。更新用 `/checkpoint`。

## 当前状态（2026-08-19 22:10）：任务2 + 三小项 + 轮次③ dev 面板 V2 + **真机反馈已收到并整理**（见 FEEDBACK-2026-08-19）；未 commit/push

## 任务2 三小项（本轮，未 commit/push）→ 详见 docs/WORK-REPORT-2026-08-19-task2-smallitems.md；**真机反馈见 docs/FEEDBACK-2026-08-19.md**
- ① 免征额 toast 消失：income-config.json +`ZS_JKJECSPZ:60000`（标量，消费端 z0WU.js:474 getExemptionFromQuota 按 key 取标量比较）
- ② 申报详情字段全渲染（年度 2026/期 2026-01~2026-12/朝阳区税务局/北京示例科技）：根因=api-stub 动态路由（globalsystemtime+jbxx）裸 data 无 code 包装 → 拦截器拒 → getJbxx().then 门控断 → cxYsbxx 从未发；已包装 + record-tabs.json 时间戳改 ms（setFormatSkssq 用 Number()+moment，字符串=Invalid date 静默错）
- ③ rejection 清零 REJS:[]：主因同②；连带修 hotCodeAnalytics stub 传 JSON 字符串 '{}'（app 端 JSON.parse 结果，传对象=[object Object] 崩）+ 新 fixture query-task-v2.json（queryTaskListV2→POST zrr/task/queryTodoTask，chunk 40 matterList=_$nD['content'] 无 null 守卫）
- 终验：task2_probe 5 路由全渲染；task17_rejstack REJS:[]；build 成功×2

## 轮次③ dev 面板 V2（本轮，未 commit/push）→ dev-entry.js 重写；证据：devpanel-v2-report.json + 6 张截图
- 表单编辑器：6 模板 + 通用路由字段编辑器（schemaOf 类型推导/嵌套对象分组/数组项增删改/逗号分隔原语数组）+ JSON 原始编辑/复制/清空 + 全局状态字段 + 日志
- 5 连击入口（capture 阶段 click）：「用户注册协议」/「自然人办税服务平台」2.5s 窗口 5 次开面板；弹窗内点击排除
- 验收（devpanel_v2_probe）：panel1/2/3=true；收入 99999.00/V2测试科技有限公司 ✓；姓名 赵云测试 即时生效 + etax_global_state.userName 落盘 ✓；完税证明 sjtse/pzje=3000 渲染 ✓；smoke hit=17 miss=1 blocked=0 outbound=0
- 关键坑：姓名保存读 work.data（非 work.data.data）；overrides 优先于 fixtures；SPA 多路由切换后协议页偶发空渲染需整页 reload（同真实重启）；事件时间异常=容器时钟，无关

## 任务1（已完成）：轮次①已 push + CI 出包，真机已验证（反馈→FEEDBACK-2026-08-19）
- **CI 出包成功**：commit 73bf97b push main → Actions build #5 通过（1m25s）→ artifact `etax-sim-ipa` 33MB 已下载至 `/tmp/kilo/etax-sim/etax-sim-ipa/etax-sim.ipa`；Info.plist 显示名「个人所得税」✅；AppIcon=官方 CgBI 蓝色 ✅
- **真机验证已收到反馈（08-19 晚，装 r5 后）**：状态栏白/明细页筛选项缺/首页内容缺/滑块验证/dev 面板入口 → 全部整理进 FEEDBACK-2026-08-19.md（含可行性判断，§6 总表 + §7 开工指引）
- **可演示基线**：smoke hit=14 miss=0 blocked=0，outbound=0；8088 常驻正常
- **本轮完成**：App 名统一；REVIEW 18 张截图标注全补（18/18）；税收优惠备案补 1 条（`GET /sb/yd/yh/ssjm/sq/list`，赡养老人/生效渲染 ✅）；**IPA 路线 B 就绪**（ios/config.xml + platforms cordova-ios@7.1.1 + build-ipa.sh 免签 + build-ios.yml）
- **关键定论**：官方壳全部 Mach-O **cryptid=1 FairPlay 加密** → 官方壳复用废弃；自建壳零原生插件，cordova.js 用 mock（api-stub 零外联核心）

## 最新定论（HANDOVER §18-§21，勿重探）
- 18443 WAF 过不去已弃；新增 fixture 一律 `{code:'SUCCESS', data:<业务>}`；直开 hash 路由被守卫重定向 → 验证必须 `$router.push`（review_core_shots.js 模式）
- 插件触点盘点（实证）：http×14=api-stub 挂载点（勿真实现）；app×36/etasIfaa×34/LaunchHotCode×18/sim×30 等全 JS mock；weibo×0 唯一零引用；官方原生 SDK 全部不带

## 遗留（优先级序）
1. **用户动作（真机验证）**：下载 artifact（gh run download 32177140012）→ SideStore 导入安装 → 按清单验证首页/黑框/安全区/图标/tab
2. 若 SideStore 拒绝免签包：兜底 `codesign -s -`（Xcode 自带 ad-hoc）需用户加一行到 build-ipa.sh；真机验证后才能定论
3. **下一步**：按 docs/FEEDBACK-2026-08-19.md §7 开工指引执行；轮次③已完成，轮次④ 20 页铺开按预算
4. 真机状态栏/安全区像素对齐（规则 §11）；启动图仍默认（图标已换官方蓝标）
5. 已知无害遗留：`swws/updateswwsydzt` miss 兜底；`queryTodoTask` 点击跳转未验；budget ~$4 紧，只做 targeted 验证

## 关键文件位置
- fixture：web/fixtures/reference/（global-shared 22 条）；overlay：web/overlays/（cordova.js mock 浏览器/壳共用）；探针：__probe/；截图：web/dev/diffs/；参考只读：reference/、packetSniffing/*.har

## 验证命令（工作目录=项目根）
- `bash web/build.sh`；`wk web/dev/verify.js <名> 15`；`wk web/dev/sweep.js /路由 12`；8088 用 background_process `bash web/dev/serve.sh 8088`（会话间挂）；IPA 构建 `bash ios/build-ipa.sh`（仅 macOS）

## 已知坑
- 缺 code:'SUCCESS' → 空态+toast；data 必须 JSON.stringify；fixture method 须与实际请求一致
- captcha/base64Image 是 AFS 兜底别 mock；首次启动需点「同意」+「跳过」否则截图被遮罩
- 预算：用户 ~$4 紧张，只做 targeted 验证；不 commit/push（用户推进）；reference/ 不动
