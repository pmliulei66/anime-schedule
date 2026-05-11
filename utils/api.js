// utils/api.js - Bangumi API 请求服务

const BASE_URL = 'https://api.bgm.tv';
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2小时缓存

// ==================== 缓存工具 ====================

function setCache(key, data) {
  wx.setStorage({
    key: key,
    data: {
      data: data,
      timestamp: Date.now()
    }
  });
}

function getCache(key) {
  try {
    const cached = wx.getStorageSync(key);
    if (cached && cached.data && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      return cached.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ==================== 网络请求 ====================

function request(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method: method,
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 15000, // 15秒超时
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          console.warn(`API请求失败: ${url}, 状态码: ${res.statusCode}`);
          reject(new Error('请求失败: ' + res.statusCode));
        }
      },
      fail(err) {
        console.warn(`API请求失败: ${url}`, err.errMsg);
        reject(err);
      }
    });
  });
}

// ==================== 数据转换 ====================

// 将 Bangumi 条目转换为小程序内部格式
function transformItem(item) {
  // calendar 接口不返回 eps/eps_count，需要根据播出日期估算当前集数
  // eps_count/eps 可能是数字或对象数组，需要判断类型
  let totalEpisodes = 12; // 默认12集
  if (typeof item.eps_count === 'number') {
    totalEpisodes = item.eps_count;
  } else if (typeof item.eps === 'number') {
    totalEpisodes = item.eps;
  } else if (Array.isArray(item.eps) && item.eps.length > 0) {
    totalEpisodes = item.eps.length;
  } else {
    totalEpisodes = estimateTotalEpisodes(item.air_date);
  }
  
  const currentEpisode = estimateCurrentEpisode(item.air_date, totalEpisodes);
  
  return {
    id: String(item.id),
    name: item.name_cn || item.name || '',
    nameJp: item.name || '',
    nameEn: '',
    cover: item.images ? (item.images.large || item.images.common || item.images.medium) : '',
    coverLow: item.images ? (item.images.common || item.images.medium || item.images.large) : '',
    platform: '日本放送',
    broadcastDay: item.air_weekday || 0,
    broadcastTime: '',
    broadcastDayText: getDayText(item.air_weekday),
    startDate: item.air_date || '',
    currentEpisode: currentEpisode,
    totalEpisodes: totalEpisodes,
    genre: [],
    status: getAnimeStatus(item.air_date),
    description: item.summary || '',
    rating: item.rating ? item.rating.score : 0,
    rank: item.rating ? item.rating.rank : 0,
    collection: item.collection || {}
  };
}

// 根据播出日期估算当前集数
function estimateCurrentEpisode(airDate, totalEpisodes) {
  if (!airDate || airDate === '0000-00-00') {
    return 1; // 默认显示第1集
  }
  
  const air = new Date(airDate);
  const now = new Date();
  
  // 未开播
  if (air > now) return 0;
  
  // 计算已播出周数
  const diffDays = Math.floor((now - air) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const currentEp = weeks + 1; // 第1周是第1集
  
  // 不超过总集数
  return Math.min(currentEp, totalEpisodes || 12);
}

// 估算总集数（默认12集，约一季）
function estimateTotalEpisodes(airDate) {
  if (!airDate) return 12;
  // 根据播出时长粗略估算，默认12集
  return 12;
}

// 获取星期文本
function getDayText(day) {
  const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return days[day] || '未知';
}

// 判断番剧状态
function getAnimeStatus(airDate) {
  if (!airDate || airDate === '0000-00-00') return 'upcoming';
  const air = new Date(airDate);
  const now = new Date();
  if (air > now) return 'upcoming';
  // 播出超过半年视为已完结（粗略判断）
  const diffDays = (now - air) / (1000 * 60 * 60 * 24);
  if (diffDays > 180) return 'finished';
  return 'airing';
}

// ==================== API 方法 ====================

// 获取每周放送日历（核心接口）
function fetchCalendar() {
  const cacheKey = 'bgm_calendar';
  const cached = getCache(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return request(BASE_URL + '/calendar')
    .then(data => {
      // data 是数组，每项包含 { weekday, items }
      const result = data.map(dayGroup => ({
        weekday: dayGroup.weekday,
        items: dayGroup.items.map(transformItem)
      }));
      setCache(cacheKey, result);
      return result;
    });
}

// 搜索番剧
function searchAnime(keyword) {
  if (!keyword || !keyword.trim()) {
    return Promise.resolve([]);
  }

  const encodedKeyword = encodeURIComponent(keyword.trim());
  return request(BASE_URL + '/search/subject/' + encodedKeyword + '?type=2&responseGroup=large&max_results=20')
    .then(data => {
      if (data.code === 404) return [];
      const list = data.list || data.results || [];
      return list.map(transformItem);
    })
    .catch(() => []);
}

// 获取番剧详情
function fetchAnimeDetail(id) {
  const cacheKey = 'bgm_detail_' + id;
  const cached = getCache(cacheKey);
  if (cached) {
    return Promise.resolve(cached);
  }

  return request(BASE_URL + '/subject/' + id + '?responseGroup=large')
    .then(data => {
      const result = transformItem(data);
      // 详情页额外提取 tags
      if (data.tags) {
        result.genre = data.tags.slice(0, 6).map(tag => tag.name);
      }
      // 从 eps 数组中提取真实的最新集数和更新日期
      if (data.eps && Array.isArray(data.eps) && data.eps.length > 0) {
        const airedEps = data.eps.filter(ep => ep.status === 'Air' && ep.airdate && ep.airdate !== '0000-00-00');
        if (airedEps.length > 0) {
          const latestEp = airedEps.reduce((a, b) => (a.sort || 0) > (b.sort || 0) ? a : b);
          result.currentEpisode = latestEp.sort;
          result.latestUpdateDate = latestEp.airdate;
        }
      }
      setCache(cacheKey, result);
      return result;
    });
}

// 获取所有番剧（从日历聚合）
function fetchAllAnime() {
  return fetchCalendar().then(calendarData => {
    const allAnime = [];
    calendarData.forEach(dayGroup => {
      dayGroup.items.forEach(item => {
        allAnime.push(item);
      });
    });
    return allAnime;
  });
}

// 清除缓存
function clearCache() {
  try {
    wx.clearStorageSync();
  } catch (e) {
    console.error('清除缓存失败', e);
  }
}

module.exports = {
  fetchCalendar,
  searchAnime,
  fetchAnimeDetail,
  fetchAllAnime,
  clearCache,
  transformItem,
  getDayText
};
