// 定义饮食记录项类型
interface DietRecordItem {
  time: string;
  mealType: string;
  foodDetails: string;
  calorie: number;
}

// 定义运动记录 - 家庭锻炼项类型
interface HomeWorkoutItem {
  name: string;
  detail: string;
  calorie: number;
  date: string;
}

// 定义运动记录 - 户外训练项类型
interface OutdoorTrainingItem {
  name: string;
  detail: string;
  calorie: number;
  date: string;
}

// 定义运动记录 - 健身房锻炼项类型
interface GymWorkoutItem {
  name: string;
  detail: string;
  calorie: number;
  date: string;
}

// 定义运动记录类型
interface ExerciseRecords {
  homeWorkout: HomeWorkoutItem[];
  outdoorTraining: OutdoorTrainingItem[];
  gymWorkout: GymWorkoutItem[];
}

// 定义打卡数据类型
interface CheckInData {
  days: number;
  target: number;
  progress: number;
}

// 假设后端返回的数据类型定义
interface BackendWeightData {
  currentWeight?: number;
  weightChange?: number;
  initialWeight?: number;
  targetWeight?: number;
  dietRecords?: DietRecordItem[][];
  exerciseRecords?: ExerciseRecords;
}

// 新增：后端食品数据接口定义
interface FoodItem {
  foodId: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  weight: number;
  unit: string;
  mealType: string; // 早餐/午餐/晚餐/加餐
  eatingTime: string;
}

interface FoodIntakeResponse {
  status: string;
  data: FoodItem[];
  message?: string;
}

