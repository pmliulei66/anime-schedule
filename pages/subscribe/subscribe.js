// pages/subscribe/subscribe.js
const animeData = require('../../utils/animeData.js');

// 订阅消息模板ID
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
    this.loadSubscribedAnime();
  },

  // 加载用户设置
  loadSettings() {
    const settings = wx.getStorageSync('userSettings') || {};
    this.setData({
      notificationEnabled: settings.notificationEnabled || false
    });
  },

  // 切换推送通知开关
  toggleNotification(e) {
    const enabled = e.detail.value;

    if (enabled) {
      // 开启时直接弹出授权
      wx.requestSubscribeMessage({
        tmplIds: [TEMPLATE_ID],
        success: (res) => {
          if (res[TEMPLATE_ID] === 'accept') {
            const settings = wx.getStorageSync('userSettings') || {};
            settings.notificationEnabled = true;
            wx.setStorageSync('userSettings', settings);
            this.setData({ notificationEnabled: true });
            wx.showToast({ title: '已开启推送', icon: 'success' });
          } else {
            // 用户拒绝授权，开关保持关闭
            this.setData({ notificationEnabled: false });
            wx.showToast({ title: '需要授权才能推送', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('订阅授权失败:', err);
          this.setData({ notificationEnabled: false });
          wx.showToast({ title: '授权失败', icon: 'none' });
        }
      });
    } else {
      // 关闭推送
      const settings = wx.getStorageSync('userSettings') || {};
      settings.notificationEnabled = false;
      wx.setStorageSync('userSettings', settings);
      this.setData({ notificationEnabled: false });
      wx.showToast({ title: '已关闭推送', icon: 'none' });
    }

    // 同步到云数据库
    this.syncUserToCloud();
  },

  // 请求订阅消息授权
  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: (res) => {
        console.log('订阅授权结果:', res);
        if (res[TEMPLATE_ID] === 'accept') {
          wx.showToast({ title: '授权成功', icon: 'success' });
        } else {
          wx.showToast({ title: '请允许通知', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('订阅授权失败:', err);
        wx.showToast({ title: '授权失败', icon: 'none' });
      }
    });
  },

  // 同步用户数据到云数据库
  syncUserToCloud() {
    if (!wx.cloud) return;

    const db = wx.cloud.database();
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const settings = wx.getStorageSync('userSettings') || {};

    // 获取用户 openid
    wx.cloud.callFunction({
      name: 'sendSubscribeMessage',
      data: { action: 'getOpenId' }
    }).then(res => {
      const openid = res.result.openid;
      db.collection('users').where({ openid: openid }).get().then(queryRes => {
        if (queryRes.data.length > 0) {
          // 更新
          db.collection('users').doc(queryRes.data[0]._id).update({
            data: {
              subscribedAnimeIds: subscribedIds,
              notificationEnabled: settings.notificationEnabled || false,
              updatedAt: db.serverDate()
            }
          });
        } else {
          // 新增
          db.collection('users').add({
            data: {
              openid: openid,
              subscribedAnimeIds: subscribedIds,
              notificationEnabled: settings.notificationEnabled || false,
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          });
        }
      });
    }).catch(err => {
      console.log('同步云数据库失败（云开发未配置）:', err.message);
    });
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

    animeData.getAllAnime().then(allAnime => {
      const subscribedAnime = allAnime.filter(anime => subscribedIds.includes(anime.id));

      const today = new Date().getDay() || 7;
      const todayUpdateCount = subscribedAnime.filter(anime => anime.broadcastDay == today).length;

      // 分配到左右两列
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
        subscribedAnime: subscribedAnime,
        leftColumn: leftColumn,
        rightColumn: rightColumn,
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
      this.syncUserToCloud();
    }
  },

  // 跳转到时间表
  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
