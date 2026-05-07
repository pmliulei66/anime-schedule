// pages/subscribe/subscribe.js
const animeData = require('../../utils/animeData.js');

Page({
  data: {
    subscribedAnime: [],
    subscribeCount: 0,
    todayUpdateCount: 0,
    weekUpdateCount: 0,
    loading: true
  },

  onLoad() {
    this.loadSubscribedAnime();
  },

  onShow() {
    this.loadSubscribedAnime();
  },

  // 加载订阅的番剧
  loadSubscribedAnime() {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    
    if (subscribedIds.length === 0) {
      this.setData({
        subscribedAnime: [],
        subscribeCount: 0,
        todayUpdateCount: 0,
        weekUpdateCount: 0,
        loading: false
      });
      return;
    }

    this.setData({ loading: true });

    // 从 API 获取所有番剧，然后筛选已订阅的
    animeData.getAllAnime().then(allAnime => {
      const subscribedAnime = allAnime.filter(anime => subscribedIds.includes(anime.id));

      const today = new Date().getDay() || 7;
      const todayUpdateCount = subscribedAnime.filter(anime => anime.broadcastDay == today).length;

      this.setData({
        subscribedAnime: subscribedAnime,
        subscribeCount: subscribedIds.length,
        todayUpdateCount: todayUpdateCount,
        weekUpdateCount: subscribedAnime.length,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  // 跳转详情页
  goToDetail(e) {
    const animeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/anime-detail/anime-detail?id=${animeId}`
    });
  },

  // 取消订阅
  unsubscribe(e) {
    const animeId = e.currentTarget.dataset.id;
    let subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const index = subscribedIds.indexOf(animeId);

    if (index > -1) {
      subscribedIds.splice(index, 1);
      wx.setStorageSync('subscribedIds', subscribedIds);
      wx.showToast({ title: '已取消订阅', icon: 'success' });
      this.loadSubscribedAnime();
    }
  },

  // 跳转到时间表
  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
