# Heartsy Support

Heartsy 的公开法务与支持页，供 App Store 隐私政策、用户协议和支持链接使用。

- 首页：https://codelsyou.github.io/heartsy-support/
- 隐私政策：https://codelsyou.github.io/heartsy-support/privacy.html
- 用户协议：https://codelsyou.github.io/heartsy-support/terms.html
- 支持：https://codelsyou.github.io/heartsy-support/support.html
- 支持邮箱：support@heartsyapp.com

纯静态页面，无构建步骤。英文为这些文件的准据语言。

## 协议多语言

隐私政策和用户协议支持 `en`、`de`、`es`、`fr`、`pt-BR`，正文、目录和导航一同切换。App 使用 `?lang=fr` 等参数传入当前语言；页面正文上方也提供语言选择器。

- URL 的 `lang` 优先于网页保存的语言，因此从 App 重新打开时跟随 App。
- 没有 `lang` 时使用网页上次选择或浏览器语言；不支持的语言回退英文。`fr-FR`、`de_DE`、`pt` 等区域写法归一到已支持的语言。
- 手动切换会更新当前 URL 并保留其他查询参数和锚点；在两个协议之间跳转保留语言。网页选择不修改 App 的语言设置。
- 译文位于 `locales/*.json`，`messages` 数组下标对应 HTML 的 `data-i18n="mN"`。各语言保留相同下标，英文正文也保留在 HTML 中作为无 JavaScript 时的完整版本。
- 语言文件加载失败时保留当前完整版本，选择器回到实际显示的语言；禁用浏览器存储不影响切换。首页与 Support 页仍为英文。
- 手机宽度下 Privacy、Terms、Support 隐藏网页顶部品牌导航栏和渐变细线；协议语言选择器仍显示在正文上方，桌面导航保留。

运行 `node --test test/legal-language.test.cjs` 验证译文完整性、URL 优先级、跨页语言、存储失败和连续切换。

## 本地预览

```sh
cd heartsy-support
python3 -m http.server 8765
```

打开 http://127.0.0.1:8765/

## 部署

推送到 `main` 后，GitHub Actions 会发布 GitHub Pages。若首次 Actions 失败，在仓库 Settings → Pages 将 Source 设为 GitHub Actions，再重新运行工作流。
