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
      this.fetchDietData(),
      this.fetchExerciseData(currentUserId)
    ]).then(() => {
      // 计算减重数据
      this.calculateWeightProgress();
    }).finally(() => {
      wx.hideLoading();
    });
  },

  // 获取饮食数据
  fetchDietData(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // 从本地存储读取饮食记录（与历史饮食页面使用相同的数据源）
        const rawRecords = wx.getStorageSync('dietHistory') || [];
        console.log('从本地存储读取的饮食数据:', rawRecords);
  
        if (Array.isArray(rawRecords) && rawRecords.length > 0) {
          // 转换本地数据为前端需要的格式
          const parsedDietRecords = this.parseLocalDietData(rawRecords);
          
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
      } catch (error) {
        console.error('获取饮食数据失败:', error);
        this.setData({
          dietRecords: [],
          hasNoDietData: true,
          errorMessage: '获取饮食数据失败'
        });
      } finally {
        resolve();
      }
    });
  }, // 添加这个逗号
  
  // 解析本地存储的饮食数据为前端需要的格式
  parseLocalDietData(rawRecords: any[]): DietRecordItem[][] {
    // 按日期分组
    const groupedByDate: { [key: string]: any[] } = {};
    
    rawRecords.forEach(record => {
      let date = '';
      
      // 处理不同格式的日期
      if (record.date) {
        date = record.date;
      } else if (record.time) {
        // 尝试从时间戳或时间字符串中提取日期
        try {
          const timestamp = typeof record.time === 'number' ? record.time : new Date(record.time).getTime();
          const dateObj = new Date(timestamp);
          date = `${dateObj.getFullYear()}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`;
        } catch (e) {
          // 如果日期解析失败，使用今天的日期
          const today = new Date();
          date = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
        }
      } else {
        // 如果没有日期信息，使用今天的日期
        const today = new Date();
        date = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
      }
      
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(record);
    });
    
    // 转换为前端需要的格式
    const result: DietRecordItem[][] = [];
    
    Object.keys(groupedByDate).forEach(date => {
      const dailyRecords: DietRecordItem[] = [];
      const dateItems = groupedByDate[date];
      
      // 按餐型分组
      const groupedByMealType: { [key: string]: any[] } = {};
      dateItems.forEach(item => {
        // 为没有mealType的记录设置默认值
        const mealType = item.mealType || '其他';
        if (!groupedByMealType[mealType]) {
          groupedByMealType[mealType] = [];
        }
        groupedByMealType[mealType].push(item);
      });
      
      // 为每个餐型创建记录
      Object.keys(groupedByMealType).forEach(mealType => {
        const mealItems = groupedByMealType[mealType];
        const totalCalories = mealItems.reduce((sum: number, item: any) => sum + (Number(item.calorie) || 0), 0);
        const foodDetails = mealItems.map((item: any) => 
          `${item.dishName || '未知食物'} ${item.weight || 0}${item.unit || 'g'}`
        ).join(', ');
        
        // 获取时间
        let time = '00:00';
        if (mealItems[0]) {
          try {
            if (mealItems[0].time) {
              const timestamp = typeof mealItems[0].time === 'number' ? mealItems[0].time : new Date(mealItems[0].time).getTime();
              const dateObj = new Date(timestamp);
              const hours = dateObj.getHours().toString().padStart(2, '0');
              const minutes = dateObj.getMinutes().toString().padStart(2, '0');
              time = `${hours}:${minutes}`;
            }
          } catch (e) {
            // 时间解析失败，使用默认值
          }
        }
        
        dailyRecords.push({
          time: time,
          mealType: mealType,
          foodDetails: foodDetails,
          calorie: Number(totalCalories.toFixed(1))
        });
      });
      
      result.push(dailyRecords);
    });
    
    // 按日期倒序排序（最新的日期在前）
    return result.sort((a, b) => {
      const dateA = a[0]?.time || '';
      const dateB = b[0]?.time || '';
      return dateB.localeCompare(dateA);
    });
  }, // 添加这个逗号

  // 获取运动数据
  fetchExerciseData(userId: string): Promise<void> {
    return new Promise((resolve) => {
      // 首先尝试从本地缓存获取数据（5分钟内有效）
      const cachedData = wx.getStorageSync("lastExerciseHistory");
      if (cachedData && Date.now() - cachedData.time < 300000) { // 300000ms = 5分钟
        console.log('使用本地缓存的运动数据');
        
        // 转换缓存数据格式为首页所需格式
        const exerciseRecords = this.convertExerciseHistoryToHomeFormat(cachedData.data);
        
        this.setData({
          exerciseRecords: exerciseRecords,
          hasNoExerciseData: false,
          errorMessage: ''
        });
        resolve();
        return;
      }

      // 缓存不存在或已过期，调用API获取数据
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
            
            // 创建用于"我的"界面和"运动减脂"界面的运动历史数据
            const allRecords = backendData.data.map(exerciseItem => {
              // 统一卡路里计算
              const calorie = exerciseItem.calories 
                ? Math.round(exerciseItem.calories) 
                : Math.round((exerciseItem.spent_time || 0) * 10);

              // 统一时间格式处理
              const timeSource = exerciseItem.created_at || exerciseItem.exerciseTime || "";
              let displayTime = "";
              let formattedDate = "";

              if (timeSource) {
                const date = new Date(timeSource);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");

                formattedDate = `${year}年 ${month}月 ${day}日`;
                displayTime = `${hours}:${minutes}`;
              }

              return {
                time: displayTime,
                exerciseName: exerciseItem.exerciseName || exerciseItem.exercise_name || "未知运动",
                calorie: calorie,
                type: exerciseItem.type || "有氧运动",
                date: formattedDate,
                // 保留原始数据供不同页面使用
                original: exerciseItem
              };
            });
            
            // 按日期分组，并计算每日总卡路里
            const groupedRecords: Record<string, any> = {};
            allRecords.forEach(record => {
              const { date } = record;
              if (!groupedRecords[date]) {
                groupedRecords[date] = {
                  date: date,
                  records: [],
                  totalCalorie: 0
                };
              }
              groupedRecords[date].records.push(record);
              groupedRecords[date].totalCalorie += record.calorie;
            });
            
            // 转换分组对象为数组，并按日期倒序排序
            const exerciseHistoryList = Object.values(groupedRecords).sort((a: any, b: any) => {
              const dateA = new Date(a.date.replace(/[年月]/g, "-").replace("日", ""));
              const dateB = new Date(b.date.replace(/[年月]/g, "-").replace("日", ""));
              return dateB.getTime() - dateA.getTime();
            });
            
            // 保存数据到本地缓存，供"我的"界面和"运动减脂"界面使用
            wx.setStorageSync("lastExerciseHistory", {
              time: Date.now(),
              data: exerciseHistoryList
            });
            
            // 发送事件通知其他页面（如运动减脂页面）更新数据
            if ((wx as any).eventBus) {
              (wx as any).eventBus.emit('exerciseDataChanged');
            }
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
  
  // 新增方法：将运动历史数据格式转换为首页所需格式
  convertExerciseHistoryToHomeFormat(historyData: any[]): ExerciseRecords {
    const homeWorkout: HomeWorkoutItem[] = [];
    const outdoorTraining: OutdoorTrainingItem[] = [];
    const gymWorkout: GymWorkoutItem[] = [];
    
    // 收集所有运动记录
    const allRecords: any[] = [];
    historyData.forEach(group => {
      allRecords.push(...group.records);
    });
    
    // 按运动类型分类
    allRecords.forEach(record => {
      const formattedDate = record.date.replace(/[年月]/g, '-').replace('日', '');
      
      const exerciseRecord = {
        name: record.exerciseName || '未知运动',
        detail: '30分钟', // 可以根据实际数据调整
        calorie: record.calorie || 0,
        date: formattedDate
      };
      
      const type = (record.type || '').toLowerCase();
      if (type.includes('home') || type.includes('居家')) {
        homeWorkout.push(exerciseRecord);
      } else if (type.includes('outdoor') || type.includes('户外')) {
        outdoorTraining.push(exerciseRecord);
      } else if (type.includes('gym') || type.includes('健身房')) {
        gymWorkout.push(exerciseRecord);
      } else {
        // 默认放入居家减脂
        homeWorkout.push(exerciseRecord);
      }
    });
    
    // 限制返回最近3条记录
    return {
      homeWorkout: homeWorkout.slice(0, 3),
      outdoorTraining: outdoorTraining.slice(0, 3),
      gymWorkout: gymWorkout.slice(0, 3)
    };
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
  },

  // 查看全部饮食记录
  viewAllDietRecords() {
    try {
      wx.showLoading({ title: '加载中' });
      // 检查用户是否登录（简化版）
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.id) {
        // 未登录用户先登录
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        });
      } else {
        // 已登录用户直接跳转
        wx.navigateTo({
          url: '/pages/historyDiet/historyDiet',
          success: () => {
            wx.hideLoading();
          },
          fail: (err) => {
            console.error('跳转到历史饮食页面失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '跳转失败，请重试',
              icon: 'none'
            });
          }
        });
      }
    } catch (error) {
      console.error('跳转异常:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作异常，请重试',
        icon: 'none'
      });
    }
  },

  // 查看全部运动记录
  viewAllExerciseRecords() {
    try {
      wx.showLoading({ title: '加载中' });
      // 检查用户是否登录（简化版）
      const userInfo = wx.getStorageSync('userInfo');
      if (!userInfo || !userInfo.id) {
        // 未登录用户先登录
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        });
      } else {
        // 已登录用户直接跳转
        wx.navigateTo({
          url: '/pages/exerciseHistory/exerciseHistory',
          success: () => {
            wx.hideLoading();
          },
          fail: (err) => {
            console.error('跳转到运动记录页面失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '跳转失败，请重试',
              icon: 'none'
            });
          }
        });
      }
    } catch (error) {
      console.error('跳转异常:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作异常，请重试',
        icon: 'none'
      });
    }
  }
});