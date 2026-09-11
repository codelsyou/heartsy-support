# Heartsy Support

Heartsy 的公开法务与支持页，供 App Store 隐私政策、用户协议和支持链接使用。

- 首页：https://codelsyou.github.io/heartsy-support/
- 隐私政策：https://codelsyou.github.io/heartsy-support/privacy.html
- 用户协议：https://codelsyou.github.io/heartsy-support/terms.html
- 支持：https://codelsyou.github.io/heartsy-support/support.html
- 支持邮箱：support@heartsyapp.com

纯静态页面，无构建步骤。英文为这些文件的准据语言。

## 本地预览

```sh
cd heartsy-support
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765/

## 部署

推送到 `main` 后，GitHub Actions 会发布 GitHub Pages。若首次 Actions 失败，在仓库 Settings → Pages 将 Source 设为 GitHub Actions，再重新运行工作流。
