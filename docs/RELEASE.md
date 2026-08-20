# IPA 发布（必读：首页高保真资源）

> [!CAUTION]
> 首页年度汇算卡和 6 张宣传图不在 Git checkout 中。它们由固定 Release `home-assets-v1` 提供。缺失或哈希错误时，构建必须失败；绝不能发布缺图 IPA。

## 正常发布

本项目不需要手工创建 tag 或 Release。提交并 push `main` 后，`.github/workflows/build-ios.yml` 会自动：

1. 下载 `cdn-www-v1/cdn-www.zip` 官方 Web 基线。
2. 下载 `home-assets-v1/home-assets-v1.zip`，解压到 `web/fixtures/private/home/`。
3. 用 `home-assets-manifest.json` 校验 7 张源图片的 SHA-256。
4. 执行 `web/build.sh`；脚本复制图片后再次校验 `web/www/static/images/`。
5. 构建 IPA，并第三次校验 IPA 内的 7 张图片。
6. 只有以上步骤全部通过，才上传 artifact 并创建 `etax-sim-rN` Release。

正常命令：

```bash
git status --short
git diff --check
git add <本轮文件>
git commit -m "说明本轮改动"
git push origin main
gh run list -R xzh911/IIT --workflow build-ios.yml --limit 3
gh run watch <RUN_ID> -R xzh911/IIT --exit-status
```

## 发布成功标准

Actions 日志必须同时出现：

```text
HOME ASSET VERIFY PASS: 7 assets
```

该信息应出现三次：下载后、Web 构建复制后、IPA 打包后。

也可以下载 IPA 后人工复核：

```bash
python3 tools/verify-home-assets.py --ipa etax-sim.ipa
```

## 资源包内容

- `home-annual-card-full.png`
- `home-promo-01.png`
- `home-promo-02.png`
- `home-promo-03.png`
- `home-promo-04.png`
- `home-promo-05.png`
- `home-promo-06.png`

唯一哈希来源是 `web/fixtures/reference/home-assets-manifest.json`。资源包不包含原始截图、HAR、IPA 或 APK。

## 更新首页图片

不要静默覆盖 `home-assets-v1`。需要更换图片时：

1. 更新本地 `web/fixtures/private/home/` 中对应裁图。
2. 更新 `home-assets-manifest.json` 的来源、尺寸和 SHA-256。
3. 新建不可变资源包和 Release，例如 `home-assets-v2`。
4. 同步 workflow 的下载 tag/文件名。
5. 本地运行 `bash web/build.sh` 和 IPA 校验。

这种版本化方式可避免同一个 tag 的内容变化导致旧 commit 无法复现。
