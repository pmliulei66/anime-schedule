// 云函数：检查番剧更新并发送订阅消息
// 由云开发定时触发器每天调用
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const BASE_URL = 'https://api.bgm.tv';

// 订阅消息模板ID
const TEMPLATE_ID = 'wEMtAbOoqVZQP1gj5SReCMiTJwvtpReSsmGOugyXslk';

exports.main = async (event, context) => {
  console.log('开始检查番剧更新...');

  try {
    // 1. 获取所有开启了通知的用户
    const usersResult = await db.collection('users')
      .where({
        notificationEnabled: true
      })
      .get();

    const users = usersResult.data;
    if (users.length === 0) {
      console.log('没有开启通知的用户');
      return { success: true, message: '没有需要通知的用户', notifiedCount: 0 };
    }

    // 2. 获取今日是星期几 (1=周一, 7=周日)
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;

    // 3. 从 Bangumi API 获取今日番剧列表
    const todayAnime = await fetchBangumiCalendar(dayOfWeek);
    if (todayAnime.length === 0) {
      console.log('今日无番剧更新');
      return { success: true, message: '今日无番剧更新', notifiedCount: 0 };
    }

    // 4. 构建番剧名称映射
    const animeMap = {};
    todayAnime.forEach(anime => {
      animeMap[anime.id] = anime;
    });

    // 5. 遍历用户，检查其订阅的番剧是否有今日更新
    let notifiedCount = 0;

    for (const user of users) {
      const subscribedIds = user.subscribedAnimeIds || [];
      const updatedAnime = subscribedIds
        .filter(id => animeMap[id])
        .map(id => animeMap[id]);

      if (updatedAnime.length === 0) continue;

      // 6. 发送订阅消息
      for (const anime of updatedAnime) {
        try {
          await cloud.openapi.subscribeMessage.send({
            touser: user.openid,
            templateId: TEMPLATE_ID,
            page: `pages/anime-detail/anime-detail?id=${anime.id}`,
            data: {
              thing1: { value: anime.name.substring(0, 20) }, // 番剧名称（限20字）
              thing2: { value: `第${anime.currentEpisode}集` }, // 更新集数
              date3: { value: formatDate(now) } // 更新日期
            },
            miniprogramState: 'formal'
          });
          notifiedCount++;
          console.log(`已通知用户 ${user.openid}: ${anime.name} 第${anime.currentEpisode}集`);
        } catch (err) {
          console.error(`通知用户 ${user.openid} 失败:`, err.message);
          // 用户未授权或授权已用完，跳过
        }
      }
    }

    console.log(`检查完成，共通知 ${notifiedCount} 次`);
    return {
      success: true,
      message: `检查完成`,
      notifiedCount: notifiedCount,
      checkedUsers: users.length,
      todayAnimeCount: todayAnime.length
    };

  } catch (err) {
    console.error('检查番剧更新失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// 从 Bangumi API 获取指定星期的番剧
async function fetchBangumiCalendar(dayOfWeek) {
  try {
    const response = await fetch(`${BASE_URL}/calendar`);
    const data = await response.json();

    const dayGroup = data.find(g => g.weekday.id === dayOfWeek);
    if (!dayGroup) return [];

    return dayGroup.items.map(item => ({
      id: String(item.id),
      name: item.name_cn || item.name || '未知番剧',
      currentEpisode: estimateCurrentEpisode(item.air_date, item.eps_count || 12)
    }));
  } catch (err) {
    console.error('获取 Bangumi 日历失败:', err);
    return [];
  }
}

// 估算当前集数
function estimateCurrentEpisode(airDate, totalEpisodes) {
  if (!airDate || airDate === '0000-00-00') return 1;
  const air = new Date(airDate);
  const now = new Date();
  if (air > now) return 0;
  const diffDays = Math.floor((now - air) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  return Math.min(weeks + 1, totalEpisodes || 12);
}

// 格式化日期
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
