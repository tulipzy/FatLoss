// 定义食物数据结构接口（与 food 页对齐）
interface FoodData {
  dishName: string;
  weight: number;
  calorie: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

// 定义食物数据库类型（保留模拟逻辑，但优先使用 URL 参数）
interface FoodDatabase {
  [key: string]: FoodData;
  "红烧排骨": FoodData;
  "清蒸鱼": FoodData;
  "白米饭": FoodData;
  "蔬菜沙拉": FoodData;
  "default": FoodData;
}

// 定义纠正记录项的类型
interface CorrectionItem {
  original: string;
  corrected: string;
  time: string;
}

// 引入 DietRecord 类型（与 food 页保持一致）
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
  portion: number;
}

Page({
  data: {
    dishName: "", 
    density: 1.0,   
    previewImage: "", 
    weight: 0,      
    calorie: 0,     
    nutrition: {    
      protein: 0,   
      carbs: 0,     
      fat: 0,       
      fiber: 0      
    },
    showEditModal: false, 
    portion: 1, 
    isUserCorrection: false, 
    originalDishName: "",
    // 新增：计算后的营养数据（优化渲染逻辑）
    calculatedNutrition: {
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    }
  },

  onLoad(options: { previewImage?: string, dishName?: string, calorie?: string, weight?: string, protein?: string, carbs?: string, fat?: string, fiber?: string }) {
    // 从 URL 参数加载识别结果
    const previewImage = decodeURIComponent(options.previewImage || "");
    const foodData: FoodData = {
      dishName: decodeURIComponent(options.dishName || ""),
      weight: parseFloat(options.weight || "0"),
      calorie: parseFloat(options.calorie || "0"),
      nutrition: {
        protein: parseFloat(options.protein || "0"),
        carbs: parseFloat(options.carbs || "0"),
        fat: parseFloat(options.fat || "0"),
        fiber: parseFloat(options.fiber || "0")
      }
    };
    
    this.setData({
      ...foodData,
      previewImage, 
      originalDishName: foodData.dishName 
    }, () => {
      this.updateCalculatedNutrition(); // 初始化计算营养数据
    });
    console.log('Result页加载数据:', foodData);
  },

  /**
   * 新增：更新计算后的营养数据（随份量动态变化）
   */
  updateCalculatedNutrition() {
    const { nutrition, portion } = this.data;
    this.setData({
      calculatedNutrition: {
        protein: nutrition.protein * portion,
        carbs: nutrition.carbs * portion,
        fat: nutrition.fat * portion,
        fiber: nutrition.fiber * portion
      }
    });
  },

  /**
   * 打开编辑弹窗
   */
  onEditData() {
    this.setData({
      showEditModal: true
    });
  },

  /**
   * 添加到饮食记录（严格按 DietRecord 格式存储）
   */
  onAddToRecord() {
    // 新增：必填项校验
    if (!this.data.dishName.trim()) {
      wx.showToast({ title: '请输入食物名称', icon: 'none', duration: 2000 });
      return;
    }
    if (this.data.calorie <= 0 || isNaN(this.data.calorie)) {
      wx.showToast({ title: '请输入有效热量', icon: 'none', duration: 2000 });
      return;
    }
    if (this.data.weight <= 0 || isNaN(this.data.weight)) {
      wx.showToast({ title: '请输入有效重量', icon: 'none', duration: 2000 });
      return;
    }

    const recordData: DietRecord = {
      dishName: this.data.dishName,
      weight: this.data.weight,
      calorie: this.data.calorie * this.data.portion, // 热量按份量计算
      nutrition: {
        protein: this.data.nutrition.protein,
        carbs: this.data.nutrition.carbs,
        fat: this.data.nutrition.fat,
        fiber: this.data.nutrition.fiber
      },
      time: new Date().toLocaleString(),
      portion: this.data.portion
    };

    const history = wx.getStorageSync('dietHistory') || [];
    history.push(recordData);
    wx.setStorageSync('dietHistory', history);

    wx.showToast({
      title: '已添加到饮食记录',
      icon: 'success',
      duration: 2000
    });

    // 刷新 food 页数据
    const pages = getCurrentPages();
    const foodPage = pages.find(page => page.route === 'pages/food/food');
    if (foodPage && typeof foodPage.loadTodayDietRecords === 'function') {
      foodPage.loadTodayDietRecords();
    }

    setTimeout(() => {
      wx.navigateBack({ 
        delta: 1,
        success: () => {
          // 二次确认刷新（确保返回后页面更新）
          const currentFoodPage = getCurrentPages().slice(-1)[0];
          if (currentFoodPage && typeof currentFoodPage.loadTodayDietRecords === 'function') {
            currentFoodPage.loadTodayDietRecords();
          }
        }
      });
    }, 1500);
  },

  /**
   * 编辑弹窗输入事件：食物名称
   */
  onDishNameInput(e: WechatMiniprogram.Input) {
    this.setData({
      dishName: e.detail.value
    });
  },

  /**
   * 编辑弹窗输入事件：热量
   */
  onCalorieInput(e: WechatMiniprogram.Input) {
    const value = parseFloat(e.detail.value);
    this.setData({
      calorie: isNaN(value) ? 0 : Math.max(0, value) // 确保非负
    }, () => {
      this.updateCalculatedNutrition(); // 实时更新营养计算
    });
  },

  /**
   * 新增：编辑弹窗输入事件：重量
   */
  onWeightInput(e: WechatMiniprogram.Input) {
    const value = parseFloat(e.detail.value);
    this.setData({
      weight: isNaN(value) ? 0 : Math.max(0, value) // 确保非负
    });
  },

  /**
   * 编辑弹窗输入事件：份量
   */
  onPortionInput(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value);
    const validPortion = isNaN(value) ? 1 : Math.min(Math.max(1, value), 10); // 限制1-10份
    this.setData({
      portion: validPortion
    }, () => {
      this.updateCalculatedNutrition(); // 份量变化时更新营养计算
    });
  },

  /**
   * 取消编辑
   */
  onCancelEdit() {
    this.setData({
      showEditModal: false
    });
  },

  /**
   * 确认编辑
   */
  onConfirmEdit() {
    // 显式同步数据（增强可读性）
    this.setData({
      dishName: this.data.dishName,
      calorie: this.data.calorie,
      weight: this.data.weight,
      portion: this.data.portion,
      showEditModal: false
    });
    this.updateCalculatedNutrition(); // 确认后更新营养数据
    wx.showToast({
      title: '编辑成功',
      icon: 'success',
      duration: 2000
    });
  }
});