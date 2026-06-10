// pages/overview/overview.js
const animeData = require('../../utils/animeData.js');
const userSync = require('../../utils/userSync.js');

Page({
  data: {
    searchKey: '',
    viewMode: 'grid',
    selectedFilter: 0,
    filterOptions: ['全部', '播出中', '已完结', '即将播出'],
    allAnime: [],
    filteredAnime: [],
    loading: true,
    isSearchResult: false
  },

  onLoad() {
    this.loadAnimeData();
  },

  onShow() {
    if (!this.data.isSearchResult) {
      this.updateSubscribeStatus();
    }
  },

  // 从 Bangumi API 加载番剧数据
  loadAnimeData() {
    this.setData({ loading: true, isSearchResult: false });
    
    animeData.getAllAnime().then(allAnime => {
      this.setData({
        allAnime: allAnime,
        loading: false
      });
      this.filterAnime();
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    });
  },

  // 筛选番剧
  filterAnime() {
    let result = this.data.allAnime;
    const filterText = this.data.filterOptions[this.data.selectedFilter];
    
    // 按状态筛选
    if (filterText !== '全部') {
      const statusMap = { '播出中': 'airing', '已完结': 'finished', '即将播出': 'upcoming' };
      const status = statusMap[filterText];
      if (status) {
        result = result.filter(anime => anime.status == status);
      }
    }

    // 按搜索关键词筛选
    if (this.data.searchKey) {
      const key = this.data.searchKey.toLowerCase();
      result = result.filter(anime => 
        (anime.name && anime.name.toLowerCase().includes(key)) ||
        (anime.nameJp && anime.nameJp.toLowerCase().includes(key))
      );
    }

    // 更新订阅状态
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    result = result.map(anime => ({
      ...anime,
      isSubscribed: subscribedIds.includes(anime.id)
    }));

    this.setData({ filteredAnime: result });
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKey: e.detail.value });
  },

  // 执行搜索（优先调用 API 搜索）
  onSearch() {
    const keyword = this.data.searchKey.trim();
    if (!keyword) {
      this.loadAnimeData();
      return;
    }

    this.setData({ loading: true });
    animeData.searchAnime(keyword).then(results => {
      const subscribedIds = wx.getStorageSync('subscribedIds') || [];
      const filteredAnime = results.map(anime => ({
        ...anime,
        isSubscribed: subscribedIds.includes(anime.id)
      }));
      this.setData({
        filteredAnime: filteredAnime,
        loading: false,
        isSearchResult: true
      });
    }).catch(() => {
      // API 搜索失败时回退到本地筛选
      this.filterAnime();
      this.setData({ loading: false });
    });
  },

  // 选择筛选
  selectFilter(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedFilter: index, isSearchResult: false });
    this.filterAnime();
  },

  // 设置视图模式
  setViewMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  // 跳转详情页
  goToDetail(e) {
    const animeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/anime-detail/anime-detail?id=${animeId}`
    });
  },

  // 切换订阅
  toggleSubscribe(e) {
    e.stopPropagation();
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
    this.filterAnime();
    userSync.syncUserToCloud();
  },

  // 更新订阅状态
  updateSubscribeStatus() {
    const subscribedIds = wx.getStorageSync('subscribedIds') || [];
    this.setData({
      filteredAnime: this.data.filteredAnime.map(anime => ({
        ...anime,
        isSubscribed: subscribedIds.includes(anime.id)
      }))
    });
  }
});
