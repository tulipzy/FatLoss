// 定义食物数据结构接口
interface FoodData {
  dishName: string;
  weight: number;
  calorie: number;
  intro: string;
  kcalPer100g: number;
  density: number;
  volume: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

// 定义饮食记录类型
interface DietRecord {
  dishName: string;
  weight: number;
  calorie: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  time: string;
  date: string; // 明确添加date属性
}

Page({
  data: {
    dishName: "", 
    density: 1.0,   
    previewImage: "", 
    weight: 0,      
    calorie: 0,     
    intro: "",
    kcalPer100g: 0,
    volume: 0,
    nutrition: {    
      protein: 0,   
      carbs: 0,     
      fat: 0,       
      fiber: 0      
    },
    showEditModal: false, 
    calculatedCalorie: 0,
    calculatedWeight: 0
  },

  onLoad(options: { 
    previewImage?: string, 
    dishName?: string, 
    calorie?: string, 
    weight?: string, 
    intro?: string,
    kcalPer100g?: string,
    density?: string,
    volume?: string,
    protein?: string, 
    carbs?: string, 
    fat?: string, 
    fiber?: string 
  }) {
    // 从URL参数加载识别结果
    const previewImage = decodeURIComponent(options.previewImage || "");
    const dishName = decodeURIComponent(options.dishName || "");
    const intro = decodeURIComponent(options.intro || "");
    
    // 解析数值参数
    const weight = parseFloat(options.weight || "0");
    const calorie = parseFloat(options.calorie || "0");
    const kcalPer100g = parseFloat(options.kcalPer100g || "0");
    const density = parseFloat(options.density || "1.0");
    const volume = parseFloat(options.volume || "0");
    
    // 营养成分
    const nutrition = {
      protein: parseFloat(options.protein || "0"),
      carbs: parseFloat(options.carbs || "0"),
      fat: parseFloat(options.fat || "0"),
      fiber: parseFloat(options.fiber || "0")
    };

    this.setData({
      dishName,
      previewImage,
      weight,
      calorie,
      intro,
      kcalPer100g,
      density,
      volume,
      nutrition,
      calculatedCalorie: calorie,
      calculatedWeight: weight
    });
  },

  // 打开编辑弹窗
  onEditData() {
    this.setData({ showEditModal: true });
  },

  // 添加到饮食记录
  onAddToRecord() {
    // 1. 校验输入
    if (!this.data.dishName.trim()) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    if (this.data.calorie <= 0 || isNaN(this.data.calorie)) {
      wx.showToast({ title: '请输入有效热量', icon: 'none' });
      return;
    }
    if (this.data.weight <= 0 || isNaN(this.data.weight)) {
      wx.showToast({ title: '请输入有效重量', icon: 'none' });
      return;
    }

    // 2. 获取动态 userId（从全局或本地存储）
    const app = getApp();
    const userId = app.globalData.userId || wx.getStorageSync('userId') || '';
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      // 可跳转到登录页，这里简化为直接返回
      return;
    }

    // 3. 构造饮食记录数据
    const today = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const recordData: DietRecord = {
      dishName: this.data.dishName,
      weight: this.data.calculatedWeight,
      calorie: this.data.calculatedCalorie,
      nutrition: {
        protein: this.data.nutrition.protein,
        carbs: this.data.nutrition.carbs,
        fat: this.data.nutrition.fat,
        fiber: this.data.nutrition.fiber
      },
      time: new Date().toISOString(),
      date: today,
    };

    // 4. 调用后端接口（携带动态 userId）
    wx.request({
      url: 'http://60.205.245.221:9090/FoodIntake/add',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        userId, // 动态获取的 userId
        foodName: this.data.dishName,
        calorie: this.data.calorie
      },
      success: (res) => {
        console.log('接口请求成功', res.data);
      },
      fail: (err) => {
        console.error('接口请求失败', err);
        wx.showToast({ title: '同步服务端失败，请稍后重试', icon: 'none' });
      }
    });

    // 5. 保存到本地历史记录
    const history = wx.getStorageSync('dietHistory') || [];
    history.push(recordData);
    wx.setStorageSync('dietHistory', history);

    wx.showToast({
      title: '已添加到饮食记录',
      icon: 'success',
      duration: 2000
    });

    // 6. 通知饮食页面刷新
    this.notifyFoodPageRefresh();
    
    setTimeout(() => {
      wx.navigateBack({ delta: 1 });
    }, 1500);
  },

  // 通知饮食页面刷新
  notifyFoodPageRefresh() {
    // 方法1：使用事件总线
    if ((wx as any).eventBus) {
      (wx as any).eventBus.emit('dietRecordAdded');
    }
    
    // 方法2：直接获取页面实例并调用方法
    const pages = getCurrentPages();
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i];
      if (page.route === 'pages/food/food') {
        if (typeof page.loadTodayDietRecords === 'function') {
          page.loadTodayDietRecords();
        }
        break;
      }
    }
    
    // 方法3：设置标志位，在 onShow 时检查
    wx.setStorageSync('shouldRefreshDiet', true);
  },

  // 编辑食物名称
  onDishNameInput(e: WechatMiniprogram.Input) {
    this.setData({ dishName: e.detail.value });
  },

  // 编辑热量
  onCalorieInput(e: WechatMiniprogram.Input) {
    const value = parseFloat(e.detail.value);
    this.setData({
      calorie: isNaN(value) ? 0 : Math.max(0, value)
    }, () => this.updateCalculatedValues());
  },

  // 编辑重量
  onWeightInput(e: WechatMiniprogram.Input) {
    const value = parseFloat(e.detail.value);
    this.setData({
      weight: isNaN(value) ? 0 : Math.max(0, value)
    }, () => this.updateCalculatedValues());
  },

  // 取消编辑
  onCancelEdit() {
    this.setData({ showEditModal: false });
  },

  // 确认编辑
  onConfirmEdit() {
    this.setData({ showEditModal: false });
    wx.showToast({ title: '编辑成功', icon: 'success' });
  },

  // 更新计算后的数值
  updateCalculatedValues() {
    this.setData({
      calculatedCalorie: this.data.calorie,
      calculatedWeight: this.data.weight
    });
  }
});