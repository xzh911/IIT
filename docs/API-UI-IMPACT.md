# API → UI 影响分析表（阶段 2.3 产出）

> 更新：2026-08-18
> 方法：静态逆向（app.js/46.0fff.../home.*.js 响应消费代码）+ 运行时实证（容器 WebKit + `__API_STUB__` 日志 + Vuex action/mutation 订阅）
> 结论优先级：实证 > 静态代码 > 推断。标注 ★ = 已运行时验证。

---

## 已对接（fixtures/reference/）

| API | 方法 | 调用点 | UI 用途 | mock 响应 | 验证 |
|---|---|---|---|---|---|
| `/zh/switch/query` | GET | 启动 `@GLOBAL/BUSSNESS_SWITCH_STATUS`×2 | feature switches（数十项，含 sslVerify/emas/metrics） | 全部 `"N"`（`zssj.validate.switch` 等字段名已从 mutation 映射） | ★ 实证：hit，后续启动链继续 |
| `/commonbusiness/tzgg/pop/find` | GET | 首页 `queryNotiDialogInfo` | 公告弹窗 | `{content:[{contentId,title,content}]}`，1 条 | ★ 实证：hit，提交 `@HOME/NOTIFY_DIALOG_INFO` |
| `/zrr/common/theme/query` | GET | 首页 tab 点击 `clickTabItemHandler`→`queryAppThemeColor` | 主题色（NORMAL/GQ/…） | `"NORMAL"`（响应=主题代码字符串） | 静态已确认消费方式；UI 触发链路待实证 |
| `/zrr/common/appdist/query` | GET | 首页 `getBannerList`（`$refs.homeRefs`） | 宣传轮播 `bannerVOS`（本地图）+ `bannerInterval` + `ztyVOS`(专题) | `{bannerVOS:[{bannerUrl 本地图,…}], bannerInterval:3000, ztyVOS:[]}` | ★ 实证：store 注入 `@HOME/BANNER_CONFIG_LIST` 后 `swiperList` 正确更新（4 项+Img 加载）；DOM 渲染依赖 unlock-complete 链路 |
| `/sb/yd/gg/cxCsnrList` | POST | 收入明细页 `@GLOBAL/GET_CSNR_LIST` | 页面参数（分页大小/轮询延迟，csdm 配置） | `{SB_NSMX_APP_PAGESIZE_NUM:20, SB_NSMX_DELAY_TIME:10}`（csdm 为 key） | ★ 实证：resolve 正确 |
| `/sb/yd/gg/cxNsmxList` | POST | 收入明细页 `queryTaxRecordList` | **收入纳税明细列表** | `{nsmxList:[…], ybtseHj, sreHj}` | ★ 实证：**列表完整渲染** |
| `/zrr/wszm/query` | POST | 完税证明列表 `getTaxProofList` | **纳税记录开具/完税证明列表** | `{list:[…], total, hjse}` | ★ 实证：**列表完整渲染** |
| `/zrr/wszm/kjcs` | GET | 完税证明页 `getGenerateProofNumber` | 已开具/可开具次数 | `{ykjcs:0, zkjcs:5}` | ★ 实证：hit |
| `/zrr/wszm/kj` | POST | 完税证明页 `generateProof` | 生成证明（返回 kjsqxh） | `{kjsqxh:'MOCK-…'}` | ★ 实证：进入轮询 |
| `/zrr/wszm/kjcx` | GET | 完税证明页 `getProofFail`（轮询） | 开具结果（wszmPics） | `{wszmPics:[{fileId}]}` | ★ 实证：走通 |
| `/zrr/dzzl/url/query` | GET | 完税证明预览 `queryUrlbyZpxh` | 证明图 URL | `{viewUrl:'./static/images/taxproof-mock.svg'}` | ★ 实证：**预览页渲染** |
| `/zrr/task/pageQuery` | POST | **待办列表** `queryTaskList` | `{content:[{taskTitle,taskContent,readStatus,ywStatusCode/ywStatusName,icon{iconCode},buttons[{buttonName}]}], total}` | ★ 实证：**3 条任务渲染** |
| `/sb/yd/dbsb/sfzs` `/sb/yd/hbpt/sfzs` | GET | 代办申报/合并平台菜单开关 | `'Y'/'N'` | ★ 实证：hit（代办申报菜单项受其控制） |
| `/common/system/globalsystemtime` | GET | 服务器时间（与预约时间戳直接比较） | **动态路由**（api-stub 内置，返回 Date.now()） | ★ 实证：消除预约办税页错误弹窗 |
| `/zrr/jbxx/query` `/common/srf/getToken` `/commonbusiness/event/query` | GET | 登录/实名/事件 | 安全默认（用户信息/空） | ★ 实证：hit 无副作用 |
| `/zrr/sddq/query` `/zrr/ssxy/sfpp` `/zrr/sqbs/bsqx/query` `/zrr/zjcd/bdfw/query` `/common/basecode/HLW_SB_KCND` `/sb/yd/yybs/queryyybspzxx` | 混合 | 启动链状态/权限/编码类 | 安全默认（`{}`/`[]`） | ★ 实证：10 miss → 0，批量清零 |
| `/zrr/message/classify/query` | GET | **消息分类** `queryMessageTypeList` | `[{xxflDm,xxflmc}]`（页面自拼「全部」） | ★ 实证：**筛选下拉 4 项** |
| `/zrr/message/znx/list/query` | POST | **消息列表** `getFilterMessageList` | `{content:[{messageTypeName,title,receiveDate,readed}], total}` | ★ 实证：**3 条消息渲染** |
| `/zrr/message/znx/content/query` | GET | **消息详情** `getMessageInfo({messageId,sflx})` | `{content:<HTML 字符串>}`（直接 innerHTML） | ★ 实证：**详情页渲染** |
| `/zrr/srlx/sgdw/query` | GET | **任职受雇列表**（页 `/incomeType/employed`） | 数组；**item 字段名待打磨**（当前 mock 渲染 undefined 骨架） | ★ 实证：数组消费 ✓；字段见待办 |
| `/zrr/jbxx/query` | GET | 用户基本信息 `getUserInfo`（@USER/USER_INFO 拉取，**覆盖 userInfoObj**） | **动态路由**：读 `etax_global_state.userName`（默认张伟） | ★ 实证：改名生效 |

