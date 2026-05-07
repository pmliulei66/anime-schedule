// pages/index/index.js
const animeData = require('../../utils/animeData.js');

Page({
  data: {
    currentWeek: 1,
    weekDateRange: '',
    selectedDay: 0,
    todayIndex: 0,
    weekDays: [],
    currentDayAnime: [],
    leftColumn: [],
    rightColumn: [],
    calendarData: [],
    loading: true,
    showBackTop: false,
    // 搜索相关
    searchKeyword: '',
    isSearching: false,
    searchLoading: false,
    searchResults: [],
    searchLeftColumn: [],
    searchRightColumn: []
  },

  // 每天的滚动位置记忆
  scrollPositions: null,

  onLoad() {
    // 初始化滚动位置记录
    this.scrollPositions = {};
    this.initWeekData();
    this.loadAnimeData();
  },

  onShow() {
    this.updateSubscribeStatus();
    // 恢复当前日期的滚动位置
    const savedTop = this.scrollPositions[this.data.selectedDay] || 0;
    if (savedTop > 0) {
      wx.pageScrollTo({
        scrollTop: savedTop,
        duration: 0
      });
    }
  },

  onHide() {
    // 保存当前日期的滚动位置
    this.scrollPositions[this.data.selectedDay] = this.currentScrollTop || 0;
  },

  // 初始化周数据
  initWeekData() {
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      weekDays.push({
        name: dayNames[i],
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        count: 0
      });
    }

    const endDate = new Date(monday);
    endDate.setDate(monday.getDate() + 6);

    this.setData({
      currentWeek: this.getWeekNumber(monday),
      weekDateRange: `${monday.getMonth() + 1}/${monday.getDate()} - ${endDate.getMonth() + 1}/${endDate.getDate()}`,
      weekDays: weekDays,
      selectedDay: dayOfWeek - 1,
      todayIndex: dayOfWeek - 1
    });
  },

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  // 从 Bangumi API 加载番剧数据
  loadAnimeData() {
    this.setData({ loading: true });
    
    animeData.getCalendarData().then(calendarData => {
      // 更新每天的番剧数量
      const weekDays = this.data.weekDays.map((day, index) => {
        const dayGroup = calendarData.find(g => g.weekday.id == index + 1);
        const count = dayGroup ? dayGroup.items.length : 0;
        return { ...day, count };
      });

      this.setData({
        calendarData: calendarData,
        weekDays: weekDays,
        loading: false
      });

      this.filterAnimeByDay();
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    });
  },

  // 根据选中日期筛选番剧
  filterAnimeByDay() {
    const selectedDay = this.data.selectedDay;
    const dayGroup = this.data.calendarData.find(g => g.weekday.id == selectedDay + 1);
    let dayAnime = dayGroup ? dayGroup.items : [];

    // 更新订阅状态
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    let currentDayAnime = dayAnime.map(anime => ({
      ...anime,
      isSubscribed: subscribedIds.includes(anime.id)
    }));

    // 排序：先按评分从高到低，评分相同按名称首字母排序
    currentDayAnime.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA; // 评分高的在前
      }
      // 评分相同，按名称首字母排序
      const nameA = (a.name || a.nameJp || '').toLowerCase();
      const nameB = (b.name || b.nameJp || '').toLowerCase();
      return nameA.localeCompare(nameB, 'zh-CN');
    });

    // 分配到左右两列（交替分配实现错位效果）
    const leftColumn = [];
    const rightColumn = [];
    currentDayAnime.forEach((anime, index) => {
      if (index % 2 === 0) {
        leftColumn.push(anime);
      } else {
        rightColumn.push(anime);
      }
    });

    this.setData({
      currentDayAnime: currentDayAnime,
      leftColumn: leftColumn,
      rightColumn: rightColumn
    });
  },

  // 选择星期
  selectDay(e) {
    const index = e.currentTarget.dataset.index;
    
    // 保存当前日期的滚动位置
    this.scrollPositions[this.data.selectedDay] = this.currentScrollTop || 0;
    
    // 切换日期
    this.setData({ selectedDay: index });
    this.filterAnimeByDay();
    
    // 切换后回到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 0
    });
    this.currentScrollTop = 0;
    this.setData({ showBackTop: false });
  },

  // 切换上一周
  prevWeek() {
    wx.showToast({ title: '已是当前周', icon: 'none' });
  },

  // 切换下一周
  nextWeek() {
    wx.showToast({ title: '暂不支持跨周查看', icon: 'none' });
  },

  // 跳转详情页
  goToDetail(e) {
    const animeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/anime-detail/anime-detail?id=${animeId}`
    });
  },

  // 切换订阅状态
  toggleSubscribe(e) {
    const animeId = e.currentTarget.dataset.id;
    let subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const index = subscribedIds.indexOf(animeId);

    if (index > -1) {
      subscribedIds.splice(index, 1);
      wx.showToast({ title: '已取消订阅', icon: 'success' });
    } else {
      subscribedIds.push(animeId);
      wx.showToast({ title: '订阅成功', icon: 'success' });
    }

    wx.setStorageSync('subscribedIds', subscribedIds);
    this.updateSubscribeStatus();
  },

  // 更新订阅状态
  updateSubscribeStatus() {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const updateColumn = (column) => column.map(anime => ({
      ...anime,
      isSubscribed: subscribedIds.includes(anime.id)
    }));
    
    const data = {
      currentDayAnime: updateColumn(this.data.currentDayAnime),
      leftColumn: updateColumn(this.data.leftColumn),
      rightColumn: updateColumn(this.data.rightColumn)
    };

    // 同时更新搜索结果的订阅状态
    if (this.data.searchResults.length > 0) {
      data.searchResults = updateColumn(this.data.searchResults);
      data.searchLeftColumn = updateColumn(this.data.searchLeftColumn);
      data.searchRightColumn = updateColumn(this.data.searchRightColumn);
    }

    this.setData(data);
  },

  // 页面滚动监听
  onPageScroll(e) {
    const scrollTop = e.scrollTop;
    // 保存当前滚动位置
    this.currentScrollTop = scrollTop;
    // 滚动超过 300px 显示返回顶部按钮
    if (scrollTop > 300 && !this.data.showBackTop) {
      this.setData({ showBackTop: true });
    } else if (scrollTop <= 300 && this.data.showBackTop) {
      this.setData({ showBackTop: false });
    }
  },

  // 返回顶部
  goToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    });
  },

  // ==================== 搜索功能 ====================

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    // 输入为空时退出搜索模式
    if (!keyword.trim()) {
      this.cancelSearch();
      return;
    }
    
    // 防抖：延迟执行搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.doSearch();
    }, 500);
  },

  // 执行搜索
  doSearch() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      this.cancelSearch();
      return;
    }

    this.setData({ 
      isSearching: true, 
      searchLoading: true 
    });

    // 先从本地数据模糊搜索
    const localResults = this.localSearch(keyword);
    
    if (localResults.length > 0) {
      this.setSearchResults(localResults);
    } else {
      // 本地无结果，调用 API 搜索
      animeData.searchAnime(keyword).then(results => {
        this.setSearchResults(results);
      }).catch(() => {
        this.setData({ 
          searchLoading: false,
          searchResults: [],
          searchLeftColumn: [],
          searchRightColumn: []
        });
      });
    }
  },

  // 本地模糊搜索
  localSearch(keyword) {
    const allAnime = [];
    this.data.calendarData.forEach(dayGroup => {
      dayGroup.items.forEach(item => {
        allAnime.push(item);
      });
    });

    const lowerKeyword = keyword.toLowerCase();
    return allAnime.filter(anime => {
      const name = (anime.name || '').toLowerCase();
      const nameJp = (anime.nameJp || '').toLowerCase();
      // 模糊匹配：名称或日文名包含关键词
      return name.includes(lowerKeyword) || nameJp.includes(lowerKeyword);
    });
  },

  // 设置搜索结果
  setSearchResults(results) {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    const searchResults = results.map(anime => ({
      ...anime,
      isSubscribed: subscribedIds.includes(anime.id)
    }));

    // 分配到左右两列
    const searchLeftColumn = [];
    const searchRightColumn = [];
    searchResults.forEach((anime, index) => {
      if (index % 2 === 0) {
        searchLeftColumn.push(anime);
      } else {
        searchRightColumn.push(anime);
      }
    });

    this.setData({
      searchLoading: false,
      searchResults: searchResults,
      searchLeftColumn: searchLeftColumn,
      searchRightColumn: searchRightColumn
    });
  },

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.cancelSearch();
  },

  // 取消搜索
  cancelSearch() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.setData({
      isSearching: false,
      searchLoading: false,
      searchKeyword: '',
      searchResults: [],
      searchLeftColumn: [],
      searchRightColumn: []
    });
  }
});
