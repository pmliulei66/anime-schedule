App({
  onLaunch() {
    // 小程序初始化
    console.log('新番时间表小程序启动');
  },
  globalData: {
    // 订阅的番剧列表
    subscribedAnime: [],
    // 追番进度数据
    animeProgress: {},
    // 当前季度新番数据
    currentSeasonAnime: [],
    // 用户设置
    userSettings: {
      notificationEnabled: true,
      defaultView: 'week'
    }
  }
})
