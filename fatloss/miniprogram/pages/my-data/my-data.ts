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

// 运动记录相关接口定义
interface RecentExercisesResponse {
  status: string;
  data: any[];
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
    // 确保exerciseRecords有正确的内部结构，即使没有数据
    exerciseRecords: {
      homeWorkout: [],
      outdoorTraining: [],
      gymWorkout: []
    } as ExerciseRecords,
    progressPercent: 0,
    hasNoDietData: false,   // 饮食日记无数据标志
    hasNoExerciseData: false, // 运动记录无数据标志
    // 添加API基础地址，与sport.ts保持一致
    apiBaseUrl: 'http://60.205.245.221:5050',
    // 添加错误提示信息
    errorMessage: ''
  },

  onLoad() {
    // 页面加载逻辑
    wx.showLoading({
      title: '加载中',
    });

    // 首先从缓存中获取用户ID
    const userId = wx.getStorageSync('userID');
    
    // 从本地存储中获取用户体重信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 设置初始体重数据，使用用户存储的体重信息，如果没有则使用默认值
    const initialWeightData = {
      initial: userInfo.weight || 0,
      current: userInfo.weight || 0,
      target: userInfo.target_weight || userInfo.targetWeight || 0 // 同时检查下划线和驼峰格式
    };

    // 如果缓存中没有用户ID，使用默认ID
    const currentUserId = userId || 'a631c63702a5453c86fce9a42008e54a';

    // 先更新体重数据，避免页面显示空白
    this.setData({
      weightData: initialWeightData,
      isLoading: false // 立即设置为非加载状态，避免页面一直显示加载
    });

    // 并发请求饮食数据和运动数据
    Promise.all([
      this.fetchDietData(currentUserId),
      this.fetchExerciseData(currentUserId)
    ]).then(() => {
      // 计算减重数据
      this.calculateWeightProgress();
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // 获取饮食数据
  fetchDietData(userId: string): Promise<void> {
    return new Promise((resolve) => {
      // 发起GET请求到后端API - 使用动态构建的URL
      wx.request({
        // 使用正确的API基础地址
        url: `${this.data.apiBaseUrl}/FoodIntake/meal?userId=${userId}`,
        method: 'GET',
        timeout: 10000, // 添加超时设置
        success: (res: { data: FoodIntakeResponse }) => {
          console.log('后端饮食数据返回:', res.data);

          // 处理后端返回的数据
          const backendData = res.data;

          // 如果请求成功且有数据，解析后端数据
          if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
            // 解析后端数据为前端需要的格式
            const parsedDietRecords = this.parseFoodIntakeData(backendData.data);
            
            // 更新页面数据
            this.setData({
              dietRecords: parsedDietRecords,
              hasNoDietData: false,
              errorMessage: ''
            });
          } else {
            // 无饮食数据时的处理
            this.setData({
              dietRecords: [],
              hasNoDietData: true,
              errorMessage: ''
            });
          }
        },
        fail: (err) => {
          console.error('获取饮食数据失败:', err);
          // 请求失败时的处理，显示错误信息
          this.setData({
            dietRecords: [],
            hasNoDietData: true,
            errorMessage: '获取饮食数据失败，请检查网络连接'
          });
          // 显示错误提示
          wx.showToast({
            title: '获取饮食数据失败',
            icon: 'none'
          });
        },
        complete: () => {
          resolve();
        }
      });
    });
  },

  // 获取运动数据
  fetchExerciseData(userId: string): Promise<void> {
    return new Promise((resolve) => {
      // 发起GET请求到后端API获取运动数据
      wx.request({
        // 使用正确的API基础地址和路径
        url: `${this.data.apiBaseUrl}/api/recent_exercises?id=${userId}`,
        method: 'GET',
        timeout: 10000,
        success: (res: { data: RecentExercisesResponse }) => {
          console.log('后端运动数据返回:', res.data);

          // 处理后端返回的数据
          const backendData = res.data;

          // 如果请求成功且有数据，解析后端数据
          if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
            // 解析后端数据为前端需要的格式
            const exerciseRecords = this.parseExerciseData(backendData.data);
            
            // 更新页面数据
            this.setData({
              exerciseRecords: exerciseRecords,
              hasNoExerciseData: false,
              errorMessage: ''
            });
          } else {
            // 无运动数据时的处理
            this.setData({
              exerciseRecords: {
                homeWorkout: [],
                outdoorTraining: [],
                gymWorkout: []
              },
              hasNoExerciseData: true,
              errorMessage: ''
            });
          }
        },
        fail: (err) => {
          console.error('获取运动数据失败:', err);
          // 请求失败时的处理，显示错误信息
          this.setData({
            exerciseRecords: {
              homeWorkout: [],
              outdoorTraining: [],
              gymWorkout: []
            },
            hasNoExerciseData: true,
            errorMessage: '获取运动数据失败，请检查网络连接'
          });
          // 显示错误提示
          wx.showToast({
            title: '获取运动数据失败',
            icon: 'none'
          });
        },
        complete: () => {
          resolve();
        }
      });
    });
  },

  // 解析后端运动数据为前端格式
  parseExerciseData(exerciseItems: any[]): ExerciseRecords {
    const homeWorkout: HomeWorkoutItem[] = [];
    const outdoorTraining: OutdoorTrainingItem[] = [];
    const gymWorkout: GymWorkoutItem[] = [];

    exerciseItems.forEach(item => {
      // 尝试从不同可能的字段获取卡路里数据
      let calorieValue = 0;
      if (typeof item.calories === 'number' && item.calories > 0) {
        calorieValue = item.calories;
      } else if (typeof item.calorie === 'number' && item.calorie > 0) {
        calorieValue = item.calorie;
      } else if (typeof item.spent_time === 'number') {
        // 如果没有直接的卡路里数据，基于时间估算
        calorieValue = Math.round(item.spent_time * 10);
      }

      // 格式化日期
      let formattedDate = '未知日期';
      if (item.created_at) {
        const dateObj = new Date(item.created_at);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }

      // 创建运动记录项
      const record = {
        name: item.exercise_name || '未知运动',
        detail: item.detail || '30分钟', // 可以根据实际数据调整
        calorie: calorieValue,
        date: formattedDate
      };

      // 根据运动类型分类
      const type = (item.type || '').toLowerCase();
      if (type.includes('home') || type.includes('居家')) {
        homeWorkout.push(record);
      } else if (type.includes('outdoor') || type.includes('户外')) {
        outdoorTraining.push(record);
      } else if (type.includes('gym') || type.includes('健身房')) {
        gymWorkout.push(record);
      } else {
        // 默认放入居家减脂
        homeWorkout.push(record);
      }
    });

    // 限制返回最近3条记录（如果有更多）
    return {
      homeWorkout: homeWorkout.slice(0, 3),
      outdoorTraining: outdoorTraining.slice(0, 3),
      gymWorkout: gymWorkout.slice(0, 3)
    };
  },

  // 解析后端食品摄入数据为前端格式
  parseFoodIntakeData(foodItems: FoodItem[]): DietRecordItem[][] {
    // 按日期分组
    const groupedByDate: { [key: string]: FoodItem[] } = {};
    
    foodItems.forEach(item => {
      // 提取日期部分（假设eatingTime格式为 YYYY-MM-DD HH:mm:ss）
      const date = item.eatingTime.split(' ')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(item);
    });
    
    // 转换为前端需要的格式
    const result: DietRecordItem[][] = [];
    
    Object.keys(groupedByDate).forEach(date => {
      const dailyRecords: DietRecordItem[] = [];
      const dateItems = groupedByDate[date];
      
      // 按餐型分组
      const groupedByMealType: { [key: string]: FoodItem[] } = {};
      dateItems.forEach(item => {
        if (!groupedByMealType[item.mealType]) {
          groupedByMealType[item.mealType] = [];
        }
        groupedByMealType[item.mealType].push(item);
      });
      
      // 为每个餐型创建记录
      Object.keys(groupedByMealType).forEach(mealType => {
        const mealItems = groupedByMealType[mealType];
        const totalCalories = mealItems.reduce((sum, item) => sum + item.calories, 0);
        const foodDetails = mealItems.map(item => 
          `${item.foodName} ${item.weight}${item.unit}`
        ).join(', ');
        
        // 获取时间（取第一个项目的时间）
        const time = mealItems[0].eatingTime.split(' ')[1].substring(0, 5);
        
        dailyRecords.push({
          time: time,
          mealType: mealType,
          foodDetails: foodDetails,
          calorie: totalCalories
        });
      });
      
      result.push(dailyRecords);
    });
    
    return result;
  },

  // 计算减重进度 - 根据当前体重与目标体重来计算圆环进度
  calculateWeightProgress() {
    // 确保weightData对象存在
    const weightData = this.data.weightData || {};
    const initial = weightData.initial || 0;
    const current = weightData.current || 0;
    const target = weightData.target || 0;
    
    // 计算总减重和目标减重
    const totalLost = initial - current;
    const targetLost = initial - target;
    const remainingLost = targetLost - totalLost;
    const formattedTotalLost = totalLost.toFixed(1);
    
    // 新的进度计算逻辑：进度 = (当前体重 / 目标体重) * 100%
    let progressPercent = 0;
    if (target > 0) {
      // 计算进度百分比
      progressPercent = (current / target) * 100;
      // 超额处理：如果超过100%，则设置为100%
      progressPercent = Math.min(100, progressPercent);
    }
    
    // 根据进度百分比确定颜色
    let progressColor = '#1890FF'; // 默认蓝色
    if (progressPercent <= 30) {
      progressColor = '#FF4D4F'; // 红色：0%-30%
    } else if (progressPercent <= 70) {
      progressColor = '#FAAD14'; // 黄色：31%-70%
    } else {
      progressColor = '#52C41A'; // 绿色：71%-100%
    }

    this.setData({
      'weightGoal.totalLost': totalLost,
      'weightGoal.formattedTotalLost': formattedTotalLost,
      'weightGoal.targetLost': targetLost,
      'weightGoal.remainingLost': remainingLost.toFixed(1),
      'weightGoal.daysInsisted': this.data.checkInData?.days || 0,
      'progressPercent': progressPercent,
      'progressColor': progressColor // 新增：进度条颜色
    });
  },
  
  // 添加：处理用户输入当前体重
  onCurrentWeightInput(e: any) {
    const newWeight = parseFloat(e.detail.value) || 0;
    if (!isNaN(newWeight)) {
      // 更新当前体重
      this.setData({
        'weightData.current': newWeight
      });
      // 重新计算减重进度
      this.calculateWeightProgress();
      // 保存到本地存储
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.weight = newWeight;
      wx.setStorageSync('userInfo', userInfo);
    }
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