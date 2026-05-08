App({
  onLaunch() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d4gi9xxyh1083759b',
        traceUser: true
      });
    }
    console.log('新番时间表小程序启动');
  },
  globalData: {
    subscribedAnime: [],
    userSettings: {
      notificationEnabled: true,
      defaultView: 'week'
    }
  }
})