**收入纳税明细列表项字段**（模板实证）：`sdxmDlDm/sdxmDlmc`（所得大类）、`grsdssdxmmc`（所得项目）、`ywlxDm`、`kjywrMc`（扣缴义务人）、`sre`（收入，formatMoney）、`ybtse`（已报税额）、`skssqq/skssqz`（所属期 YYYY-MM，代码自动拼接）。

**完税证明列表项字段**（模板实证）：`sdxm`（项目标题）、`skssqq/skssqz`、`sjtse`（金额）、`skssjg`（税务机关）、`sz`（税种）、`ypzh`（原凭证号）、`sbrq`（申报日期）、`hsqj`、`wszmztDm`。

## ⚠️ 响应协议（v1 踩坑后确认，必须遵守）

**官方业务响应体 = `{code: 'SUCCESS', data: <业务数据>}`**（axios 克隆响应拦截器解包 `res.data.data`，iOS 分支断言 `'SUCCESS' === data.code`）。
- 缺 `code` → 拦截器判业务失败，reject `{msg:'很抱歉，系统正在努力恢复…'}`（曾导致 switch/pop/banner 全部静默失败——App 内几乎每个业务接口都走该校验）
- `data` 是业务数据本体（对象/字符串均可，如 theme 返回 `data:"NORMAL"`）
- 所有 fixtures 已改为该结构；新 fixture 一律照此

## ⚠️ mock 登录态（无验证方案，已实现）

官方 `initDeviceReady`（deviceready 时）**无条件清除 authToken**（防过期）→ 预置注入无效。
方案：`web/overlays/cordova.js` 触发 deviceready 事件后立即补写 `authToken`（时序在官方清除之后）→ 路由守卫放行，登录后页面可进（实证：`/IncomeTaxPayment/*`、`/taxProof/*`、`/zdj-profile` 均可直达）。
`web/overlays/mock-login.js`：等 Vuex 就绪后 commit `@USER/SET_BASE_INFO`（config.userInfo+logined=true）+ 注入 `state.userInfo.userInfoObj`（我的页读 xm/nsrsbh）+ `nsrsbhNoHide`。★ 实证：我的页显示「张伟 / 纳税人识别号 110101199001011234」+ 9 项完整菜单。

