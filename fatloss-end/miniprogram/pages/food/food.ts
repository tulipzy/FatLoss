// 定义饮食记录类型（与 result 页对齐）
interface DietRecord {
  dishName: string;
  weight: number;
  calorie: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number; // 兼容 result 页的 fiber 字段
  };
  time: string;
  portion: number;
}

// 定义喝水记录类型
interface WaterRecord {
  amount: number;
  time: string;
  date?: Date; // 可选，存日期用于区分每日记录
}

Page({
  data: {
    previewImage: "",
    showSearch: false,
    dietIntake: 0,
    sportConsume: 0,
    recommendCalorie: 1600,
    remainCalorie: 1600,
    progressCircleStyle: "",
    dietList: [] as DietRecord[], 

    // 喝水记录相关
    waterIntake: 0,
    recommendWater: 2000, 
    waterUnit: 'ml',
    waterOptions: [100, 200, 300, 500] as const, 
    selectedWater: 200,
    waterRecords: [] as WaterRecord[], 
    waterProgressRatio: 0, 
    waterProgressBarStyle: "", 
    waterCupStyle: "", 

    // 接口参数（模拟用）
    handLength: 18.0,
    dishType: "bowl" as const, 
    showCameraTip: true
  },

  onLoad() {
    // 初始化热量目标
    this.syncCalorieGoal();
    this.loadTodayDietRecords();
    this.loadWaterRecords();
  },

  onShow() {
    // 页面显示时同步最新热量目标（应对页面未在栈中时的更新）
    this.syncCalorieGoal();
    this.loadTodayDietRecords();
    this.loadWaterRecords(); 
  },

  // 新增：同步热量目标方法（统一入口）
  syncCalorieGoal() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const calorieGoal = Number(userInfo.calorieGoal) || 1800;
    
    // 只有当目标值变化时才更新，避免不必要的重绘
    if (calorieGoal !== this.data.recommendCalorie) {
      this.setData({
        recommendCalorie: calorieGoal,
        remainCalorie: calorieGoal - this.data.dietIntake
      }, () => {
        this.calculateProgress(); // 同步更新进度
      });
      console.log('热量目标已更新为:', calorieGoal);
    }
  },

  onSearch(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value;
    console.log('搜索关键词:', keyword);
  },

  chooseFoodImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'], 
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({ previewImage: tempFilePath });
        this.mockUploadImage(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败: ' + (err.errMsg || ''),
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  mockUploadImage(filePath: string) {
    console.log('模拟文件上传，路径:', filePath);
    const mockFoodData = {
      name: "红烧排骨",
      total_kcal: 450,
      weight_g: 200,
      protein: 20.5,
      carbs: 10.2,
      fat: 35.8,
      fiber: 1.5 // 补充 fiber 字段（与 result 页对齐）
    };

    // 构造完整 DietRecord（与 result 页存储格式一致）
    const dietRecord: DietRecord = {
      dishName: mockFoodData.name,
      weight: mockFoodData.weight_g,
      calorie: mockFoodData.total_kcal,
      nutrition: {
        protein: mockFoodData.protein,
        carbs: mockFoodData.carbs,
        fat: mockFoodData.fat,
        fiber: mockFoodData.fiber // 保留 fiber 字段
      },
      time: new Date().toLocaleString(),
      portion: 1 // 默认份量
    };
    
    this.saveDietRecord(dietRecord);
    this.setData({
      dietIntake: this.data.dietIntake + mockFoodData.total_kcal
    });
    this.calculateProgress();
    
    wx.showToast({
      title: '识别成功',
      icon: 'success',
      duration: 1500
    });

    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/result/result?` +
          `previewImage=${encodeURIComponent(filePath)}&` +
          `dishName=${encodeURIComponent(mockFoodData.name)}&` +
          `calorie=${mockFoodData.total_kcal}&` +
          `weight=${mockFoodData.weight_g}&` +
          `protein=${mockFoodData.protein}&` +
          `carbs=${mockFoodData.carbs}&` +
          `fat=${mockFoodData.fat}&` +
          `fiber=${mockFoodData.fiber}`
      });
    }, 1500);
  },

  saveDietRecord(record: DietRecord) {
    const allRecords = wx.getStorageSync('dietHistory') || [];
    allRecords.push(record);
    wx.setStorageSync('dietHistory', allRecords);
    console.log('保存记录成功，当前总记录数:', allRecords.length);
  },

  calculateProgress() {
    const ratio = (this.data.dietIntake / this.data.recommendCalorie) * 100;
    const remain = this.data.recommendCalorie - this.data.dietIntake;
    
    this.setData({
      progressCircleStyle: `--progress-ratio: ${Math.min(100, ratio)}%`,
      remainCalorie: Math.max(0, remain)  // 确保不为负数
    });
    
    console.log('进度计算:', {
      intake: this.data.dietIntake,
      recommend: this.data.recommendCalorie,
      remain: remain,
      ratio: ratio
    });
  },

  // 加载今日饮食记录
  loadTodayDietRecords() {
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    console.log('从存储加载的所有记录:', allRecords);

    // 统一今日日期格式（YYYY-MM-DD）
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 筛选今日记录（按 time 字段的日期匹配）
    const todayRecords = allRecords.filter((record: DietRecord) => {
      const recordDate = new Date(record.time).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return recordDate === today;
    });

    // 计算今日总热量
    const totalCalorie = todayRecords.reduce((sum: number, record: DietRecord) => {
      return sum + record.calorie;
    }, 0);

    this.setData({
      dietList: todayRecords,
      dietIntake: totalCalorie,
    });
    this.calculateProgress();
    console.log('今日记录加载完成，总热量:', totalCalorie);
  },

  onDeleteRecord(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    const deletedCalorie = allRecords[index].calorie;
    
    allRecords.splice(index, 1);
    wx.setStorageSync('dietHistory', allRecords);
    
    this.setData({
      dietIntake: this.data.dietIntake - deletedCalorie
    });
    this.calculateProgress();
    
    wx.showToast({
      title: '记录已删除',
      icon: 'success',
      duration: 1500
    });
  },

  gotoDietReport() {
    wx.navigateTo({
      url: '/pages/report/report'
    });
  },

  // 喝水记录相关方法
  chooseWaterAmount(e: any) {
    const index = e.detail.value;
    this.setData({ 
      selectedWater: this.data.waterOptions[index] 
    });
  },

  addWater() {
    const amount = this.data.selectedWater;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newWaterIntake = this.data.waterIntake + amount;
    const newWaterRecord: WaterRecord = { amount, time };
    
    this.setData({
      waterIntake: newWaterIntake,
      waterRecords: [...this.data.waterRecords, newWaterRecord],
      waterProgressRatio: (newWaterIntake / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
    
    this.saveWaterRecords();
  },

  deleteWaterRecord(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const deletedAmount = this.data.waterRecords[index].amount;
    
    const newWaterIntake = this.data.waterIntake - deletedAmount;
    this.setData({
      waterIntake: newWaterIntake,
      waterRecords: this.data.waterRecords.filter((_, i) => i !== index),
      waterProgressRatio: (newWaterIntake / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
    
    this.saveWaterRecords();
    
    wx.showToast({ title: '已删除记录', icon: 'none' });
  },

  loadWaterRecords() {
    const allRecords = wx.getStorageSync('waterHistory') as WaterRecord[] || [];
    const today = new Date().toLocaleDateString();
    const todayRecords = allRecords.filter((record: WaterRecord) => {
      return new Date(record.date || new Date()).toLocaleDateString() === today;
    });
    
    const totalWater = todayRecords.reduce((sum: number, record: WaterRecord) => {
      return sum + record.amount;
    }, 0);
    
    this.setData({
      waterIntake: totalWater,
      waterRecords: todayRecords.map(record => ({
        amount: record.amount,
        time: record.time
      })),
      waterProgressRatio: (totalWater / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
  },

  saveWaterRecords() {
    const today = new Date().toLocaleDateString();
    const todayRecords = this.data.waterRecords.map((record: WaterRecord) => ({
      ...record,
      date: new Date()
    }));
    
    const allRecords = wx.getStorageSync('waterHistory') as WaterRecord[] || [];
    const otherRecords = allRecords.filter((record: WaterRecord) => {
      return new Date(record.date || new Date()).toLocaleDateString() !== today;
    });
    
    wx.setStorageSync('waterHistory', [...otherRecords, ...todayRecords]);
  },
  
  updateWaterProgressStyle() {
    const ratio = this.data.waterProgressRatio;
    this.setData({
      waterProgressBarStyle: `width: ${ratio}%;`
    });
  },
  
  updateWaterCupStyle() {
    const ratio = this.data.waterProgressRatio;
    this.setData({
      waterCupStyle: `height: ${ratio}%; opacity: ${Math.max(0.3, ratio/100)}`
    });
  }
});