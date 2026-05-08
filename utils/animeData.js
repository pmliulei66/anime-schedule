// utils/animeData.js - 番剧数据管理工具
// 多数据源支持：Bangumi (主) -> AniList (备用) -> 本地 fallback

const api = require('./api.js');
const anilist = require('./anilist.js');

// ==================== Fallback 数据（网络完全不可用时使用） ====================

function getFallbackAnime() {
  return [
    {
      id: '1', name: '咒术回战', nameJp: '呪術廻戦',
      cover: 'https://img.zcool.cn/community/01e6875d49e8f7a8012187f447b5cd.jpg@1280w_1l_2o_100sh.jpg',
      platform: '日本放送', broadcastDay: 4, broadcastTime: '',
      broadcastDayText: '周四', startDate: '2026-01-08',
      currentEpisode: 12, totalEpisodes: 12, genre: [],
      status: 'airing', description: '2018年10月31日。在万圣节热闹的涩谷车站周边，突然降下「帐」...',
      rating: 7.9, rank: 312, collection: { doing: 3462 }
    },
    {
      id: '2', name: '排球少年', nameJp: 'ハイキュー!!',
      cover: 'https://img.zcool.cn/community/01e8d95e3a6f95a801213f26c19c18.jpg@1280w_1l_2o_100sh.jpg',
      platform: '日本放送', broadcastDay: 5, broadcastTime: '',
      broadcastDayText: '周五', startDate: '2014-04-06',
      currentEpisode: 25, totalEpisodes: 25, genre: [],
      status: 'finished', description: '少年日向翔阳在初中比赛中看到乌野高中排球队的比赛后...',
      rating: 8.5, rank: 0, collection: { doing: 0 }
    },
    {
      id: '3', name: '鬼灭之刃', nameJp: '鬼滅の刃',
      cover: 'https://img.zcool.cn/community/01786557fb8a59a8012187f4a7e5d8.jpg@1280w_1l_2o_100sh.jpg',
      platform: '日本放送', broadcastDay: 6, broadcastTime: '',
      broadcastDayText: '周六', startDate: '2019-04-06',
      currentEpisode: 26, totalEpisodes: 26, genre: [],
      status: 'finished', description: '大正时代，卖炭少年炭治郎过着平凡的生活...',
      rating: 8.7, rank: 0, collection: { doing: 0 }
    },
    {
      id: '4', name: '进击的巨人', nameJp: '進撃の巨人',
      cover: 'https://img.zcool.cn/community/01e6875d49e8f7a8012187f447b5cd.jpg@1280w_1l_2o_100sh.jpg',
      platform: '日本放送', broadcastDay: 0, broadcastTime: '',
      broadcastDayText: '周日', startDate: '2013-04-07',
      currentEpisode: 87, totalEpisodes: 87, genre: [],
      status: 'finished', description: '人类与巨人的战斗持续了百年...',
      rating: 9.0, rank: 0, collection: { doing: 0 }
    }
  ];
}

// ==================== 多数据源获取策略 ====================

// 获取每周放送日历（Bangumi -> AniList -> Fallback）
function getCalendarData() {
  return api.fetchCalendar()
    .catch(err => {
      console.log('Bangumi API 失败，尝试 AniList...', err.message);
      return anilist.fetchCalendar();
    })
    .catch(err => {
      console.log('AniList API 失败，使用本地 fallback...', err.message);
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

// 获取所有番剧（Bangumi -> AniList -> Fallback）
function getAllAnime() {
  return api.fetchAllAnime()
    .catch(err => {
      console.log('Bangumi API 失败，尝试 AniList...', err.message);
      return anilist.fetchAiringAnime();
    })
    .catch(err => {
      console.log('AniList API 失败，使用本地 fallback...', err.message);
      return getFallbackAnime();
    });
}

// 根据 ID 获取番剧详情（Bangumi -> AniList -> Fallback）
function getAnimeById(id) {
  return api.fetchAnimeDetail(id)
    .catch(err => {
      console.log('Bangumi API 失败，尝试 AniList...', err.message);
      return anilist.fetchAnimeDetail(id);
    })
    .catch(err => {
      console.log('AniList API 失败，使用本地 fallback...', err.message);
      const fallback = getFallbackAnime();
      return fallback.find(a => a.id == id) || null;
    });
}

// 搜索番剧（Bangumi -> AniList）
function searchAnime(keyword) {
  return api.searchAnime(keyword)
    .catch(err => {
      console.log('Bangumi 搜索失败，尝试 AniList...', err.message);
      return anilist.searchAnime(keyword);
    })
    .catch(err => {
      console.log('AniList 搜索失败，使用本地 fallback...', err.message);
      const fallback = getFallbackAnime();
      const lowerKeyword = keyword.toLowerCase();
      return fallback.filter(a => 
        a.name.toLowerCase().includes(lowerKeyword) ||
        a.nameJp.toLowerCase().includes(lowerKeyword)
      );
    });
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
