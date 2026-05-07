// pages/anime-detail/anime-detail.js
const animeData = require('../../utils/animeData.js');

Page({
  data: {
    animeId: '',
    anime: {},
    isSubscribed: false,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ animeId: options.id });
      this.loadAnimeDetail();
    }
  },

  // 从 Bangumi API 加载番剧详情
  loadAnimeDetail() {
    this.setData({ loading: true });

    animeData.getAnimeById(this.data.animeId).then(anime => {
      if (!anime) {
        wx.showToast({ title: '番剧不存在', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      // 检查订阅状态
      const subscribedIds = wx.getStorageSync('subscribedIds') || [];
      const isSubscribed = subscribedIds.includes(this.data.animeId);

      this.setData({
        anime: {
          ...anime,
          statusText: this.getAnimeStatusText(anime.status)
        },
        isSubscribed: isSubscribed,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  getAnimeStatusText(status) {
    const textMap = { 'airing': '播出中', 'finished': '已完结', 'upcoming': '即将播出' };
    return textMap[status] || '未知';
  },

  // 切换订阅
  toggleSubscribe() {
    let subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const index = subscribedIds.indexOf(this.data.animeId);

    if (index > -1) {
      subscribedIds.splice(index, 1);
      wx.showToast({ title: '已取消订阅', icon: 'success' });
    } else {
      subscribedIds.push(this.data.animeId);
      wx.showToast({ title: '订阅成功', icon: 'success' });
    }

    wx.setStorageSync('subscribedIds', subscribedIds);
    this.setData({
      isSubscribed: subscribedIds.includes(this.data.animeId)
    });
  }
});
