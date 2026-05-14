Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '时间表',
        iconPath: '/assets/icons/calendar.png',
        selectedIconPath: '/assets/icons/calendar-active.png'
      },
      {
        pagePath: '/pages/subscribe/subscribe',
        text: '订阅',
        iconPath: '/assets/icons/subscribe.png',
        selectedIconPath: '/assets/icons/subscribe-active.png'
      }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.list[index];
      wx.switchTab({
        url: item.pagePath
      });
    }
  }
});
