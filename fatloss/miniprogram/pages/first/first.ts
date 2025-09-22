// 页面接口类型定义
interface ExerciseCaloriesResponse {
  message: string;
  status: string;
  total_calories_burned_today: string;
}

interface Recommendation {
  id: number;
  day: number;
  mealTime: string; // 早餐/午餐/晚餐
  carbSource: string;
  proteinSource: string;
  fiberSource: string;
}

interface GroupedRecommendation {
  day: number;
  items: Recommendation[];
}

interface PageData {
  // 轮播相关
  currentTab: string;
  currentIndex: number;
  scrollLeft: number;
  timer: number | null;
  cardWidth: number;

  // 饮食摄入数据
  dietCalories: number;       // 已摄入热量
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

  // 进度环相关
  progressCircleStyle: string;
  progressAnimation: WechatMiniprogram.Animation | null;

  // 运动记录相关
  exerciseName: string;
  spentTime: number;
  spentTimeDisplay: string;
  showTimeSelector: boolean;
}

Page({
  data: {
    // 轮播相关
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null,
    cardWidth: 700,

    // 饮食摄入数据（初始值）
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
    isResultModalOpen: false,

    // 进度环相关
    progressCircleStyle: "",
    progressAnimation: null,

    // 运动记录相关
    exerciseName: "",
    spentTime: 0,
    spentTimeDisplay: "",
    showTimeSelector: false
  } as PageData,

  /**
   * 页面加载时初始化
   */
  onLoad() {
    this.initEventBus();
    this.startAutoScroll();
    this.syncCalorieData();
    this.getDietRecommendations();
    this.updateProgressCircle(true);
  },

  /**
   * 页面显示时重新同步数据
   */
  onShow() {
    this.syncCalorieData();
    if (this.data.recommendations.length === 0 && !this.data.isLoading) {
      this.getDietRecommendations();
    }
    this.updateProgressCircle();
  },

  /**
   * 页面卸载时清理资源
   */
  onUnload() {
    this.stopAutoScroll();
    this.removeEventBusListener();
  },

  /**
   * 下拉刷新时更新推荐数据
   */
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.getDietRecommendations().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ======================== 热量数据同步相关 ========================
  /**
   * 同步热量数据（从接口+缓存读取并计算）
   */
  syncCalorieData() {
    // 1. 读取用户信息和热量目标
    const userInfo = wx.getStorageSync('userInfo') || {};
    const calorieGoal = userInfo.calorieGoal || wx.getStorageSync('calorieGoal') || 1800;
    const userID = userInfo.id || 1;

    // 2. 读取已摄入热量
    const dietCalories = wx.getStorageSync('dietIntake') || 0;

    // 3. 从接口获取运动消耗（失败时用缓存）
    this.fetchExerciseCaloriesFromAPI(userID).then(exerciseCalories => {
      // 计算剩余热量（目标 - 已摄入 + 运动消耗）
      const remainingCalories = Math.max(0, calorieGoal - dietCalories + exerciseCalories);

      // 4. 读取宏量营养素数据
      const todayNutrition = wx.getStorageSync('todayNutrition') || {
        carbs: 0,
        protein: 0,
        fat: 0
      };

      // 5. 更新UI和进度环
      this.setData({
        calorieGoal,
        dietCalories,
        exerciseCalories,
        remainingCalories,
        carbs: todayNutrition.carbs,
        protein: todayNutrition.protein,
        fat: todayNutrition.fat
      });
      this.updateProgressCircle();
    });
  },

  /**
   * 从API获取今日运动消耗（带缓存降级）
   * @param userID 用户ID
   */
  async fetchExerciseCaloriesFromAPI(userID: number): Promise<number> {
    const apiBaseUrl = 'http://60.205.245.221:5050';
    return new Promise((resolve) => {
      try {
        wx.request({
          url: `${apiBaseUrl}/api/daily_calories?id=${userID}`,
          method: 'GET',
          timeout: 10000,
          header: { 'content-type': 'application/json' },
          success: (res) => {
            const response = res.data as ExerciseCaloriesResponse;
            if (response?.status === 'success' && response.total_calories_burned_today) {
              const exerciseCalories = parseFloat(response.total_calories_burned_today);
              wx.setStorageSync('exerciseCalories', exerciseCalories); // 同步缓存
              resolve(exerciseCalories);
            } else {
              resolve(wx.getStorageSync('exerciseCalories') || 0); // 接口异常用缓存
            }
          },
          fail: () => {
            resolve(wx.getStorageSync('exerciseCalories') || 0); // 请求失败用缓存
          }
        });
      } catch (error) {
        console.error('获取运动消耗失败:', error);
        resolve(wx.getStorageSync('exerciseCalories') || 0); // 异常用缓存
      }
    });
  },

  // ======================== 运动记录相关 ========================
  /**
   * 显示时间选择器并清空原有内容
   */
  showTimeSelector() {
    this.setData({
      spentTime: 0,
      spentTimeDisplay: '',
      showTimeSelector: true
    });
  },

  /**
   * 隐藏时间选择器
   */
  hideTimeSelector() {
    this.setData({
      showTimeSelector: false
    });
  },

  /**
   * 选择运动时间
   */
  selectTime(e: WechatMiniprogram.BaseEvent<{ time: string }>) {
    const time = parseInt(e.currentTarget.dataset.time);
    this.setData({
      spentTime: time,
      spentTimeDisplay: `${time}秒`,
      showTimeSelector: false
    });
  },

  /**
   * 输入运动名称
   */
  inputExerciseName(e: WechatMiniprogram.BaseEvent<{ value: string }>) {
    this.setData({
      exerciseName: e.detail.value
    });
  },

  /**
   * 提交运动记录
   */
  async submitExerciseRecord() {
    const { exerciseName, spentTime } = this.data;
    const userInfo = wx.getStorageSync('userInfo') || {};
    const userID = userInfo.id || 'ee99e75497ed42a98399dda2e63f461f'; // 默认ID

    // 验证输入
    if (!exerciseName || spentTime <= 0) {
      wx.showToast({ 
        title: '请输入有效的运动名称和时间', 
        icon: 'none' 
      });
      return;
    }

    try {
      // 调用添加运动时间接口
      const result = await this.addExerciseTime(userID, exerciseName, spentTime);
      
      if (result.status === 'success') {
        // 更新缓存并通知其他组件
        const app = getApp();
        if (app.globalData?.eventBus) {
          app.globalData.eventBus.emit('exerciseDataChanged');
        }
        
        // 重置表单并显示成功提示
        this.setData({
          exerciseName: '',
          spentTime: 0,
          spentTimeDisplay: ''
        });
        
        wx.showToast({
          title: '运动记录已保存',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('提交运动记录失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 调用添加运动时间接口
   */
  addExerciseTime(id: string, exerciseName: string, spentTime: number): Promise<ExerciseCaloriesResponse> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://60.205.245.221:5050/api/add_spentTime',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          id,
          exercise_name: exerciseName,
          spent_time: spentTime
        },
        success: (res) => {
          resolve(res.data as ExerciseCaloriesResponse);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // ======================== 饮食推荐相关 ========================
  /**
   * 获取饮食推荐（优先缓存，缓存失效则请求接口）
   * @param retryCount 重试次数
   */
  async getDietRecommendations(retryCount = 3) {
    const now = Date.now();
    const cache = wx.getStorageSync('dietRecommendations');
    const cacheTime = wx.getStorageSync('dietRecommendationsTime');

    // 非刷新且缓存有效时直接用缓存
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
      const recommendations = await this.fetchWithRetry(retryCount); // 带重试请求
      this.handleSuccessResponse(recommendations, now); // 成功处理
    } catch (error) {
      this.handleErrorResponse(error, cache); // 失败降级
    } finally {
      if (this.data.isRefreshing) this.setData({ isRefreshing: false });
    }
  },

  /**
   * 检查缓存是否有效（1小时有效期）
   */
  isCacheValid(cache: any, cacheTime: number): boolean {
    const CACHE_EXPIRE_TIME = 3600000; // 1小时
    return !!cache && !!cacheTime && (Date.now() - cacheTime < CACHE_EXPIRE_TIME);
  },

  /**
   * 格式化时间显示
   */
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  },

  /**
   * 带指数退避的重试请求
   */
  async fetchWithRetry(retryCount: number): Promise<Recommendation[]> {
    try {
      return await this.fetchDietRecommendations();
    } catch (error) {
      if (retryCount <= 0) throw error;
      const delay = Math.pow(2, 4 - retryCount) * 1000; // 指数退避（1s→2s→4s）
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(retryCount - 1);
    }
  },

  /**
   * 请求饮食推荐接口
   */
  fetchDietRecommendations(): Promise<Recommendation[]> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'http://60.205.245.221:9090/api/diet/recommendations',
        method: 'GET',
        timeout: 10000,
        success: (res) => {
          const response = res.data as Recommendation[];
          if (Array.isArray(response) && response.length > 0 && response[0].id !== undefined) {
            resolve(response);
          } else {
            reject(new Error('推荐数据格式错误'));
          }
        },
        fail: (err) => {
          const msg = err.errMsg.includes('timeout') ? '请求超时' : '网络错误';
          reject(new Error(msg));
        }
      });
    });
  },

  /**
   * 成功响应处理（更新缓存+UI）
   */
  handleSuccessResponse(recommendations: Recommendation[], timestamp: number) {
    wx.setStorageSync('dietRecommendations', recommendations);
    wx.setStorageSync('dietRecommendationsTime', timestamp);
    this.setData({
      recommendations: this.groupRecommendations(recommendations),
      isLoading: false,
      lastUpdateTime: `最后更新：${this.formatTime(timestamp)}`
    });
  },

  /**
   * 失败响应处理（降级用缓存）
   */
  handleErrorResponse(error: any, cache: any) {
    console.error('获取推荐失败:', error);
    if (cache) {
      const cacheTime = wx.getStorageSync('dietRecommendationsTime');
      this.setData({
        recommendations: this.groupRecommendations(cache),
        isLoading: false,
        lastUpdateTime: `缓存数据：${this.formatTime(cacheTime)}`
      });
      wx.showToast({ title: '网络异常，显示缓存数据', icon: 'none' });
    } else {
      this.setData({ isLoading: false });
      wx.showToast({ title: error.message || '服务不可用', icon: 'none' });
    }
  },

  /**
   * 推荐数据分组（按天分组，按餐点排序）
   */
  groupRecommendations(recommendations: Recommendation[]): GroupedRecommendation[] {
    const mealTimeOrder = { '早餐': 1, '午餐': 2, '晚餐': 3 };
    // 按day分组
    const grouped = recommendations.reduce((acc, curr) => {
      if (!acc[curr.day]) acc[curr.day] = [];
      acc[curr.day].push(curr);
      return acc;
    }, {} as Record<number, Recommendation[]>);
    // 转换为数组并排序
    return Object.entries(grouped)
      .map(([day, items]) => ({
        day: parseInt(day),
        items: items.sort((a, b) => mealTimeOrder[a.mealTime as keyof typeof mealTimeOrder] - mealTimeOrder[b.mealTime as keyof typeof mealTimeOrder])
      }))
      .sort((a, b) => a.day - b.day);
  },

  // ======================== 进度环相关 ========================
  /**
   * 计算进度环样式（含颜色和动画）
   */
  calculateProgressCircleStyle() {
    const consumedCalories = this.data.calorieGoal - this.data.remainingCalories;
    const progressRatio = Math.max(0, Math.min(1, consumedCalories / this.data.calorieGoal));
    const circumference = 2 * Math.PI * 100; // 半径100的圆周长
    const strokeDashoffset = (1 - progressRatio) * circumference;
    return `
      stroke-dasharray: ${circumference};
      stroke-dashoffset: ${strokeDashoffset};
      stroke: ${this.getProgressColor(consumedCalories, this.data.calorieGoal)};
      stroke-width: 12;
      fill: none;
      transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  },

  /**
   * 更新进度环（首次加载无动画，后续带过渡）
   */
  updateProgressCircle(initial = false) {
    if (initial) {
      this.setData({ progressCircleStyle: this.calculateProgressCircleStyle() });
      return;
    }
    // 非首次加载触发过渡动画
    this.setData({ progressCircleStyle: this.calculateProgressCircleStyle() });
  },

  /**
   * 根据进度获取进度环颜色（红→黄→绿）
   */
  getProgressColor(current: number, total: number): string {
    const progress = current / total;
    return progress < 0.3 ? '#FF4D4F' : progress < 0.7 ? '#FAAD14' : '#52C41A';
  },

  // ======================== 事件总线相关 ========================
  /**
   * 初始化事件总线（监听饮食/运动数据变化）
   */
  initEventBus() {
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.on('dietIntakeChanged', this.handleDietIntakeChange.bind(this));
      app.globalData.eventBus.on('exerciseDataChanged', this.handleExerciseDataChange.bind(this));
    }
  },

  /**
   * 移除事件总线监听
   */
  removeEventBusListener() {
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.off('dietIntakeChanged', this.handleDietIntakeChange.bind(this));
      app.globalData.eventBus.off('exerciseDataChanged', this.handleExerciseDataChange.bind(this));
    }
  },

  /**
   * 处理饮食摄入变化（从事件总线接收）
   */
  handleDietIntakeChange() {
    this.syncCalorieData();
    wx.showToast({ title: '饮食数据已更新', icon: 'none' });
  },

  /**
   * 处理运动数据变化（从事件总线接收）
   */
  handleExerciseDataChange() {
    this.syncCalorieData();
    wx.showToast({ title: '运动数据已更新', icon: 'none' });
  },

  // ======================== 轮播相关 ========================
  /**
   * 启动轮播自动滚动
   */
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

  /**
   * 停止轮播自动滚动
   */
  stopAutoScroll() {
    if (this.data.timer !== null) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  /**
   * 切换轮播标签
   */
  switchTab(e: WechatMiniprogram.BaseEvent<{ tab: string }>) {
    this.setData({ currentTab: e.currentTarget.dataset.tab });
  },

  // ======================== 图片生成相关 ========================
  /**
   * 上传图片（从相册/相机选择）
   */
  uploadImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          uploadedImage: res.tempFilePaths[0],
          isSlimmingModalOpen: true
        });
      }
    });
  },

  /**
   * 输入提示文本
   */
  inputPrompt(e: WechatMiniprogram.BaseEvent<{ value: string }>) {
    this.setData({
      promptText: e.detail.value
    });
  },

  /**
   * 关闭瘦身效果模态框
   */
  closeSlimmingModal() {
    this.setData({
      isSlimmingModalOpen: false
    });
  },

  /**
   * 打开瘦身效果模态框
   */
  openSlimmingModal() {
    this.setData({
      isSlimmingModalOpen: true
    });
  },

  /**
   * 关闭结果模态框
   */
  closeResultModal() {
    this.setData({
      isResultModalOpen: false
    });
  },

  /**
   * 调用Replicate模型生成图片
   */
  callReplicateModel(imageUrl: string, prompt: string): Promise<string> {
    const apiToken = "r8_FloiIYiIOjueLAsABMg4Q0qeWMOyjhl0jQgzq";
    const requestUrl = "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions";

    return new Promise((resolve, reject) => {
      wx.request({
        url: requestUrl,
        method: "POST",
        header: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiToken}`,
          "Prefer": "wait"
        },
        data: {
          input: {
            prompt: prompt,
            input_image: imageUrl,
            output_format: "jpg"
          }
        },
        success: (res: any) => {
          const predictionId = res.data.id;
          this.queryPredictionResult(predictionId, apiToken, resolve, reject);
        },
        fail: (err: any) => {
          console.error("预测请求失败：", err);
          reject(err);
        }
      });
    });
  },

  /**
   * 查询预测结果
   */
  queryPredictionResult(predictionId: string, apiToken: string, resolve: Function, reject: Function) {
    const queryUrl = `https://api.replicate.com/v1/predictions/${predictionId}`;
    wx.request({
      url: queryUrl,
      method: "GET",
      header: {
        "Authorization": `Bearer ${apiToken}`
      },
      success: (res: any) => {
        if (res.data.status === "succeeded") {
          resolve(res.data.output);
        } else if (res.data.status === "failed") {
          wx.showToast({ title: "模型生成失败", icon: "none" });
          reject(new Error("模型生成失败"));
        } else {
          setTimeout(() => {
            this.queryPredictionResult(predictionId, apiToken, resolve, reject);
          }, 2000);
        }
      },
      fail: (err: any) => {
        console.error("查询预测结果失败：", err);
        reject(err);
      }
    });
  },

  /**
   * 生成瘦身效果图片
   */
  async generateSlimmingEffect() {
    const { uploadedImage, promptText } = this.data;
    
    if (!uploadedImage) {
      wx.showToast({ title: '请先上传图片', icon: 'none' });
      return;
    }
    
    if (!promptText.trim()) {
      wx.showToast({ title: '请输入提示词', icon: 'none' });
      return;
    }
    
    this.setData({ isProcessing: true });
    
    try {
      const resultImage = await this.callReplicateModel(uploadedImage, promptText);
      
      this.setData({
        resultImage: resultImage,
        isProcessing: false,
        isSlimmingModalOpen: false,
        isResultModalOpen: true
      });
      
      wx.showToast({ title: '生成成功', icon: 'success' });
    } catch (error) {
      console.error('生成瘦身效果失败:', error);
      this.setData({ isProcessing: false });
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    }
  },

  /**
   * 跳转到我的数据页面
   */
  navigateToMyData() {
    wx.navigateTo({
      url: '/pages/my-data/my-data',
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
      }
    });
  }
});