## ✅ 菜单链路（/mportal/common/menu/config，已打通）

- 返回 `[{csDm, csnr}]`，页面按 csnr 动态加载脚本，脚本执行后注册全局 `ETAX_MENU_INDEX/TAX/PERSONAL/BA`（数组，元素 `{data:{page:{pdDm,moduleList,mkPz}}}`），再 commit homeMenuList。
- **失败**（miss）→ fallback 静态菜单，但**触发全局错误 toast**；**成功空数组** → 菜单全空。
- **正解（已实现）**：`fixtures/reference/menu-config.json` mock 返回指向本地 `static/menu-shim.js`；shim 由官方默认菜单运行时 dump（`@HOME/GET_DEFAULT_HOME_MENU` → `diffs/home-default-menu.json`）生成，**菜单 = 官方静态菜单原文，且无 toast**。★ 实证：4 个主页面 miss=0。

## ⚠️ 替代版（仿照版）已彻底评估并归档

- 位置：`reference/alternate-web/`（121 文件，含 README 结论）。服务器实为在线（`175.24.180.44:8080/8081/8082`），但**要 UA+Referer 门禁**，试用版 8082 免卡密。
- 形态：自绘 HTML+SVG + **官方界面截图切图 jpg**，数据死/自建 PHP 后端，无官方结构、无业务逻辑 → **不可缝合、字段不兼容、无加速价值**，仅作官方截图缺失时的替代视觉参考。
- 官方前端 CDN 已全量在本地（`reference/cdn-www` 1587 文件），无需重爬；仅在官方发新版时才需重新镜像 CDN（分钟级）。

## 待补充 mock（访问对应页面时从 stub miss 日志收集）

| API | 页面 | UI 用途 | 建议 | 备注 |
|---|---|---|---|---|
| `/zrr/jbxx/query` | 我的/个人信息 | 个人基本信息 | mock（/dev 编辑铺路） | ★ 已探到 |
| `/common/srf/getToken` | 登录/实名 | 获取 token | mock 或随登录 | ★ 已探到 |
| `/zrr/sddq/query` | 我的 | 所地起？ | 待定 | ★ 已探到 |
| `/zrr/sqbs/bsqx/query` | 我的 | 申报期/办税期限 | 待定 | ★ 已探到 |
| `/zh/swrysf/query` | 我的 | 税务人员身份 | 待定 | ★ 已探到 |
| `/commonbusiness/event/query` | 我的 | 事件列表 | 待定 | ★ 已探到 |
| `/mportal/common/menu/config` | 我的/首页/办&查 | 菜单配置（`{csDm,csnr 脚本URL}`） | ✅ **mock 指向本地 `static/menu-shim.js`**（官方默认菜单 dump 生成） | ★ 实证：菜单完整 + 无 toast；shim 见 fixtures/reference/menu-shim.js |
| 收入明细：`/IncomeTaxPayment/taxRecordDetail`（cxNsmxDetail/cxNsmxXq） | 明细详情 | 单条明细 | mock | 点列表项后收集 |
| 消息列表接口 | 消息页 | 消息列表 | mock | 进入 /zdj-message 后从 stub 日志收集 |
| `/commonbusiness/tzgg/lamp/list/query` | 首页 | 通知公告轮播 `getNotificationBannerList` | 待定 | 与 appdist/query 的区别待页面实测 |
| `@HOME/FETCH_USER_CONFIG` | 首页/我的 | 用户信息（姓名/税号） | mock 用户（source:mock） | URL 待探针补 |
| `queryTaskUnReadNum` / `queryMessageCount` | tab 徽标 | 待办/消息未读数 | mock 0 | 路径待探针补 |
| `/commonbusiness/tzgg/query` | 通知公告页 | 公告列表 | mock 列表 | 结构待探针 |
| `/commonbusiness/cjwt/*` | 常见问题 | 问答列表 | mock | 结构待探针 |
| `/zh/register/rsa/gy/query` `/common/captcha/base64Image` 等 | 登录页 | RSA 公钥/验证码图 | mock（任意输入成功） | 登录交互待做 |
| 消息 tab / 我的 tab | 消息/我的 | 列表/用户信息 | mock | fixtures/custom 占位 |
| serverRegion（城市切换） | 全局 | 城市名称 | localStorage 缺省→默认 | `getCityName` 读 `serverRegion` |
| `/common/flow/bypass` | 启动 | 域名绕过 | 暂不 mock（失败=空，链路不依赖） | — |

