# 连接 Apple Music（第五轮）

记录情绪时，点「从 Apple Music 最近播放里选」，会列出最近播放的前 3 首，由你点选确认。
没有配置令牌、令牌过期或连接失败时，这个入口会自动隐藏或提示，退回手动输入，不影响记录。

## 需要准备

- 一个 Apple Developer Program 账号（付费会员）。
- 一台你自己的电脑，装有 Node.js 18 或更高版本。

## 第一步：在开发者后台创建 MusicKit 密钥

1. 登录 <https://developer.apple.com/account>，进入 **Certificates, Identifiers & Profiles → Identifiers**，
   点 **+**，选 **Media IDs**，随便起个名字（例如 `mindcare`），勾选 **MusicKit**，保存。
2. 进入 **Keys**，点 **+**，起个名字，勾选 **Media Services (MusicKit, ShazamKit, Apple Music Feed)**，
   点 Configure 选上一步的 Media ID，保存。
3. 下载密钥文件 `AuthKey_XXXXXXXXXX.p8`（**只能下载一次**，请妥善保存，不要发给任何人），
   记下页面上的 **Key ID**（10 位）。
4. 在账号页面右上角或 **Membership details** 里找到 **Team ID**（10 位）。

## 第二步：在你自己的电脑上生成令牌

在项目根目录运行（私钥只在本机读取，不会上传）：

```bash
node scripts/apple-music-token.mjs --team <Team ID> --key <Key ID> --p8 ~/Downloads/AuthKey_XXXXXXXXXX.p8
```

- 默认有效期 180 天（Apple 允许的最长时间），可以用 `--days 90` 缩短。
- 令牌默认只允许在 `https://mindcare-mood-spark.lovable.app` 上使用；如果网址不同，加上
  `--origin https://你的网址`（多个用英文逗号隔开，本地调试可以加上 `http://localhost:8080`）。
- 终端里输出的那一长串 `eyJ...` 就是令牌。

## 第三步：把令牌放进项目

二选一：

- **推荐**：在 Lovable 的项目设置里添加环境变量 `VITE_APPLE_MUSIC_TOKEN`，值为上一步的令牌。
- 或者：打开 `src/lib/apple-music.ts`，把令牌粘贴到 `PASTED_TOKEN = ""` 的引号里，然后发布。

令牌会出现在网页代码里，这是 MusicKit 的设计（所有网页版 Apple Music 应用都是这样），
所以生成时限定了网址。**私钥 .p8 文件绝对不要放进项目。**

## 第四步：验收

1. 在 Lovable 点 Publish，用无痕窗口打开网站。
2. 首页选一个情绪，在「此刻在听什么？」下面点「从 Apple Music 最近播放里选」。
3. 第一次会弹出 Apple 账号登录和授权；授权后应该看到最近播放的 3 首歌。
4. 点一首确认，保存记录，到「情绪日记」里能看到这首歌。

## 过期之后

180 天后令牌过期，入口会自动隐藏，记录照常可以手动输入歌名。重新执行第二步、第三步即可。
可以在日历里提前一周提醒自己。
