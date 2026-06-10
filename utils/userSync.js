// utils/userSync.js - 用户订阅数据云端同步

function getLocalUserState() {
  const settings = wx.getStorageSync('userSettings') || {};
  return {
    subscribedAnimeIds: wx.getStorageSync('subscribedIds') || [],
    notificationEnabled: !!settings.notificationEnabled
  };
}

function syncUserToCloud(extra = {}) {
  if (!wx.cloud) {
    return Promise.resolve({ success: false, error: 'cloud unavailable' });
  }

  const state = {
    ...getLocalUserState(),
    ...extra
  };

  return wx.cloud.callFunction({
    name: 'sendSubscribeMessage',
    data: {
      action: 'syncUser',
      subscribedAnimeIds: state.subscribedAnimeIds,
      notificationEnabled: state.notificationEnabled
    }
  }).then(res => res.result).catch(err => {
    console.log('同步用户订阅数据失败', err.message || err);
    return { success: false, error: err.message || String(err) };
  });
}

function getOpenId() {
  if (!wx.cloud) {
    return Promise.resolve('');
  }

  return wx.cloud.callFunction({
    name: 'sendSubscribeMessage',
    data: { action: 'getOpenId' }
  }).then(res => res.result && res.result.openid).catch(err => {
    console.log('获取 openid 失败', err.message || err);
    return '';
  });
}

module.exports = {
  getLocalUserState,
  syncUserToCloud,
  getOpenId
};