## 不 mock（失败即安全默认）

- `/common/flow/bypass`：失败 → 空配置 → 无影响（实证：启动链不依赖）
- switch 内遥测开关（emas/metrics/newLog）：全部 N → yata/埋点不激活（配合 O3 双保险）

## 关键发现（影响后续工作）

1. **响应格式**：`cordova.plugins.http.sendRequest` 成功回调必须是 advanced-http 标准：`{status, url, headers:{'content-type':'application/json'}, data: <JSON 字符串>}`。MK5j 包装层（`_$V`）在 content-type 含 `application/json` 时会对 `data` **JSON.parse**——传对象会抛错，必须传字符串。★已按此实现。
2. **banner 图回退机制**：`@HOME/BANNER_CONFIG_LIST` 只在新 Image onload 成功才替换 `swiperList`；本地图路径 → 必然 onload 成功 → 稳定渲染。这是官方自带的"图加载失败则保留本地默认"逻辑，天然适配离线。
3. **启动链路（首页）**：deviceready → `@GLOBAL/BUSSNESS_SWITCH_STATUS`（switch/query）→ 首页 mount → queryHomePageInfo（→pop/find、菜单）→ `$emit('unlock-complete')` → `clickTabItemHandler` → theme/query → `updateHomeBanner` → `$refs.homeRefs.getBannerList` → appdist/query。任一环失败则后续被 catch 吞掉（当前实证止于 unlock 后，theme/appdist 未发——待继续补 mock 或走 store 直接注入）。
4. **首启引导浮层**（查看更多/跳过）：首次进入出现；`localStorage.guideList` 持久化。视觉回归截图需先跳过或预置 guideList。
5. **`#app` 挂载判定**：Vue 挂载后 `#app` 被替换为 `.app-container`——验证脚本用 `.app-container` 而非 `#app`。

## 待办（下一轮）

- [x] 帮助中心全链路（helpMenu/secondlevel/details，fixtures: help-center/help-detail）★ miss=0
- [x] 留言咨询（taxService，fixtures: tax-service）★ miss=0
- [x] 首启协议弹窗「同意」处理 + dev 误触修复（sweep/verify 内置）
- [x] 路由清单 dump（714 条，__probe/list_routes.js）；15 入口批量巡检 → 全局共享接口表（见 HANDOVER §11.2）
- [ ] **全局共享接口 fixture**（zxfjkc×2/grylj×2/basecode SB_NEW/发票 brtt+fpxq/fhbxzctz/ssjm/sq + 尾项）— P0，待写（类型数组/对象见 HANDOVER §11.2 表）
- [ ] 20 菜单入口闭环验收（不白屏/无 toast）
- [ ] 收入明细详情页（taxRecordDetail）探针 → cxNsmxDetail mock
- [ ] 完税证明记录展开/转开（pzList）探针
- [ ] 消息 tab / 我的 tab 探针 → 补 user/messages/user-config mock 路径
- [ ] 首页 zty 专题区（ztyVOS）参考官方截图后填充
- [ ] 首页 banner 端到端点亮（theme/appdist UI 触发链）
- [ ] 登录页 mock（任意输入成功）
- [ ] tab 徽标：POST zrr/task/unRead/query + GET zrr/message/v2/wdxxsl/query（首页/办&查 miss=2）
- [ ] 完税证明记录展开/转开（pzList）探针
- [ ] 消息 tab / 我的 tab 探针 → 补 user/messages/user-config mock 路径
- [ ] 首页 zty 专题区（ztyVOS）参考官方截图后填充
- [ ] 首页 banner 端到端点亮（theme/appdist UI 触发链）
- [ ] 登录页 mock（任意输入成功）