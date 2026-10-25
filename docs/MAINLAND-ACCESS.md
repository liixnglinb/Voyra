# 未备案站点的访问优化

用户明确无法 ICP 备案。正式域名继续使用 `https://lxlrwxs.top`，不采用中国大陆节点或要求备案的接入区域。

## 已实现的首页调整

- 提示词库不再在首页空闲时自动下载；仅在指向或聚焦对应站内链接时预热，开启省流量时不预热，直接进入工具页仍正常加载。
- 首页及路由加载动画只引用轻量的模型清单。模型对比页恢复独立分包，16 个模型和显示顺序保持一致。
- Hero 预加载脚本异步执行；脚本网络停滞时，正常页面渲染不等待它。其他工具路由不会下载首页 Hero 图层。
- 页面内容、卡片大小、顺序、配色与动效保持一致，未改动本机/云端的账号或记录键。

本地相同网络/CPU限制下，首轮脚本的 gzip 内容减少约 43KB，约 21%。该数字来自首页加载后的受控观测，不能直接换算成全国访问时间。LCP 的实测差异较小，不能宣称前端减重解决了跨境连接。

## 境外测试版

本机已链接的旧 EdgeOne 项目 `voyra` 实际为 `global` 区域，CLI 部署时的 `--area overseas` 不会更改旧项目区域，不能把它当作免备案的长期接入配置。境外测试使用独立项目 `voyra-overseas`，创建时指定 `overseas` 区域，并在平台元数据中核对；旧项目使用 `preview`；新的独立项目按平台要求先建立一份初始 Production 部署，它只是测试项目的初始版本，不绑定正式域名。部署关闭与当前网站无关的 AI Gateway 自动同步。不会仅凭部署成功就切换正式域名。

`build-tools/prepare-edgeone-preview.mjs` 从构建产物生成独立目录，保留现有安全响应头与重定向规则。静态资源由测试平台提供；分享、OCR、下载元数据和授权等动态路径继续转发到原 Cloudflare Pages 服务 `https://voyra-121.pages.dev`，使用原有数据库，不创建新的空数据库。代理保留身份和 Origin 校验，动态响应禁用共享缓存，分享结果及跳转使用访客当前域名。

首次准备：

```
npm run build
node build-tools/prepare-edgeone-preview.mjs dist output/edgeone-preview-new
```

在该目录运行 `edgeone validate`，然后运行 `edgeone makers deploy . --name voyra-overseas --env production --area overseas --skip-ai-gateway-sync --json` 建立新测试项目的首份部署，后续可改为 Preview。不要部署到原有正式项目的默认 Production 环境或把 `global` 当作无需备案区域；无需备案应使用平台的海外区域。准备脚本不复制旧项目绑定，以免意外覆盖含大陆节点的已有项目。

平台默认项目/部署域名在大陆访问时可能需要短期预览凭据。长期测试应绑定自己的测试子域名并配置平台返回的 CNAME，再分别测电信、联通、移动与常用手机浏览器。境外节点依然包含跨境链路，不保证仅换厂商就一定更快。

## 正式域名切换前

- 先确认测试域名、证书、海外区域和真实三网结果；不能以当前执行环境的单次测速代替。
- 原 Cloudflare Pages 与 D1 保留为动态接口源站，避免分享短链或授权数据变成新空库；Bmob 账号、课表和健康记录继续使用现有服务。
- 保持正式域名和 HTTPS 来源不变，避免浏览器本机记录被隔离到新来源。测试域名的数据空间与正式域名不同，不应拿真实用户数据反复导入。
- 验证原域名下的接口来源校验、管理员访问、原始客户 IP 限流、短链、登录同步和教务助手；测试子域名不会获得仅面向正式域名的权限。
- HTML 保持重验证，带 hash 的资源可以长缓存；账号相关数据和写入接口不能放进公共缓存。
- 保存原 DNS 记录以便回退。只在功能与速度都通过后安排正式入口切换。

## 验证

`node build-tools/verify-homepage-performance.mjs <改动前构建目录> <新构建目录>`：在相同网络限制下比较首页脚本请求、卡片内容/尺寸、提示词和模型页按需加载，验证预加载脚本卡住时首页仍能渲染，工具路由不会下载无关资源。

`npm run test:edgeone:proxy`：验证转发地址固定、请求体和身份头保留、分享链接/跳转来源正确、原接口错误与来源校验保留、动态数据不缓存。

参考：[Cloudflare 全球网络路由](https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/geographic-traffic-routing/)、[EdgeOne Makers 域名与备案区域](https://pages.edgeone.ai/document/domain-overview)、[自定义域名](https://pages.edgeone.ai/document/custom-domain)。
