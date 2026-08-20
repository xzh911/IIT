# STATE.md — 项目当前状态（会话开始读一次；保持 ≤50 行）

文档地图：`WORK-REPORT-2026-08-20-HIGH-FIDELITY-CLOSEOUT.md`（本轮完整报告/发布交接）｜`HANDOVER.md`（历史定论）｜`WORK-REPORT-2026-08-20-r8.md`（r8 早期批次）｜`FEEDBACK-2026-08-19.md`（真机反馈）。

## 当前状态（2026-08-20）：高保真收口已实现，正在发布
- `web/dev/reference-cases.json` 共 38 case，所有 `referenceImage` 均存在；原图目录被 `.gitignore` 忽略且未被 Git 跟踪。
- WebKit 基线固定 402×874 @3；严格 runner 会拦截非白名单 miss、外联、blocked、白屏、page/console error 和路由不符。
- `git diff --check` PASS。此前里程碑 `bash web/build.sh`、修改/新增 JS 语法、JSON 解析和 fixture `{code:'SUCCESS',data:...}` 协议均 PASS。
- 已有明确严格 PASS：`img-3936/3949/3950/3951/3983/3984`；本轮 3983/3984 已在最终字体/tabbar 调整后重跑。38 case 是建档矩阵，不是 38 个全通过。

## 已完成能力
- 首页：橙色反诈提醒、2025 年汇算、重点服务、6 张宣传轮播、警示案例/通知公告/热点问题/政策解读已补齐；宣传栏和内容插画优先复用官方资源。
- 年度汇算卡采用 IMG_3983 完整卡片像素裁切，避免透明抠图黑边；CSS 376×208 等比显示，专题入口和“开始申报”保留透明 DOM 点击热区，重点服务区比例已恢复。
- 资源清单记录卡片与 6 张宣传图的来源、裁切范围、尺寸和 SHA-256；原始截图、HAR、私有资源均不公开提交。
- 收入明细：默认四类、展开其余五类、全不选禁用、动态过滤/合计和详情跳转；`income_filter_probe.js` 5/5 PASS。
- 个人信息：地区/地址/学历/民族保存回显、识别号脱敏与查看完成；现有 probe 证明保存、回读和眼睛切换命中。
- 纳税记录：AFS 初始态→拖动通过→生成→申请列表可用；现有 probe `afsSig=Y`。
- 手势密码：设置、二次确认、保存、后续验证状态机可用；现有 probe `ok=true`，二次绘制卡死已修复。
- 离线版短信验证码返回流程已移除；正常页面不增加全局模拟版水印。
- 首页 7 张裁图位于 gitignored 私有目录；公开 Git 不提交像素，release 必须在 CI 产出后注入本地 `web/www` 并覆盖 IPA asset。

## 已知限制
- `IMG_3950` 官方右上角“申诉”受官方业务条件控制；当前参考记录条件不满足，未篡改 fixture 或伪造按钮，作为已解释差异保留。
- personal probe 仍有启动期 Promise 噪声和 `querymycygnlb` 1 个非阻塞 miss；AFS probe 另有 Cordova `Connection.UNKNOWN` 噪声，不影响上述严格 case。
- `3986/3992` 当前只因 expectedText 指向图片内文字而 FAIL；`3952/3953` 的严格 runner 仍有 Cordova 启动噪声/自动拖动问题，AFS targeted 闭环已通过。
- 38 case 是可复现矩阵，不等于 38 张均已人工逐像素签收；真机状态栏、安全区、键盘、触控和 IPA 冷启动仍需设备反馈。
- 完整外部专题 H5、实时官方服务、扫码/推送/生物认证不在本轮范围；模拟证明继续标识“测试/非官方”。

## 常用命令
- 构建：`bash web/build.sh`；manifest：`wk web/dev/verify-reference.js --validate-manifest`
- 严格单 case：`wk web/dev/verify-reference.js <case-id> 3`
- targeted：`wk __probe/personal_info_probe.js` / `income_filter_probe.js` / `afs_slider_probe.js` / `gesture_probe.js`
