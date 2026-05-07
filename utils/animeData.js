// utils/animeData.js - 番剧数据管理工具
// 现在从 Bangumi API 获取真实数据，硬编码数据作为 fallback

const api = require('./api.js');

// ==================== Fallback 数据（网络不可用时使用） ====================

function getFallbackAnime() {
  return [
    {
      id: '1', name: '咒术回战', nameJp: '呪術廻戦',
      cover: 'https://lain.bgm.tv/pic/cover/c/ab/77/472741_MqsB8.jpg',
      platform: '日本放送', broadcastDay: 4, broadcastTime: '',
      broadcastDayText: '周四', startDate: '2026-01-08',
      currentEpisode: 12, totalEpisodes: 12, genre: [],
      status: 'airing', description: '2018年10月31日。在万圣节热闹的涩谷车站周边，突然降下「帐」...',
      rating: 7.9, rank: 312, collection: { doing: 3462 }
    },
    {
      id: '2', name: '排球少年', nameJp: 'ハイキュー!!',
      cover: 'https://lain.bgm.tv/pic/cover/c/2e/7d/93182_2U4d4.jpg',
      platform: '日本放送', broadcastDay: 5, broadcastTime: '',
      broadcastDayText: '周五', startDate: '2014-04-06',
      currentEpisode: 25, totalEpisodes: 25, genre: [],
      status: 'finished', description: '少年日向翔阳在初中比赛中看到乌野高中排球队的比赛后...',
      rating: 8.5, rank: 0, collection: { doing: 0 }
    }
  ];
}

// ==================== 对外接口（优先从 API 获取） ====================

// 获取每周放送日历（按星期分组）
function getCalendarData() {
  return api.fetchCalendar().catch(() => {
    // fallback: 将 fallback 数据按星期分组
    const fallback = getFallbackAnime();
    const result = [];
    for (let i = 1; i <= 7; i++) {
      result.push({
        weekday: { id: i, cn: getDayText(i), en: '', ja: '' },
        items: fallback.filter(a => a.broadcastDay == i)
      });
    }
    return result;
  });
}

// 获取所有番剧（从日历聚合）
function getAllAnime() {
  return api.fetchAllAnime().catch(() => {
    return getFallbackAnime();
  });
}

// 根据 ID 获取番剧详情
function getAnimeById(id) {
  return api.fetchAnimeDetail(id).catch(() => {
    const fallback = getFallbackAnime();
    return fallback.find(a => a.id == id) || null;
  });
}

// 搜索番剧
function searchAnime(keyword) {
  return api.searchAnime(keyword);
}

// 获取番剧类型列表
function getGenreList() {
  return ['全部', '热血', '恋爱', '喜剧', '科幻', '日常', '运动', '音乐', '校园', '黑暗'];
}

// 获取星期几的文本
function getDayText(day) {
  const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return days[day] || '';
}

// 获取当前季度
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  let season = '';
  if (month >= 1 && month <= 3) season = 'winter';
  else if (month >= 4 && month <= 6) season = 'spring';
  else if (month >= 7 && month <= 9) season = 'summer';
  else season = 'autumn';
  return `${year}${season}`;
}

// 获取季度文本
function getSeasonText(season) {
  const seasonMap = { 'winter': '冬季', 'spring': '春季', 'summer': '夏季', 'autumn': '秋季' };
  const year = season.substring(0, 4);
  const seasonKey = season.substring(4);
  return `${year}年${seasonMap[seasonKey]}`;
}

module.exports = {
  getCalendarData,
  getAllAnime,
  getAnimeById,
  searchAnime,
  getGenreList,
  getDayText,
  getCurrentSeason,
  getSeasonText
};
