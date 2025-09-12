// 定义后端端返回数据接口类型（适配新结构，后端直接返回数组）
interface ApiResponseArray extends Array<Recommendation> {}

// 定义食物推荐数据结构（与后端返回字段完全匹配）
interface Recommendation {
  id: number;
  day: number;
  mealTime: string; // 直接对应后端的"早餐"、"午餐"、"晚餐"
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
  dietCalories: number;       // 已摄入热量（与食物记录页同步）
  remainingCalories: number;  // 剩余热量
  exerciseCalories: number;   // 运动消耗
  carbs: number;              // 已摄入碳水
  totalCarbs: number;         // 推荐碳水
  protein: number;            // 已摄入蛋白质
  totalProtein: number;       // 推荐蛋白质
  fat: number;                // 已摄入脂肪
  totalFat: number;           // 推荐脂肪
  calorieGoal: number;        // 每日热量目标

  // 食物推荐数据
  recommendations: GroupedRecommendation[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdateTime: string | null;
  
  // 图片生成相关
  uploadedImage: string;
  promptText: string;
  resultImage: string;
  isProcessing: boolean;
  isSlimmingModalOpen: boolean;
  isResultModalOpen: boolean;
}

Page({
  data: {
    // 轮播相关
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null,
    cardWidth: 700,

    // 饮食摄入数据（初始化值会被缓存数据覆盖）
    dietCalories: 0,
    remainingCalories: 0,
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
    lastUpdateTime: null,
    
    // 图片生成相关
    uploadedImage: "",
    promptText: "",
    resultImage: "",
    isProcessing: false,
    isSlimmingModalOpen: false,
    isResultModalOpen: false
  } as PageData,

  onLoad() {
    // 初始化事件监听和数据
    this.initEventBus();
    this.startAutoScroll();
    this.syncCalorieData(); // 同步热量数据（优先从缓存读取）
    this.getDietRecommendations();
  },

  onShow() {
    // 每次显示页面时重新同步数据
    this.syncCalorieData();
    if (this.data.recommendations.length === 0 && !this.data.isLoading) {
      this.getDietRecommendations();
    }
  },

  onUnload() {
    this.stopAutoScroll();
    this.removeEventBusListener();
  },

  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.getDietRecommendations().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 初始化事件总线监听（接收食物记录页的更新通知）
  initEventBus() {
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.on('dietIntakeChanged', this.handleDietIntakeChange.bind(this));
    }
  },

  // 移除事件总线监听
  removeEventBusListener() {
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.off('dietIntakeChanged', this.handleDietIntakeChange.bind(this));
    }
  },

  // 处理饮食摄入变化（从事件总线接收）
  handleDietIntakeChange() {
    this.syncCalorieData();
    wx.showToast({
      title: '数据已更新',
      icon: 'none',
      duration: 1000
    });
  },

  // 同步热量数据（核心：从缓存读取并计算）
  syncCalorieData() {
    // 1. 从缓存读取用户信息和热量目标
    const userInfo = wx.getStorageSync('userInfo') || {};
    const calorieGoal = userInfo.calorieGoal || wx.getStorageSync('calorieGoal') || 1800;
    
    // 2. 从缓存读取今日已摄入热量（与食物记录页同步的核心值）
    const dietCalories = wx.getStorageSync('dietIntake') || 0;
    
    // 3. 计算剩余热量（考虑运动消耗）
    const exerciseCalories = wx.getStorageSync('exerciseCalories') || 0;
    const remainingCalories = Math.max(0, calorieGoal - dietCalories + exerciseCalories);
    
    // 4. 同步宏量营养素数据（示例值，实际应从记录计算）
    const todayNutrition = wx.getStorageSync('todayNutrition') || {
      carbs: 0,
      protein: 0,
      fat: 0
    };

    // 5. 更新UI
    this.setData({
      calorieGoal,
      dietCalories,
      exerciseCalories,
      remainingCalories,
      carbs: todayNutrition.carbs,
      protein: todayNutrition.protein,
      fat: todayNutrition.fat
    });
  },