Page({
  data: {
    isLoading: true,
    checkInStatus: {},
    weightData: {
      initial: 0,
      current: 0,
      target: 0
    },
    weightGoal: {},
    calorieData: {},
    checkInData: {
      days: 0,
      target: 0,
      progress: 0
    } as CheckInData,
    currentTab: 0,
    dietRecords: [] as DietRecordItem[][],
    exerciseRecords: {} as ExerciseRecords,
    progressPercent: 0
  },

  onLoad() {
    // 页面加载逻辑
    wx.showLoading({
      title: '加载中',
    });

    // 发起GET请求到后端API - 使用正确的URL和用户ID
    wx.request({
      url: 'http://60.205.245.221:9090/FoodIntake/meal?userId=a631c63702a5453c86fce9a42008e54a',
      method: 'GET',
      timeout: 10000, // 添加超时设置
      success: (res: { data: FoodIntakeResponse }) => {
        console.log('后端数据返回:', res.data);

        // 将user ID存入storage
        wx.setStorageSync('userID', 'a631c63702a5453c86fce9a42008e54a');

        // 处理后端返回的数据
        const backendData = res.data;

        // 如果请求成功且有数据，解析后端数据
        if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
          // 解析后端数据为前端需要的格式
          const parsedDietRecords = this.parseFoodIntakeData(backendData.data);
          
          // 更新页面数据
          this.setData({
            isLoading: false,
            dietRecords: parsedDietRecords,
            weightData: {
              initial: 55.0, // 可从后端获取实际数据
              current: 53.0, // 可从后端获取实际数据
              target: 49.0  // 可从后端获取实际数据
            },
            checkInData: {
              days: 8,       // 可从后端获取实际数据
              target: 10,    // 可从后端获取实际数据
              progress: 80   // 可从后端获取实际数据
            },
            exerciseRecords: this.getMockExerciseRecords() // 可从后端获取实际数据
          });
        } else {
          // 无数据时使用模拟数据
          this.useMockData();
        }

        // 计算减重数据
        this.calculateWeightProgress();
      },
      fail: (err) => {
        console.error('获取数据失败:', err);
        // 请求失败时使用模拟数据作为备份
        this.useMockData();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 解析从后端获取的饮食数据
  parseFoodIntakeData(foodItems: FoodItem[]): DietRecordItem[][] {
    // 创建一个数组来存储三天的饮食记录 [前天, 昨天, 今天]
    const dietRecords: DietRecordItem[][] = [[], [], []];
    
    // 获取当前日期和时间
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    
    // 遍历所有食物项
    foodItems.forEach(item => {
      // 解析食物项的时间
      const itemDate = new Date(item.eatingTime);
      const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      
      // 确定食物项属于哪一天
      let dayIndex = -1;
      if (itemDateOnly.getTime() === today.getTime()) {
        dayIndex = 2; // 今天
      } else if (itemDateOnly.getTime() === yesterday.getTime()) {
        dayIndex = 1; // 昨天
      } else if (itemDateOnly.getTime() === dayBeforeYesterday.getTime()) {
        dayIndex = 0; // 前天
      }
      
      // 如果食物项属于这三天之一，则添加到对应的记录中
      if (dayIndex !== -1) {
        // 格式化时间
        const hours = itemDate.getHours().toString().padStart(2, '0');
        const minutes = itemDate.getMinutes().toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}`;
        
        // 创建饮食记录项
        const dietRecord: DietRecordItem = {
          time: formattedTime,
          mealType: item.mealType,
          foodDetails: `${item.foodName} ${item.weight}${item.unit}`,
          calorie: item.calories
        };
        
        dietRecords[dayIndex].push(dietRecord);
      }
    });
    
    // 按时间排序每个日期的记录
    dietRecords.forEach(dayRecords => {
      dayRecords.sort((a, b) => a.time.localeCompare(b.time));
    });
    
    return dietRecords;
  },

  // 计算减重进度
  calculateWeightProgress() {
    const totalLost = this.data.weightData.initial - this.data.weightData.current;
    const targetLost = this.data.weightData.initial - this.data.weightData.target;
    const remainingLost = targetLost - totalLost;
    const progressPercent = targetLost > 0 ? (totalLost / targetLost) * 100 : 0;
    const formattedTotalLost = totalLost.toFixed(1);

    this.setData({
      'weightGoal.totalLost': totalLost,
      'weightGoal.formattedTotalLost': formattedTotalLost,
      'weightGoal.targetLost': targetLost,
      'weightGoal.remainingLost': remainingLost.toFixed(1),
      'weightGoal.daysInsisted': this.data.checkInData.days || 8,
      'progressPercent': progressPercent
    });
  },

  // 获取模拟饮食记录数据（作为备用）
  getMockDietRecords() {
    return [
      // 前天数据
      [
        { time: '08:30', mealType: '早餐', foodDetails: '牛奶 250ml, 面包 1个, 鸡蛋 1个', calorie: 350 },
        { time: '12:00', mealType: '午餐', foodDetails: '米饭 100g, 红烧肉 100g, 青菜 200g', calorie: 550 },
        { time: '18:30', mealType: '晚餐', foodDetails: '面条 150g, 鸡胸肉 100g, 西兰花 200g', calorie: 450 }
      ],
      // 昨天数据
      [
        { time: '08:00', mealType: '早餐', foodDetails: '豆浆 300ml, 包子 2个', calorie: 320 },
        { time: '12:15', mealType: '午餐', foodDetails: '米饭 100g, 鱼 150g, 青菜 200g', calorie: 500 },
        { time: '18:45', mealType: '晚餐', foodDetails: '粥 200g, 凉拌黄瓜 150g', calorie: 300 }
      ],
      // 今天数据
      [
        { time: '08:15', mealType: '早餐', foodDetails: '酸奶 200ml, 燕麦 50g, 水果 100g', calorie: 330 },
        { time: '12:30', mealType: '午餐', foodDetails: '杂粮饭 100g, 牛肉 100g, 胡萝卜 150g', calorie: 480 }
      ]
    ];
  },

  // 获取模拟运动记录数据（作为备用）
  getMockExerciseRecords() {
    return {
      homeWorkout: [
        { name: 'HIIT训练', detail: '30分钟, 高强度', calorie: 320, date: '今天' },
        { name: '瑜伽拉伸', detail: '45分钟, 低强度', calorie: 180, date: '昨天' },
        { name: '核心训练', detail: '25分钟, 中强度', calorie: 240, date: '前天' }
      ],
      outdoorTraining: [
        { name: '晨跑', detail: '5公里, 35分钟', calorie: 380, date: '今天' },
        { name: '骑行', detail: '15公里, 50分钟', calorie: 420, date: '昨天' },
        { name: '快走', detail: '3公里, 40分钟', calorie: 220, date: '前天' }
      ],
      gymWorkout: [
        { name: '力量训练', detail: '胸部+三头, 60分钟', calorie: 380, date: '今天' },
        { name: '有氧训练', detail: '椭圆机, 45分钟', calorie: 350, date: '昨天' },
        { name: '腿部训练', detail: '深蹲+硬拉, 70分钟', calorie: 450, date: '前天' }
      ]
    };
  },

  // 当API请求失败时使用模拟数据
  useMockData() {
    this.setData({
      isLoading: false,
      weightData: {
        initial: 55.0,
        current: 53.0,
        target: 49.0
      },
      checkInData: {
        days: 8,
        target: 10,
        progress: 80
      },
      dietRecords: this.getMockDietRecords(),
      exerciseRecords: this.getMockExerciseRecords()
    });

    this.calculateWeightProgress();

    wx.showToast({
      title: '网络连接失败，显示本地数据',
      icon: 'none'
    });
  },

  // 格式化数字为一位小数
  formatNumber(num: number) {
    return num.toFixed(1);
  },

  // 切换日期选项卡
  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      currentTab: tab
    });
  },

  // 添加饮食记录
  addDietRecord() {
    wx.navigateTo({
      url: '/pages/addDiet/addDiet'
    });
  }
});
