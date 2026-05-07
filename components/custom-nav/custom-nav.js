Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    bgColor: {
      type: String,
      value: '#4A90D9'
    },
    textColor: {
      type: String,
      value: '#ffffff'
    }
  },
  data: {
    statusBarHeight: 0,
    navHeight: 44,
    totalNavHeight: 0
  },
  lifetimes: {
    attached() {
      const sysInfo = wx.getSystemInfoSync();
      const statusBarHeight = sysInfo.statusBarHeight || 20;
      // 获取胶囊按钮位置信息来计算导航栏高度
      let navHeight = 44;
      try {
        const menuBtnInfo = wx.getMenuButtonBoundingClientRect();
        navHeight = (menuBtnInfo.top - statusBarHeight) * 2 + menuBtnInfo.height;
      } catch (e) {}
      this.setData({
        statusBarHeight,
        navHeight,
        totalNavHeight: statusBarHeight + navHeight
      });
    }
  },
  methods: {
    onBack() {
      wx.navigateBack({ delta: 1 });
    },
    onHome() {
      wx.switchTab({ url: '/pages/index/index' });
    }
  }
});
