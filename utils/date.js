// utils/date.js - 日期工具函数

// 获取本周的周一和周日日期
function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: monday,
    end: sunday
  };
}

// 获取指定日期所在周的周一
function getMondayOfWeek(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() - dayOfWeek + 1);
  return d;
}

// 获取周数
function getWeekNumber(date) {
  const d = new Date(date);
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}

// 判断是否为今天
function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

// 获取中文星期
function getChineseDay(day) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[day] || '';
}

// 计算下一个播出日期
function getNextBroadcastDate(broadcastDay) {
  const now = new Date();
  const today = now.getDay() || 7;
  let daysUntil = broadcastDay - today;
  
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysUntil);
  
  return nextDate;
}

module.exports = {
  getCurrentWeekRange,
  getMondayOfWeek,
  getWeekNumber,
  formatDate,
  isToday,
  getChineseDay,
  getNextBroadcastDate
};
