// 云函数：订阅消息与用户订阅数据同步
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action = 'sendMessage' } = event;

  if (action === 'getOpenId') {
    return {
      success: true,
      openid: OPENID
    };
  }

  if (action === 'syncUser') {
    return syncUser(OPENID, event);
  }

  return sendMessage(event);
};

async function syncUser(openid, event) {
  const subscribedAnimeIds = Array.isArray(event.subscribedAnimeIds) ? event.subscribedAnimeIds : [];
  const notificationEnabled = !!event.notificationEnabled;

  try {
    const users = db.collection('users');
    const existing = await users.where({ openid }).limit(1).get();
    const data = {
      openid,
      subscribedAnimeIds,
      notificationEnabled,
      updatedAt: db.serverDate()
    };

    if (existing.data.length > 0) {
      await users.doc(existing.data[0]._id).update({ data });
    } else {
      await users.add({
        data: {
          ...data,
          createdAt: db.serverDate()
        }
      });
    }

    return {
      success: true,
      openid,
      subscribedAnimeIds,
      notificationEnabled
    };
  } catch (err) {
    console.error('同步用户订阅数据失败', err);
    return {
      success: false,
      error: err.message
    };
  }
}

async function sendMessage(event) {
  const { openid, templateId, data, page } = event;
  const touser = openid || event.touser;

  if (!touser || !templateId || !data) {
    return {
      success: false,
      error: '缺少 openid/templateId/data'
    };
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser,
      templateId: templateId,
      page: page || 'pages/index/index',
      data: data,
      miniprogramState: 'formal' // formal=正式版, trial=体验版, developer=开发版
    });

    return {
      success: true,
      result: result
    };
  } catch (err) {
    console.error('发送订阅消息失败:', err);
    return {
      success: false,
      error: err.message
    };
  }
}
