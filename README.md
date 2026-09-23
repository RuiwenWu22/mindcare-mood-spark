# MindSpace Journal

请帮我创建一个可以直接在线访问的完整 Web App：

项目名称：

MindCare｜情绪日记与自我关怀

产品定位：

这是一个面向年轻人的轻量级情绪记录与自我关怀 Web App。

核心目标不是心理诊断，而是帮助用户：

1. 快速记录当下情绪

2. 回顾近期情绪变化

3. 发现可能的情绪触发因素

4. 获得低门槛、非医疗性的自我调节建议

请优先完成一个“面试可直接展示”的高质量 MVP，不要只做一个简单表单。

【整体视觉】

- 温暖、治愈、现代、简洁

- 主色使用柔和的米白、浅绿色、淡紫色

- 大量留白

- 圆角卡片

- 微妙阴影

- 不要医疗网站风格

- 不要过度儿童化

- 移动端和桌面端都要适配

- 中文界面

- 页面整体要有高级感和产品感

【页面结构】

一、首页 Dashboard

顶部：

MindCare

一句话：

“今天，也给自己一点空间。”

显示：

- 今日情绪

- 本周记录次数

- 最近一次记录

核心区域：

“你现在感觉怎么样？”

提供情绪按钮：

😊 开心

😌 平静

🙂 还不错

😐 一般

😟 焦虑

😔 难过

😤 烦躁

😫 压力很大

选择情绪后可以选择：

情绪强度 1–10

然后输入：

“发生了什么？写下此刻的感受……”

支持多行文本。

按钮：

“保存今天的情绪”

二、情绪日记页面

显示历史记录卡片。

每条记录包含：

- 日期

- 情绪

- 情绪强度

- 用户文字

- 触发因素标签

- 删除按钮

支持：

- 新建记录

- 查看记录

- 删除记录

示例数据可以预置几条，让第一次打开页面时不是空白。

三、情绪洞察页面

标题：

“了解你的情绪”

展示：

1. 最近 7 天情绪趋势图

2. 高频情绪

例如：

焦虑 35%

平静 30%

压力 20%

开心 15%

3. 可能的触发因素

例如：

学习 / 工作

人际关系

睡眠不足

截止日期

独处

4. 温和的 AI 风格分析

例如：

“最近几次记录中，你的焦虑情绪主要出现在任务集中或截止日期临近的时候。你可以尝试把大型任务拆成更小的步骤，并给自己安排短暂的休息。”

注意：

不要声称这是医学诊断。

使用“可能”“似乎”“从你的记录来看”等措辞。

四、自我关怀页面

标题：

“现在，照顾一下自己”

提供 4 个推荐卡片：

🧘 呼吸练习

“2 分钟慢呼吸”

点击后进入呼吸练习界面：

吸气 4 秒

停留 2 秒

呼气 6 秒

循环计时。

🎵 放松音乐

提供几个虚拟音乐推荐卡片：

Calm Morning

Soft Piano

Rainy Evening

🚶 轻运动

推荐：

散步 10 分钟

肩颈拉伸

简单伸展

🌙 睡前放松

提供：

减少屏幕刺激

深呼吸

写下今天值得感谢的一件事

五、每日自我关怀

增加一个漂亮的每日提示卡：

“你不需要把所有事情都做好，

今天完成一点点，也已经足够。”

按钮：

“换一句”

准备至少 8 条不同的温和提示。

六、导航

桌面端左侧或顶部导航：

首页

情绪日记

情绪洞察

自我关怀

移动端使用底部导航。

【交互要求】

所有按钮都必须可以点击。

情绪记录保存到浏览器 localStorage，

这样刷新页面以后数据仍然存在。

首次打开时提供 3–5 条示例日记，

但用户可以删除。

情绪趋势图根据实际记录动态变化。

删除记录时需要确认。

保存成功后显示漂亮的 Toast：

“今天的情绪已经被好好记录了 🌿”

【AI 分析】

当前 MVP 不需要真正调用外部 AI API。

请使用前端规则模拟“AI 情绪分析”，根据：

- 情绪类型

- 情绪强度

- 日记关键词

- 触发因素

生成自然语言分析。

代码结构要方便未来接入 OpenAI API。

【重要的产品体验】

第一次进入网站时，用户应该在 5 秒内知道：

这是干什么的；

在哪里记录情绪；

在哪里查看自己的变化。

不要出现大量技术说明。

不要出现：

“这是一个 AI Demo”

“Lorem ipsum”

“Coming soon”

【隐私提示】

在页面底部增加：

“MindCare 是自我关怀工具，不提供医学诊断或心理治疗。如果你正处于危机或有伤害自己的想法，请及时联系当地紧急服务或专业支持。”

【部署要求】

请把项目做成完整可运行的 Web App。

确保：

- 没有明显报错

- 所有页面可以正常打开

- 所有按钮基本可交互

- 桌面端正常

- 手机端正常

- 数据刷新后仍然保存

完成后准备发布到公开 URL。

我需要后续继续编辑这个项目，因此请保持项目可以在当前 Lovable workspace 中继续修改。

不要创建一次性临时页面。

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mindcare-mood-spark.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/36da5eed-5888-4eae-bbd5-d20bbb6d9a30).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
