// utils/anilist.js - AniList API 封装
// 作为 Bangumi API 的备用数据源

const ANILIST_URL = 'https://graphql.anilist.co';

// ==================== GraphQL 查询 ====================

// 获取当季放送番剧（按人气排序）
const AIRING_SCHEDULE_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
        id
        title { romaji english native }
        coverImage { large medium }
        nextAiringEpisode { episode airingAt timeUntilAiring }
        averageScore
        genres
        episodes
        status
        seasonYear
        season
        siteUrl
        description
        startDate { year month day }
      }
    }
  }
`;

// 搜索番剧
const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: ANIME) {
        id
        title { romaji english native }
        coverImage { large medium }
        averageScore
        genres
        episodes
        status
        siteUrl
        description
        startDate { year month day }
      }
    }
  }
`;

// 获取番剧详情
const ANIME_DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english native }
      coverImage { large medium }
      bannerImage
      averageScore
      genres
      episodes
      status
      seasonYear
      season
      siteUrl
      description
      startDate { year month day }
      nextAiringEpisode { episode airingAt timeUntilAiring }
      studios { nodes { name } }
    }
  }
`;

// ==================== 网络请求 ====================

function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: ANILIST_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        query,
        variables
      },
      timeout: 15000,
      success(res) {
        if (res.statusCode === 200 && res.data && !res.data.errors) {
          resolve(res.data.data);
        } else {
          console.warn('AniList API 错误:', res.data?.errors);
          reject(new Error('AniList request failed'));
        }
      },
      fail(err) {
        console.warn('AniList 请求失败:', err.errMsg);
        reject(err);
      }
    });
  });
}

// ==================== 数据转换 ====================

// 将 AniList 数据转换为小程序内部格式
function transformAniListItem(media) {
  const title = media.title.native || media.title.romaji || media.title.english || '未知番剧';
  const titleEn = media.title.english || media.title.romaji || '';
  
  // 计算播出星期（从 startDate 推算）
  let broadcastDay = 0;
  if (media.startDate && media.startDate.year) {
    const startDate = new Date(media.startDate.year, (media.startDate.month || 1) - 1, media.startDate.day || 1);
    broadcastDay = startDate.getDay() || 7; // 0是周日转为7
  }
  
  // 估算当前集数
  let currentEpisode = 1;
  if (media.nextAiringEpisode && media.nextAiringEpisode.episode) {
    currentEpisode = media.nextAiringEpisode.episode - 1;
  } else if (media.episodes) {
    currentEpisode = media.episodes;
  }
  
  // 格式化开播日期
  let startDate = '';
  if (media.startDate && media.startDate.year) {
    const m = String(media.startDate.month || 1).padStart(2, '0');
    const d = String(media.startDate.day || 1).padStart(2, '0');
    startDate = `${media.startDate.year}-${m}-${d}`;
  }
  
  // 状态映射
  const statusMap = {
    'RELEASING': 'airing',
    'FINISHED': 'finished',
    'NOT_YET_RELEASED': 'upcoming',
    'CANCELLED': 'finished',
    'HIATUS': 'airing'
  };
  
  return {
    id: String(media.id),
    name: title,
    nameJp: media.title.native || '',
    nameEn: titleEn,
    cover: media.coverImage?.large || media.coverImage?.medium || '',
    platform: media.studios?.nodes?.[0]?.name || '日本放送',
    broadcastDay: broadcastDay,
    broadcastTime: '',
    broadcastDayText: getDayText(broadcastDay),
    startDate: startDate,
    currentEpisode: currentEpisode,
    totalEpisodes: media.episodes || 12,
    genre: media.genres || [],
    status: statusMap[media.status] || 'airing',
    description: cleanDescription(media.description) || '',
    rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : 0,
    rank: 0,
    collection: {},
    // AniList 特有字段
    nextAiringEpisode: media.nextAiringEpisode,
    anilistUrl: media.siteUrl
  };
}

// 清理描述文本（移除 HTML 标签）
function cleanDescription(desc) {
  if (!desc) return '';
  return desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .substring(0, 500);
}

function getDayText(day) {
  const days = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  return days[day] || '';
}

// ==================== 对外接口 ====================

// 获取当季放送番剧列表
function fetchAiringAnime(page = 1, perPage = 50) {
  return graphqlRequest(AIRING_SCHEDULE_QUERY, { page, perPage })
    .then(data => {
      const mediaList = data.Page?.media || [];
      return mediaList.map(transformAniListItem);
    });
}

// 搜索番剧
function searchAnime(keyword, page = 1, perPage = 20) {
  if (!keyword || !keyword.trim()) {
    return Promise.resolve([]);
  }
  return graphqlRequest(SEARCH_QUERY, { search: keyword.trim(), page, perPage })
    .then(data => {
      const mediaList = data.Page?.media || [];
      return mediaList.map(transformAniListItem);
    });
}

// 获取番剧详情
function fetchAnimeDetail(id) {
  return graphqlRequest(ANIME_DETAIL_QUERY, { id: parseInt(id) })
    .then(data => {
      if (data.Media) {
        return transformAniListItem(data.Media);
      }
      return null;
    });
}

// 获取每周放送日历（按星期分组）
function fetchCalendar() {
  return fetchAiringAnime(1, 100).then(animeList => {
    // 按星期几分组
    const result = [];
    for (let i = 1; i <= 7; i++) {
      result.push({
        weekday: { id: i, cn: getDayText(i), en: '', ja: '' },
        items: animeList.filter(a => a.broadcastDay == i)
      });
    }
    return result;
  });
}

module.exports = {
  fetchAiringAnime,
  searchAnime,
  fetchAnimeDetail,
  fetchCalendar
};
