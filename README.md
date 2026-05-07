# 新番更新时间表小程序

一个帮助动漫爱好者追踪新番动画更新时间、管理追番列表和观看进度的小程序。

## 功能特性

### 📅 周表视图
- 按周展示每天的新番播出时间表
- 清晰显示番剧名称、播出时间、播出平台、当前集数
- 自动标记今日更新的番剧
- 支持快速订阅操作

### 📚 新番总览
- 网格/列表两种视图切换
- 按类型筛选（热血、恋爱、喜剧、科幻等）
- 搜索番剧名称
- 展示所有当前季度新番

### ⭐ 追番订阅
- 一键订阅/取消订阅番剧
- 订阅列表管理
- 一键订阅今日更新番剧
- 统计数据面板

### 📈 追番进度
- 跟踪观看进度
- 多种状态管理（想看、在看、已看完、搁置、弃番）
- 进度百分比展示
- 快速调整集数

## 页面结构

```
├── pages/
│   ├── index/          # 首页 - 周表视图
│   ├── overview/        # 新番总览
│   ├── subscribe/       # 订阅管理
│   ├── progress/        # 追番进度
│   └── anime-detail/    # 番剧详情
├── utils/              # 工具函数
├── assets/             # 静态资源
└── app.js              # 应用入口
```

## 技术栈

- 微信小程序原生框架
- WXML + WXSS + JavaScript
- 本地数据存储

## 快速开始

### 1. 安装依赖

本项目使用微信小程序原生开发，无需额外安装依赖。

### 2. 导入项目

1. 下载微信开发者工具
2. 新建项目，选择本项目目录
3. 填入 AppID（或使用测试号）
4. 即可在模拟器中预览

### 3. 数据说明

目前使用模拟数据进行开发演示。数据结构定义清晰，便于后续对接真实 API。

## 数据结构

### 番剧信息
```javascript
{
  id: String,              // 唯一标识
  name: String,            // 中文名称
  nameJp: String,          // 日文名称
  cover: String,           // 封面图片URL
  platform: String,        // 播出平台
  broadcastDay: Number,    // 播出日（1-7）
  broadcastTime: String,   // 播出时间
  currentEpisode: Number,  // 当前集数
  totalEpisodes: Number,    // 总集数
  genre: Array<String>,    // 类型标签
  status: String,          // 状态
  description: String      // 简介
}
```

## 开发指南

### 添加新番数据

编辑 `utils/animeData.js` 文件中的 `getAllAnime()` 函数添加新的番剧数据。

### 修改样式

- 全局样式：`app.wxss`
- 页面样式：各页面的 `.wxss` 文件
- 组件样式：可在 `assets/components/` 下创建组件

### 本地存储

使用 `utils/storage.js` 中的工具函数管理数据：
- `addSubscription(id)` - 添加订阅
- `removeSubscription(id)` - 移除订阅
- `updateProgress(id, data)` - 更新进度
- `getUserSettings()` - 获取设置

## 功能开发进度

- [x] 项目结构初始化
- [x] 配置文件创建
- [x] TabBar 导航设置
- [x] 页面骨架搭建
- [x] 周表视图开发
- [x] 新番总览开发
- [x] 订阅功能开发
- [x] 进度管理开发
- [x] 详情页开发
- [ ] 数据 API 对接
- [ ] 通知推送功能
- [ ] 用户反馈系统

## 注意事项

1. 图片资源建议使用云存储或压缩处理
2. 注意小程序包大小限制（主包不超过 2M）
3. 考虑无网络情况下的离线数据展示
4. 建议使用小程序云开发进行数据存储

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
