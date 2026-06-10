// pages/subscribe/subscribe.js
const animeData = require('../../utils/animeData.js');
const userSync = require('../../utils/userSync.js');

const TEMPLATE_ID = 'wEMtAbOoqVZQP1gj5SReCMiTJwvtpReSsmGOugyXslk';

Page({
  data: {
    subscribedAnime: [],
    leftColumn: [],
    rightColumn: [],
    subscribeCount: 0,
    todayUpdateCount: 0,
    weekUpdateCount: 0,
    loading: true,
    notificationEnabled: false
  },

  onLoad() {
    this.loadSettings();
    this.loadSubscribedAnime();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadSettings();
    this.loadSubscribedAnime();
  },

  loadSettings() {
    const settings = wx.getStorageSync('userSettings') || {};
    this.setData({
      notificationEnabled: !!settings.notificationEnabled
    });
  },

  toggleNotification(e) {
    const enabled = e.detail.value;

    if (enabled) {
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          const accepted = res[TEMPLATE_ID] === 'accept';
          this.saveNotificationEnabled(accepted);
          wx.showToast({
            title: accepted ? '已开启推送' : '需要授权才能推送',
            icon: accepted ? 'success' : 'none'
          });
        },
        fail: (err) => {
          console.error('订阅授权失败:', err);
          this.saveNotificationEnabled(false);
          wx.showToast({ title: '授权失败', icon: 'none' });
        }
      });
    } else {
      this.saveNotificationEnabled(false);
      wx.showToast({ title: '已关闭推送', icon: 'none' });
    }
  },

  saveNotificationEnabled(enabled) {
    const settings = wx.getStorageSync('userSettings') || {};
    settings.notificationEnabled = enabled;
    wx.setStorageSync('userSettings', settings);
    this.setData({ notificationEnabled: enabled });
    userSync.syncUserToCloud();
  },

  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: (res) => {
        const accepted = res[TEMPLATE_ID] === 'accept';
        if (accepted) {
          this.saveNotificationEnabled(true);
        }
        wx.showToast({
          title: accepted ? '授权成功' : '请允许通知',
          icon: accepted ? 'success' : 'none'
        });
      },
      fail: (err) => {
        console.error('订阅授权失败:', err);
        wx.showToast({ title: '授权失败', icon: 'none' });
      }
    });
  },

  syncUserToCloud() {
    return userSync.syncUserToCloud();
  },

  loadSubscribedAnime() {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];

    if (subscribedIds.length === 0) {
      this.setData({
        subscribedAnime: [],
        leftColumn: [],
        rightColumn: [],
        subscribeCount: 0,
        todayUpdateCount: 0,
        weekUpdateCount: 0,
        loading: false
      });
      return;
    }

    this.setData({ loading: true });

    animeData.getAllAnime().then(allAnime => {
      const subscribedAnime = allAnime.filter(anime => subscribedIds.includes(anime.id));
      const today = new Date().getDay() || 7;
      const todayUpdateCount = subscribedAnime.filter(anime => anime.broadcastDay == today).length;
      const leftColumn = [];
      const rightColumn = [];

      subscribedAnime.forEach((anime, index) => {
        if (index % 2 === 0) {
          leftColumn.push(anime);
        } else {
          rightColumn.push(anime);
        }
      });

      this.setData({
        subscribedAnime,
        leftColumn,
        rightColumn,
        subscribeCount: subscribedIds.length,
        todayUpdateCount,
        weekUpdateCount: subscribedAnime.length,
        loading: false
      });
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  goToDetail(e) {
    const animeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/anime-detail/anime-detail?id=${animeId}`
    });
  },

  unsubscribe(e) {
    const animeId = e.currentTarget.dataset.id;
    let subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const index = subscribedIds.indexOf(animeId);

    if (index > -1) {
      subscribedIds.splice(index, 1);
      wx.setStorageSync('subscribedIds', subscribedIds);
      wx.showToast({ title: '已取消订阅', icon: 'success' });
      this.loadSubscribedAnime();
      userSync.syncUserToCloud();
    }
  },

  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
