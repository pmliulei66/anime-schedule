// utils/storage.js - 本地存储工具

const STORAGE_KEYS = {
  SUBSCRIBED_IDS: 'subscribedIds',
  ANIME_PROGRESS: 'animeProgress',
  USER_SETTINGS: 'userSettings'
};

// 获取订阅列表
function getSubscribedIds() {
  return wx.getStorageSync(STORAGE_KEYS.SUBSCRIBED_IDS) || [];
}

// 设置订阅列表
function setSubscribedIds(ids) {
  wx.setStorageSync(STORAGE_KEYS.SUBSCRIBED_IDS, ids);
}

// 添加订阅
function addSubscription(animeId) {
  const ids = getSubscribedIds();
  if (!ids.includes(animeId)) {
    ids.push(animeId);
    setSubscribedIds(ids);
  }
  return ids;
}

// 移除订阅
function removeSubscription(animeId) {
  const ids = getSubscribedIds();
  const index = ids.indexOf(animeId);
  if (index > -1) {
    ids.splice(index, 1);
    setSubscribedIds(ids);
  }
  return ids;
}

// 检查是否已订阅
function isSubscribed(animeId) {
  const ids = getSubscribedIds();
  return ids.includes(animeId);
}

// 获取追番进度
function getAnimeProgress() {
  return wx.getStorageSync(STORAGE_KEYS.ANIME_PROGRESS) || {};
}

// 设置追番进度
function setAnimeProgress(animeId, progress) {
  const data = getAnimeProgress();
  data[animeId] = progress;
  wx.setStorageSync(STORAGE_KEYS.ANIME_PROGRESS, data);
  return data;
}

// 更新单部番剧的进度
function updateProgress(animeId, updates) {
  const data = getAnimeProgress();
  data[animeId] = {
    ...data[animeId],
    ...updates
  };
  wx.setStorageSync(STORAGE_KEYS.ANIME_PROGRESS, data);
  return data;
}

// 获取用户设置
function getUserSettings() {
  return wx.getStorageSync(STORAGE_KEYS.USER_SETTINGS) || {
    notificationEnabled: true,
    defaultView: 'week'
  };
}

// 设置用户设置
function setUserSettings(settings) {
  const current = getUserSettings();
  const merged = { ...current, ...settings };
  wx.setStorageSync(STORAGE_KEYS.USER_SETTINGS, merged);
  return merged;
}

// 清除所有数据
function clearAllData() {
  wx.clearStorageSync();
}

module.exports = {
  STORAGE_KEYS,
  getSubscribedIds,
  setSubscribedIds,
  addSubscription,
  removeSubscription,
  isSubscribed,
  getAnimeProgress,
  setAnimeProgress,
  updateProgress,
  getUserSettings,
  setUserSettings,
  clearAllData
};
