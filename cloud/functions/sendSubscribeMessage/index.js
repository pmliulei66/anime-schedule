// 云函数：发送订阅消息
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { openid, templateId, data, page } = event;

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
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
};
