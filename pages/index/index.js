// pages/index/index.js
const animeData = require('../../utils/animeData.js');
const anilist = require('../../utils/anilist.js');
const userSync = require('../../utils/userSync.js');

Page({
  data: {
    currentWeek: 1,
    weekDateRange: '',
    selectedDay: 0,
    todayIndex: 0,
    weekDays: [],
    // Swiper 数据 - 7天的番剧数据
    dayAnimeList: [[], [], [], [], [], [], []],
    dayColumns: [
      { left: [], right: [] },
      { left: [], right: [] },
      { left: [], right: [] },
      { left: [], right: [] },
      { left: [], right: [] },
      { left: [], right: [] },
      { left: [], right: [] }
    ],
    scrollPositions: [0, 0, 0, 0, 0, 0, 0],
    calendarData: [],
    loading: true,
    showBackTop: false,
    scrollToTop: false,
    // 搜索相关
    searchKeyword: '',
    isSearching: false,
    searchLoading: false,
    searchResults: [],
    searchLeftColumn: [],
    searchRightColumn: [],
    pressingDay: -1
  },

  onLoad() {
    this.initWeekData();
    // 先尝试从缓存加载数据
    this.loadFromCache();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.updateSubscribeStatus();
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

  // 从缓存加载数据
  loadFromCache() {
    const cachedData = wx.getStorageSync('calendarCache');
    const cacheTime = wx.getStorageSync('calendarCacheTime');
    const now = Date.now();
    
    // 缓存有效期：30分钟
    const CACHE_VALID_TIME = 30 * 60 * 1000;
    
    // 检查缓存数据是否包含 coverLow 字段（版本兼容）
    const hasCoverLow = cachedData && cachedData.length > 0 && 
      cachedData[0].items && cachedData[0].items[0] && 
      (cachedData[0].items[0].coverLow || cachedData[0].items[0].cover);
    
    if (cachedData && cacheTime && (now - cacheTime) < CACHE_VALID_TIME && hasCoverLow) {
      console.log('使用缓存数据');
      this.processCalendarData(cachedData);
    } else {
      console.log('缓存过期或不存在，从网络加载');
      this.loadAnimeData();
    }
  },

  // 保存数据到缓存
  saveToCache(calendarData) {
    wx.setStorageSync('calendarCache', calendarData);
    wx.setStorageSync('calendarCacheTime', Date.now());
  },

  // 处理日历数据（复用逻辑）
  processCalendarData(calendarData) {
    // 更新每天的番剧数量
    const weekDays = this.data.weekDays.map((day, index) => {
      const dayGroup = calendarData.find(g => g.weekday.id == index + 1);
      const count = dayGroup ? dayGroup.items.length : 0;
      return { ...day, count };
    });

    // 处理7天的数据
    const dayAnimeList = [];
    const dayColumns = [];
    
    for (let i = 0; i < 7; i++) {
      const dayGroup = calendarData.find(g => g.weekday.id == i + 1);
      let dayAnime = dayGroup ? dayGroup.items : [];

      // 更新订阅状态
      const subscribedIds = wx.getStorageSync('subscribedIds') || [];
      dayAnime = dayAnime.map(anime => ({
        ...anime,
        isSubscribed: subscribedIds.includes(anime.id)
      }));

      // 排序
      dayAnime.sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }
        const nameA = (a.name || a.nameJp || '').toLowerCase();
        const nameB = (b.name || b.nameJp || '').toLowerCase();
        return nameA.localeCompare(nameB, 'zh-CN');
      });

      // 分配到左右两列
      const left = [];
      const right = [];
      dayAnime.forEach((anime, idx) => {
        if (idx % 2 === 0) {
          left.push(anime);
        } else {
          right.push(anime);
        }
      });

      dayAnimeList.push(dayAnime);
      dayColumns.push({ left, right });
    }

    this.setData({
      calendarData: calendarData,
      weekDays: weekDays,
      dayAnimeList: dayAnimeList,
      dayColumns: dayColumns,
      loading: false
    });

    // 延迟预加载高质量图片
    this.preloadHighQualityImages(dayAnimeList);

    // 补充没有中文译名的番剧信息
    this.supplementMissingNames(dayAnimeList);
  },

  // 从 AniList 补充缺少中文译名的番剧
  supplementMissingNames(dayAnimeList) {
    const missingList = [];
    dayAnimeList.forEach(dayAnime => {
      dayAnime.forEach(anime => {
        // 检测是否缺少中文译名（name 和 nameJp 相同说明没有中文翻译）
        if (anime.name === anime.nameJp || !anime.name) {
          missingList.push({
            id: anime.id,
            nameJp: anime.nameJp
          });
        }
      });
    });

    if (missingList.length === 0) return;

    // 逐个从 AniList 搜索补充（控制并发）
    const supplementMap = {};
    let index = 0;

    const searchNext = () => {
      if (index >= missingList.length) {
        // 全部搜索完毕，应用更新
        this.applySupplementNames(supplementMap);
        return;
      }

      const item = missingList[index++];
      anilist.searchAnime(item.nameJp, 1, 1).then(results => {
        if (results.length > 0) {
          const found = results[0];
          // 优先用英文名，其次罗马音
          const supplementName = found.nameEn || found.name || '';
          if (supplementName && supplementName !== item.nameJp) {
            supplementMap[item.id] = supplementName;
          }
        }
        // 间隔 300ms 避免请求过快
        setTimeout(searchNext, 300);
      }).catch(() => {
        setTimeout(searchNext, 300);
      });
    };

    // 延迟 2 秒后开始，不影响首屏加载
    setTimeout(searchNext, 2000);
  },

  // 应用 AniList 补充的名称
  applySupplementNames(supplementMap) {
    if (Object.keys(supplementMap).length === 0) return;

    const dayColumns = this.data.dayColumns.map(day => ({
      left: day.left.map(anime => ({
        ...anime,
        nameEn: supplementMap[anime.id] || anime.nameEn || ''
      })),
      right: day.right.map(anime => ({
        ...anime,
        nameEn: supplementMap[anime.id] || anime.nameEn || ''
      }))
    }));

    this.setData({ dayColumns });
  },

  // 渐进式图片加载：先显示低质量图，预加载高质量图后无缝替换
  preloadHighQualityImages(dayAnimeList) {
    // 收集所有需要替换的图片
    const preloadList = [];
    dayAnimeList.forEach(dayAnime => {
      dayAnime.forEach(anime => {
        if (anime.coverLow && anime.cover && anime.coverLow !== anime.cover) {
          preloadList.push({
            id: anime.id,
            lowRes: anime.coverLow,
            highRes: anime.cover
          });
        }
      });
    });

    if (preloadList.length === 0) return;

    // 延迟 1 秒后开始预加载，等页面稳定
    setTimeout(() => {
      let loadedCount = 0;
      const updateMap = {};

      preloadList.forEach(item => {
        wx.getImageInfo({
          src: item.highRes,
          success: () => {
            updateMap[item.id] = true;
            loadedCount++;
            // 每加载完 5 张批量更新一次，减少 setData 频率
            if (loadedCount % 5 === 0 || loadedCount === preloadList.length) {
              this.applyHighQualityImages(updateMap);
            }
          },
          fail: () => {
            loadedCount++;
          }
        });
      });
    }, 1000);
  },

  // 将高质量图片应用到视图
  applyHighQualityImages(updateMap) {
    if (Object.keys(updateMap).length === 0) return;

    const dayColumns = this.data.dayColumns.map(day => ({
      left: day.left.map(anime => ({
        ...anime,
        useHighRes: updateMap[anime.id] ? true : (anime.useHighRes || false)
      })),
      right: day.right.map(anime => ({
        ...anime,
        useHighRes: updateMap[anime.id] ? true : (anime.useHighRes || false)
      }))
    }));

    this.setData({ dayColumns });
  },

  // 从 Bangumi API 加载番剧数据
  loadAnimeData() {
    this.setData({ loading: true });
    
    animeData.getCalendarData().then(calendarData => {
      // 保存到缓存
      this.saveToCache(calendarData);
      // 处理数据
      this.processCalendarData(calendarData);
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    });
  },

  // Swiper 切换事件
  onSwiperChange(e) {
    const newIndex = e.detail.current;
    this.setData({ 
      selectedDay: newIndex,
      showBackTop: false
    });
  },

  // 点击星期标签
  selectDay(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ selectedDay: index });
  },

  // 星期标签触摸开始
  onDayTouchStart(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ pressingDay: index });
  },

  // 星期标签触摸结束
  onDayTouchEnd(e) {
    this.setData({ pressingDay: -1 });
  },

  // 滚动监听 - 只控制返回顶部按钮，不回写 scrollPositions
  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    // 用实例变量记录滚动位置，避免 setData 触发重渲染
    this._scrollTop = scrollTop;
    // 节流控制 showBackTop
    if (scrollTop > 300 !== this.data.showBackTop) {
      this.setData({ showBackTop: scrollTop > 300 });
    }
  },

  // 返回顶部
  goToTop() {
    this.setData({ 
      showBackTop: false,
      scrollToTop: true
    });
    // 重置标志
    setTimeout(() => {
      this.setData({ scrollToTop: false });
    }, 100);
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
    userSync.syncUserToCloud();
  },

  // 更新订阅状态
  updateSubscribeStatus() {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    
    // 更新7天的数据
    const dayAnimeList = this.data.dayAnimeList.map(dayAnime => 
      dayAnime.map(anime => ({
        ...anime,
        isSubscribed: subscribedIds.includes(anime.id)
      }))
    );
    
    const dayColumns = dayAnimeList.map(dayAnime => {
      const left = [];
      const right = [];
      dayAnime.forEach((anime, idx) => {
        if (idx % 2 === 0) {
          left.push(anime);
        } else {
          right.push(anime);
        }
      });
      return { left, right };
    });

    const data = {
      dayAnimeList: dayAnimeList,
      dayColumns: dayColumns
    };

    // 同时更新搜索结果的订阅状态
    if (this.data.searchResults.length > 0) {
      data.searchResults = this.data.searchResults.map(anime => ({
        ...anime,
        isSubscribed: subscribedIds.includes(anime.id)
      }));
      const searchLeftColumn = [];
      const searchRightColumn = [];
      data.searchResults.forEach((anime, idx) => {
        if (idx % 2 === 0) {
          searchLeftColumn.push(anime);
        } else {
          searchRightColumn.push(anime);
        }
      });
      data.searchLeftColumn = searchLeftColumn;
      data.searchRightColumn = searchRightColumn;
    }

    this.setData(data);
  },

  // ==================== 搜索功能 ====================

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    if (!keyword.trim()) {
      this.cancelSearch();
      return;
    }
    
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

    const localResults = this.localSearch(keyword);
    
    if (localResults.length > 0) {
      this.setSearchResults(localResults);
    } else {
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
    this.data.dayAnimeList.forEach(dayAnime => {
      dayAnime.forEach(item => {
        allAnime.push(item);
      });
    });

    const lowerKeyword = keyword.toLowerCase();
    return allAnime.filter(anime => {
      const name = (anime.name || '').toLowerCase();
      const nameJp = (anime.nameJp || '').toLowerCase();
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
  },

  // 搜索聚焦
  onSearchFocus() {
    // 可以在这里添加搜索建议
  },

  // 图片加载失败处理
  onImageError(e) {
    const animeId = e.currentTarget.dataset.id;
    console.log('图片加载失败:', animeId);
    // 可以在这里设置默认占位图
  }
});
