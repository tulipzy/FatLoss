// 定义食物数据结构接口
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

// 定义食物数据库类型
interface FoodDatabase {
  [key: string]: FoodData;
  "红烧排骨": FoodData;
  "清蒸鱼": FoodData;
  "白米饭": FoodData;
  "蔬菜沙拉": FoodData;
  "default": FoodData;
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    dishName: "", 
    density: 1.0,   
    previewImage: "", 
    weight: 0,      // 食物重量（g）
    calorie: 0,     // 热量（千卡）
    nutrition: {    // 营养成分
      protein: 0,   // 蛋白质（g）
      carbs: 0,     // 碳水化合物（g）
      fat: 0,       // 脂肪（g）
      fiber: 0      // 膳食纤维（g）
    },
    showEditModal: false, // 控制编辑弹窗显示隐藏
    portion: 1 // 份量，默认1份
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options: { previewImage?: string }) {
    // 只接收图片路径（其他数据全部使用模拟数据）
    const previewImage = decodeURIComponent(options.previewImage || "");
    
    // 根据常见食物类型匹配模拟数据
    const mockFoodData = this.getMockFoodData();
    
    this.setData({
      ...mockFoodData,
      previewImage // 保留用户上传的图片
    });
  },

  /**
   * 模拟食物数据库
   */
  getMockFoodData(): FoodData {
    // 常见食物模拟数据
    const foodDatabase: FoodDatabase = {
      "红烧排骨": {
        dishName: "红烧排骨",
        weight: 200,
        calorie: 450,
        nutrition: {
          protein: 20.5,
          carbs: 10.2,
          fat: 35.8,
          fiber: 1.5
        }
      },
      "清蒸鱼": {
        dishName: "清蒸鱼",
        weight: 150,
        calorie: 280,
        nutrition: {
          protein: 25.3,
          carbs: 2.1,
          fat: 18.6,
          fiber: 0.8
        }
      },
      "白米饭": {
        dishName: "白米饭",
        weight: 100,
        calorie: 130,
        nutrition: {
          protein: 2.7,
          carbs: 28.2,
          fat: 0.3,
          fiber: 0.4
        }
      },
      "蔬菜沙拉": {
        dishName: "蔬菜沙拉",
        weight: 150,
        calorie: 120,
        nutrition: {
          protein: 3.2,
          carbs: 10.5,
          fat: 8.1,
          fiber: 4.3
        }
      },
      "default": {
        dishName: "常见菜品",
        weight: 150,
        calorie: 300,
        nutrition: {
          protein: 15,
          carbs: 20,
          fat: 15,
          fiber: 2
        }
      }
    };

    // 获取所有食物键并排除default
    const foodKeys = Object.keys(foodDatabase) as Array<keyof FoodDatabase>;
    const validKeys = foodKeys.filter(key => key !== "default");
    
    // 随机选择一种食物（模拟识别结果）
    const randomKey = validKeys[Math.floor(Math.random() * validKeys.length)];
    
    return foodDatabase[randomKey];
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
   * 添加到饮食记录
   */
  onAddToRecord() {
    const recordData = {
      dishName: this.data.dishName,
      weight: this.data.weight,
      calorie: this.data.calorie,
      nutrition: this.data.nutrition,
      time: new Date().toLocaleString(),
      portion: this.data.portion
    };

    // 获取历史记录或初始化空数组
    const history = wx.getStorageSync('dietHistory') || [];
    history.push(recordData);
    wx.setStorageSync('dietHistory', history);

    wx.showToast({
      title: '已添加到饮食记录',
      icon: 'success',
      duration: 2000
    });
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
    if (!isNaN(value)) {
      this.setData({
        calorie: value
      });
    }
  },

  /**
   * 编辑弹窗输入事件：份量
   */
  onPortionInput(e: WechatMiniprogram.Input) {
    const value = parseInt(e.detail.value);
    if (!isNaN(value) && value > 0) {
      this.setData({
        portion: value
      });
    }
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
    wx.showToast({
      title: '编辑成功',
      icon: 'success',
      duration: 2000
    });
    this.setData({
      showEditModal: false
    });
  }
});