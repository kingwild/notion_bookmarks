# KING 工作基地部署与配置

这是含服务端 API 的 Next.js 应用，不能只上传静态 HTML。构建 `pnpm build`，生产启动 `pnpm start`；Node.js 22 或 24，pnpm 10。

## 腾讯云 EdgeOne Pages

1. 在腾讯云注册并登录，打开 EdgeOne Pages，导入 `kingwild/notion_bookmarks`。
2. 框架选 Next.js，根目录 `/`，安装 `pnpm install --frozen-lockfile`，构建 `pnpm build`。让平台自动识别全栈应用，不选择静态导出。
3. 从现有 Vercel 项目复制四个 `NOTION_*` 服务端环境变量；不得添加 `NEXT_PUBLIC_` 前缀。不得把 `.env.local` 上传仓库。
4. 选择区域和域名后预览，验证首页、Notion 任务、访客留言和站主登录。需要服务端实际测试 `api.notion.com` 可达性。
5. 检查免费套餐额度并禁用自动付费升级。绑定域名、HTTPS 后，再将该地址用作主站。

截至 2026-09-20 核查，Pages 文档列出免费套餐，但默认域名并非适合国内长期访问的免费域名：大陆可用区预览链接有效 3 小时；不含大陆的全球区默认域名对大陆网络返回 401。自定义域名需单独取得；大陆或含大陆区域需备案，不含大陆区域自定义域名不要求备案。实际可用性要在国内网络验证。本站依赖 Notion，换托管平台不保证 Notion API 在所有区域都稳定。

官方说明：[套餐](https://edgeone.cloud.tencent.com/pages/document/162936949996421120)、[域名与地域](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)、[Next.js 支持](https://edgeone.cloud.tencent.com/pages/document/162936998387830784)。

## 站主与同步

站主管理使用 12 小时 HttpOnly/SameSite=Strict 签名 Cookie，生产 HTTPS 下使用 Secure。Notion 配置库仅存管理口令的随机盐 scrypt 哈希 `OWNER_PASSWORD_HASH`，不存明文；Cookie 签名密钥来自服务端私有 `NOTES_WRITE_KEY`。哈希变更会让现有会话失效。首次口令由本地初始化生成并单独交给站主，不上传 GitHub。

配置库 `WORKSPACE_STOCKS` 保存 1–10 个自选股票；链接库 `精选` 为 checkbox。所有访客可读取，修改接口必须通过站主身份与同源检查。股票保存会比较读到的修改时间，旧版本会提示刷新；Notion 不支持原子 compare-and-swap，两个设备同时写入仍以最后一次为准。避免同时编辑。

## 随手记

公开访客留言维持原有入口。登录后出现“我的随手记”；先 AI 预览或手动整理，再逐条确认写入现有任务、想法、支出、收入库。必须把这四个库连接至 `KING导航`，并有文本字段 `KING记录ID`。收支以人民币记录，账户、类别、月份关系需要在 Notion 补充。

确认保存时，未保存条目顺序写入，已保存条目锁定，失败保留草稿和记录 ID。重试先查已有记录；Notion 本身没有唯一约束或事务，多个服务实例同时提交同一条的极端竞态无法保证 exactly-once，请勿多端同时保存同一份草稿。

AI 需要自行选择供应商并设置 `.env.example` 中的三个 `AI_*` 变量，服务端调用兼容 chat/completions 的 HTTPS 接口。不配置时明确显示待接入，手动整理仍可用。不要用网页对话把密钥传给访客。

EdgeOne 的 [边缘 AI](https://edgeone.cloud.tencent.com/pages/document/169925463311781888) 是限时免费 Beta，文档中部分 DeepSeek 模型每日 20 或 50 次；它的 `AI.chatCompletions` 属于 Edge Functions 运行时，不能直接冒充本 Next.js Node 服务的环境变量。若选该方案，需要新增受保护的边缘函数适配并实测，再启用。未开通模型前不能宣称 AI 已可用。

## 新闻与访问

榜单最多 50 条，每 5 分钟刷新；上游少于 50 条时按实际数量显示。吾爱破解使用公开热门页并解码 GBK。小红书公开接口当前拒绝访问，显示不可用及原站入口；不绕过登录、签名或验证码。后续有获授权的数据服务才替换适配器。

点击词条显示不超过 100 字的源站概况及原文入口。只有取得实际公开简介/正文时才提供概况；没有资料时明确提示。AI 总结为可选项，默认关闭。摘要接口只接受当前榜单中的链接，并为正文抓取限制源站、路径、重定向和响应大小。

公共 AI API 启用前需在供应商控制台设置额度上限。本站内存缓存和登录限频以实例为单位，不能代替供应商的全局费用限制。
