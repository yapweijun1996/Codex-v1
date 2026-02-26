# 🚀 部署指南 (Deployment)

## 1. 服务器版 (Node.js)

### Vercel / Railway
1. **GitHub 集成**: 直接连接本仓库。
2. **环境变量**: 必须配置 `GOOGLE_API_KEY`。
3. **构建设置**: 使用默认的 `npm start` 即可。

### PM2 (生产环境推荐)
```bash
# 使用生态系统引导
npm install pm2 -g
pm2 start server.js --name agents-js-server
```

---

## 2. 浏览器版 (Static Hosting)

浏览器版是单文件应用，非常适合部署在静态托管平台。

### 构建步骤
在部署前，你必须运行构建脚本以加载所有 Skills：
```bash
npm run build:browser
```
生成的 `browser/standalone-built.html` 即为你的部署目标。

### GitHub Pages
```bash
# 将 browser 目录推送到 gh-pages 分支
git subtree push --prefix browser origin gh-pages
```

### 静态托管 (Netlify / Cloudflare Pages)
将 `browser/` 目录设置为发布目录，或者直接上传 `standalone-built.html`。
