// 定义后端返回数据接口类型
interface ApiResponse {
  code: string;
  data?: Recommendation[];
  msg?: string;
}

// 定义食物推荐数据结构
interface Recommendation {
  id: number;
  day: number;
  mealTime: string;
  carbSource: string;
  proteinSource: string;
  fiberSource: string;
}

// 定义分组后的推荐数据结构
interface GroupedRecommendation {
  day: number;
  items: Recommendation[];
}

// 定义页面数据类型
interface PageData {
  // 轮播相关
  currentTab: string;
  currentIndex: number;
  scrollLeft: number;
  timer: number | null;
  cardWidth: number;

  // 饮食摄入数据
  dietCalories: number;
  remainingCalories: number;
  exerciseCalories: number;
  carbs: number;
  totalCarbs: number;
  protein: number;
  totalProtein: number;
  fat: number;
  totalFat: number;
  calorieGoal: number;

  // 食物推荐数据
  recommendations: GroupedRecommendation[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdateTime: string | null; // 新增：最后更新时间
}

Page({
  data: {
    // 轮播相关
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null,
    cardWidth: 700,

    // 饮食摄入数据
    dietCalories: 0,
    remainingCalories: 1364,
    exerciseCalories: 0,
    carbs: 0,
    totalCarbs: 187.6,
    protein: 0,
    totalProtein: 51.2,
    fat: 0,
    totalFat: 45.5,
    calorieGoal: 1800,

    // 食物推荐数据
    recommendations: [],
    isLoading: true,
    isRefreshing: false,
    lastUpdateTime: null // 新增：最后更新时间
  } as PageData,

  onLoad() {
    this.startAutoScroll();
    this.syncCalorieGoal();
    this.getDietRecommendations();
  },

  onShow() {
    this.syncCalorieGoal();
    if (this.data.recommendations.length === 0 && !this.data.isLoading) {
      this.getDietRecommendations();
    }
  },

  onUnload() {
    this.stopAutoScroll();
  },

  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.getDietRecommendations().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 从storage同步热量目标
  syncCalorieGoal() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const goal = userInfo.calorieGoal || 1800;
    this.setData({ 
      calorieGoal: goal,
      remainingCalories: goal - this.data.dietCalories
    });
  },

  // 检查缓存是否有效
  isCacheValid(cache: any, cacheTime: number): boolean {
    const CACHE_EXPIRE_TIME = 3600000; // 1小时有效期
    return cache && cacheTime && (Date.now() - cacheTime < CACHE_EXPIRE_TIME);
  },

  // 格式化时间显示
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  // 获取饮食推荐数据（主入口）
  async getDietRecommendations(retryCount = 3) {
    const now = Date.now();
    const cache = wx.getStorageSync('dietRecommendations');
    const cacheTime = wx.getStorageSync('dietRecommendationsTime');

    // 非刷新状态且缓存有效时直接使用缓存
    if (!this.data.isRefreshing && this.isCacheValid(cache, cacheTime)) {
      this.setData({
        recommendations: this.groupRecommendations(cache),
        isLoading: false,
        lastUpdateTime: `最后更新：${this.formatTime(cacheTime)}`
      });
      return;
    }

    this.setData({ isLoading: true });

    try {
      const recommendations = await this.fetchWithRetry(retryCount);
      this.handleSuccessResponse(recommendations, now);
    } catch (error) {
      this.handleErrorResponse(error, cache);
    } finally {
      if (this.data.isRefreshing) {
        this.setData({ isRefreshing: false });
      }
    }
  },

  // 带重试的请求封装
  async fetchWithRetry(retryCount: number): Promise<Recommendation[]> {
    try {
      return await this.fetchDietRecommendations();
    } catch (error) {
      if (retryCount <= 0) throw error;
      
      const delay = Math.pow(2, 4 - retryCount) * 1000; // 指数退避
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(retryCount - 1);
    }
  },

  // 处理成功响应
  handleSuccessResponse(recommendations: Recommendation[], timestamp: number) {
    wx.setStorageSync('dietRecommendations', recommendations);
    wx.setStorageSync('dietRecommendationsTime', timestamp);

    this.setData({
      recommendations: this.groupRecommendations(recommendations),
      isLoading: false,
      lastUpdateTime: `最后更新：${this.formatTime(timestamp)}`
    });
  },

  // 处理错误响应
  handleErrorResponse(error: any, cache: any) {
    console.error('获取推荐数据失败:', error);

    // 有缓存时降级使用
    if (cache) {
      const cacheTime = wx.getStorageSync('dietRecommendationsTime');
      this.setData({
        recommendations: this.groupRecommendations(cache),
        isLoading: false,
        lastUpdateTime: `缓存数据：${this.formatTime(cacheTime)}`
      });
      wx.showToast({ 
        title: '网络异常，已显示缓存数据', 
        icon: 'none',
        duration: 2000
      });
    } else {
      this.setData({ isLoading: false });
      wx.showToast({ 
        title: error.message || '服务不可用，请稍后重试', 
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 封装API请求（带超时）
  fetchDietRecommendations(): Promise<Recommendation[]> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://60.205.245.221:9090/api/diet/recommendations',
        method: 'POST',
        timeout: 10000, // 10秒超时
        success: (res) => {
          const response = res.data as ApiResponse;
          if (response.code === '200' && response.data) {
            resolve(response.data);
          } else {
            reject(new Error(response.msg || '推荐数据获取失败'));
          }
        },
        fail: (err) => {
          const errorMsg = err.errMsg.includes('timeout') 
            ? '请求超时，请检查网络' 
            : '网络错误，请稍后重试';
          reject(new Error(errorMsg));
        }
      });
    });
  },

  // 对推荐数据进行分组
  groupRecommendations(recommendations: Recommendation[]): GroupedRecommendation[] {
    const grouped = recommendations.reduce((acc, curr) => {
      if (!acc[curr.day]) {
        acc[curr.day] = [];
      }
      acc[curr.day].push(curr);
      return acc;
    }, {} as Record<number, Recommendation[]>);
    
    return Object.entries(grouped)
      .map(([day, items]) => ({
        day: parseInt(day),
        items: items.sort((a, b) => a.mealTime.localeCompare(b.mealTime))
      }))
      .sort((a, b) => a.day - b.day);
  },

  // 饮食摄入相关方法
  calculateProgress(current: number, total: number): number {
    return Math.min((current / total) * 100, 100);
  },

  calculateRemainingProgress(remaining: number, recommended: number): number {
    const remainingRatio = remaining / recommended;
    const circumference = 2 * Math.PI * 100;
    return (1 - remainingRatio) * circumference;
  },

  getProgressColor(current: number, total: number): string {
    const progress = current / total;
    if (progress < 0.3) return '#FF4D4F'; 
    if (progress < 0.7) return '#FAAD14'; 
    return '#52C41A'; 
  },

  navigateToDietRecord() {
    wx.navigateTo({
      url: '/pages/food/food'
    });
  },

  // 轮播相关方法
  startAutoScroll() {
    const timerId = setInterval(() => {
      const nextIndex = (this.data.currentIndex + 1) % 3;
      this.setData({
        currentIndex: nextIndex,
        scrollLeft: nextIndex * (this.data.cardWidth + 40)
      });
    }, 3000) as unknown as number;
    
    this.setData({ timer: timerId });
  },

  stopAutoScroll() {
    if (this.data.timer !== null) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

   // 跳转到我的数据页面
   navigateToMyData() {
    wx.navigateTo({
      url: '/pages/my-data/my-data',  // 确保路径正确
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  switchTab(e: WechatMiniprogram.BaseEvent<{ tab: string }>) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  }
});