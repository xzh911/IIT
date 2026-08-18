# IIT 复刻项目 — 成本敏感型工作规则

本项目 = 官方「个人所得税」App 高保真复刻（混淆 Vue2 bundle + Cordova mock + fixture）。
优先级：正确完成 > 减少重复上下文 > 减少无效推理 > 多用 subagent > 确定性验证 > 控制输出。
保真与证据规则见 `.kilo/rules/replica-project.md`（本文件只讲成本纪律，两者不冲突）。

## 0. 会话开局（每次必做）
1. 读 `docs/STATE.md`（唯一短状态文件）。需要更多细节再按需读 `docs/HANDOVER.md` 对应段落。
2. 不重复读取 STATE.md 已记录的事实。
3. 给请求定性：只读探索 → 考虑派发；单页修复 → 派发或自己做；验证 → targeted。

## 1. 反复推理熔断（最重要）
对混淆代码的字段/变量/调用关系：**连续两次推理仍不确定 → 立即改用确定性手段**，禁止第三次脑内猜测：
精确 grep（限文件/限数量）、`node -e`、`__probe/` 脚本、`tools/api-fields.js <接口路径>`、`packetSniffing/*.har`、WebKit 运行时验证。
机器几秒能证明的事实，不许模型花几十轮猜。未确认就如实写"未确认"，不猜。

## 2. 调查停止条件（防局部沉迷，与 §1 同等重要）
- 任何调查/报错处理开始前先分类：**这个问题阻塞当前交付吗？** 不阻塞 → 记录为已知问题，最多 2 次确认后停止，继续主任务。
- 连续 5 次工具调用仍未收敛 → 强制重估：继续查是否仍为交付所必需？否 → 记录结果与未决项，停止。
- 验证有完成标准：已有 CLI/运行时级证据（如 `kilo config check`、`kilo agent list`、headless run 正常应答）即视为通过，不再向下追实现细节。
- 禁止以"响应了工具报错"代替任务推进：validator/工具自身的误报不修，除非阻塞交付。

## 3. Subagent 使用（强制）
预计**超过 5 次工具调用**才能完成的探索、或只需局部上下文的问题 → 用 `task` 派发：
- `bundle-investigator`：只读调查（混淆 bundle、接口↔消费 chunk、字段映射、调用链）
- `fixture-fixer`：单页/单接口 mock 修复 + targeted 验证
主 Agent 只做：切分任务、派发、按返回事实决策、收尾验证。**禁止把所有探索自己做到底**。
简单单文件修改、单次 grep 可定论的事实：自己做，不派发（不为用而用）。
给 subagent 单一目标 + 明确返回格式；subagent 只回短事实，不回过程/大段代码。

## 4. 工具输出纪律
- 禁止整读大 bundle（app.js 等）；先 grep 定位，再只读命中区段
- grep 必须限范围/限数量（`--include=*.js -l`、`head -20`、限定目录）
- 禁止直接 grep/strings 单行极长文件（minified JS、编译产物、binary）；先 `wc -c`/`head -c` 取样，命中行重定向到文件再处理
- 不输出完整 build log / sweep log；错误只截错误附近
- 全量 build/sweep 只在里程碑验收；日常只做 targeted 验证（`wk web/dev/verify.js <名> 15`）

## 5. 状态持久化
- 里程碑/会话结束：更新 `docs/STATE.md`（保持 ≤50 行），或运行 `/checkpoint`
- 禁止把完整会话历史写进 STATE.md；细节留给 docs/ 报告

## 6. 常用命令（工作目录 = 项目根）
```bash
bash web/build.sh                    # 重建 web/www
wk web/dev/verify.js <名> 15         # 容器 WebKit 单页验证（targeted）
wk web/dev/sweep.js /路由 12         # 批量巡检（仅里程碑）
node tools/api-fields.js <接口路径>   # 混淆代码字段提取
# 8088 静态服务：background_process 启动 bash web/dev/serve.sh 8088（会话间会挂）
```
全程不 commit/push（用户推进中）。

## 7. 反混淆优先级与工具（2026-08-18 加入，实证结论）
- **永远不先读混淆代码**。定位接口/字段的顺序：
  1. 找 source map：`grep sourceMappingURL` / `find *.map`（本 bundle 实证：无真实 map，那串 `data:...base64,` 是反调试诱饵）
  2. `bash tools/deob-export.sh`：webcrack 拆 app.js+chunks 成模块树（若已建，直接 `rg` 树内），字符串值/中文 desc 可读
  3. 字符串表物化：物化脚本把模块顶部 `var _$X={K:"V"}` + `_$X.K` 引用还原成字面量
  4. REstringer：已实证对本 bundle 无效（webcrack 报 String Array: no，非 obfuscator.io 模式），勿装
- 调查锚点（定论）：接口路径 → API 模块中文 desc → 消费 chunk 方法名 → `.then` 回调字段读取。禁止整读 app.js