  // 检查缓存是否有效
  isCacheValid(cache: any, cacheTime: number): boolean {
    const CACHE_EXPIRE_TIME = 3600000; // 1小时有效期（与后端每日更新适配）
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

  // 封装API请求（适配后端直接返回数组的结构）
  fetchDietRecommendations(): Promise<Recommendation[]> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://60.205.245.221:9090/api/diet/recommendations',
        method: 'GET',
        timeout: 10000, // 10秒超时
        success: (res) => {
          // 后端直接返回Recommendation数组，验证格式
          const response = res.data as ApiResponseArray;
          if (Array.isArray(response) && response.length > 0 && response[0].id !== undefined) {
            resolve(response);
          } else {
            reject(new Error('推荐数据格式错误'));
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

  // 对推荐数据进行分组（按day分组，按mealTime排序）
  groupRecommendations(recommendations: Recommendation[]): GroupedRecommendation[] {
    // 定义用餐时间的排序权重
    const mealTimeOrder = {
      '早餐': 1,
      '午餐': 2,
      '晚餐': 3
    };
    type MealTimeKey = keyof typeof mealTimeOrder;

    // 按day分组
    const grouped = recommendations.reduce((acc, curr) => {
      if (!acc[curr.day]) {
        acc[curr.day] = [];
      }
      acc[curr.day].push(curr);
      return acc;
    }, {} as Record<number, Recommendation[]>);
    
    // 转换为数组并排序（按day升序，每个day的餐点按早中晚排序）
    return Object.entries(grouped)
      .map(([day, items]) => ({
        day: parseInt(day),
        items: items.sort((a, b) => {
          const timeA = a.mealTime as MealTimeKey;
          const timeB = b.mealTime as MealTimeKey;
          return mealTimeOrder[timeA] - mealTimeOrder[timeB];
        })
      }))
      .sort((a, b) => a.day - b.day);
  },

  // 饮食摄入相关方法（计算进度环参数）
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

  // 跳转至饮食记录页
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
      url: '/pages/my-data/my-data',
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
  },

  // 图片生成相关方法
  uploadImage() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths[0];
        that.setData({
          uploadedImage: tempFilePaths,
          isSlimmingModalOpen: true
        });
      }
    });
  },

  inputPrompt(e: any) {
    this.setData({
      promptText: e.detail.value
    });
  },

  closeSlimmingModal() {
    this.setData({
      isSlimmingModalOpen: false
    });
  },
  openSlimmingModal() {
    this.setData({
      isSlimmingModalOpen: true
    });
  },
  closeResultModal() {
    this.setData({
      isResultModalOpen: false
    });
  },

  // 调用 Replicate 模型接口的方法
  callReplicateModel(imageUrl: string, prompt: string): Promise<string> {
    // 替换为你实际的 REPLICATE_API_TOKEN
    const apiToken = "r8_FloiIYiIOjueLAsABMg4Q0qeWMOyjhl0jQgzq"; 
    const requestUrl = "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions";

    return new Promise((resolve, reject) => {
      wx.request({
        url: requestUrl,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          // 身份验证：Bearer + 空格 + API Token
          "Authorization": `Bearer ${apiToken}`, 
          "Prefer": "wait" // 保持请求打开，等待模型完成
        },
        data: {
          input: {
            prompt: prompt, // 文本提示
            input_image: imageUrl, // 输入图像 URL
            output_format: "jpg" // 输出格式
          }
        },
        success: (res: any) => {
          console.log("预测请求成功，返回数据：", res.data);
          // 从返回结果中获取 prediction_id，用于后续查询/取消操作
          const predictionId = res.data.id;
          // 调用查询接口，获取最终结果
          this.queryPredictionResult(predictionId, apiToken, resolve, reject);
        },
        fail: (err: any) => {
          console.error("预测请求失败，错误信息：", err);
          reject(err);
        }
      });
    });
  },

  // 查询预测结果的方法
  queryPredictionResult(predictionId: string, apiToken: string, resolve: Function, reject: Function) {
    const queryUrl = `https://api.replicate.com/v1/predictions/${predictionId}`;
    wx.request({
      url: queryUrl,
      method: "GET",
      header: {
        "Authorization": `Bearer ${apiToken}`
      },
      success: (res: any) => {
        console.log("预测结果查询成功：", res.data);
        // 根据 res.data.status 判断状态（如 "succeeded" 表示成功，可获取 output）
        if (res.data.status === "succeeded") {
          const outputImage = res.data.output; // 假设 output 是生成的图像 URL
          resolve(outputImage);
        } else if (res.data.status === "failed") {
          wx.showToast({ title: "模型生成失败", icon: "none" });
          reject(new Error("模型生成失败"));
        } else {
          // 若状态为 "processing"，可设置定时器轮询查询
          setTimeout(() => {
            this.queryPredictionResult(predictionId, apiToken, resolve, reject);
          }, 2000); // 每 2 秒查询一次
        }
      },
      fail: (err: any) => {
        console.error("查询预测结果失败：", err);
        reject(err);
      }
    });
  },

  // 生成瘦身效果
  async generateSlimmingEffect() {
    const that = this;
    const { uploadedImage, promptText } = this.data;
    
    if (!uploadedImage) {
      wx.showToast({
        title: '请先上传图片',
        icon: 'none'
      });
      return;
    }
    
    if (!promptText.trim()) {
      wx.showToast({
        title: '请输入提示词',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isProcessing: true
    });
    
    try {
      // 调用 Replicate API
      const resultImage = await this.callReplicateModel(uploadedImage, promptText);
      
      that.setData({
        resultImage: resultImage,
        isProcessing: false,
        isSlimmingModalOpen: false,
        isResultModalOpen: true
      });
      
      wx.showToast({
        title: '生成成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('生成瘦身效果失败:', error);
      that.setData({
        isProcessing: false
      });
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      });
    }
  }
});
