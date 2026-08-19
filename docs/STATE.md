# STATE.md — 项目当前状态（会话开始读一次，里程碑后更新，保持 ≤50 行）

完整历史见 `docs/HANDOVER.md`；r8 交接/进度见 `docs/WORK-REPORT-2026-08-20-r8.md`；阶段报告见 `docs/PHASE1-REPORT.md`（2026-08-19，§5 唯一现行计划）。

## 当前状态（2026-08-20）：**r8 批次** — batch1 已 push（2ebe452）；batch2（纳税记录开具页滑块+证件号只读）完成验证全绿，本轮 commit+push → CI 自动出 r8 包；batch3（个人信息页+眼睛 toggle）待开工。

## r8 batch2 已完成（纳税记录开具页，HANDOVER §30 问题4）✅
- 根因（实锤）：`/zrr/nsqd/kj` 无 fixture→520；`zjxx/list/query=[]`→证件号「请输入」；`app.afs.switch`=N 且 afs config 空→滑块链断
- AFS 定论（KOtm.js map）：EMBOo=`!==`、DEVzJ=`===`、jLESI=`!==`、UoeFZ=`afsSig`、GQOBK=`#nc` → 老版 `window.noCaptcha` 分支需 afs config **`newAfsSwitch:"N"`**
- 改动：`web/overlays/afs-slider.js`（自供 noCaptcha，滑块可拖→绿勾→`localStorage.afsSig=Y`）；`global-shared.json`（zjxx 证件 `3****************6` + afs config）；`switch.json` afs.switch→Y；新增 `taxproof-nsqd-kj/bk-check/nsqdxx-config/kjsq-list.json`；build.sh 注入；`__probe/afs_slider_probe.js`
- 验证全绿：证件号只读脱敏、按钮 enabled、拖动→afsSig=Y、点生成→`nsqd/kj` 命中→跳 `#/taxProof/applyList`；截图 `web/dev/diffs/afs-*.png.png`

## r7 修复批次（已 push a3a712b，用户真机确认修好）
- 根因：官方安全区 CSS 全挂 `.ios` 类（原生壳注入），复刻壳零注入→规则全灭→顶穿状态栏；Fix C：config-overrides.js 按 UA 补 body.ios；Fix D：message-detail.json 删 mock 标注

## 任务2 三小项（已 commit 5c4457a）
- 免征额 toast：income-config.json +`ZS_JKJECSPZ:60000`；申报详情字段：api-stub 动态路由需 code 包装+时间戳 ms；rejection 清零：hotCodeAnalytics 传 JSON 字符串+query-task-v2.json

## 轮次③ dev 面板 V2（5 连击入口已由 r8 batch1 收紧：仅首页 tabbar「我的」5 连击）
- dev-entry.js 表单编辑器+状态字段+日志；坑：姓名保存读 work.data；overrides 优先于 fixtures；SPA 偶发空渲染需整页 reload

## 任务1（已完成，CI 出包+真机反馈）
- CI：push main→Actions build→自动 release `etax-sim-rN`（免签 IPA，SideStore）；Info.plist 名+官方蓝图标 ✅；反馈→`docs/FEEDBACK-2026-08-19.md`
- 关键定论：官方壳全部 FairPlay 加密→自建壳+api-stub 零外联核心

## 最新定论（HANDOVER §18-§21，勿重探）
- 新增 fixture 一律 `{code:'SUCCESS',data:<业务>}`；直开 hash 路由被守卫→验证必须 `$router.push`；HTTP 插件触点全 JS mock；`reference/Original-Screenshot/`=官方证据 zip，只读勿入库

## 遗留（优先级序）
1. **batch3**：个人信息编辑页项不可编辑 + 纳税人识别号眼睛 toggle/脱敏（问题1+2 同域）→ bundle-investigator 一次定位后补 fixture
2. 首页内容层（2025 汇算专题 box/公告轮播/警示案例）——按预算 targeted
3. 明细页 kzzd 动态过滤第二版
4. **batch4**：/dev 面板宫格化（仿 `reference/alternate-web/site-8082/`，契约 `{match,method,data}` 不变）
5. 已知无害：`swws/updateswwsydzt` miss 兜底；`queryTodoTask` 点击跳转未验

## 关键文件位置 / 命令 / 坑
- fixture：`web/fixtures/reference/`；overlay：`web/overlays/`；探针：`__probe/`（gitignore）；截图：`web/dev/diffs/`（gitignore）；CI 基线：release `cdn-www-v1`；证据：`reference/`、`packetSniffing/*.har`
- `bash web/build.sh`；`wk web/dev/verify.js <名> 15`；8088 常驻 background_process；IPA 出包不需要本地构建（push 即触发）
- 坑：缺 code:'SUCCESS'→空态+toast；data 必须 JSON.stringify；fixture method 须一致；**滑块已定案=afs config `newAfsSwitch:"N"`+afs-slider.js，勿改语义**；预算 ~$4 紧，只做 targeted 验证