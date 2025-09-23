// 运动记录接口定义
interface ExerciseRecord {
  time: string;
  exerciseName: string;
  calorie: number;
  type: string; // 运动类型
}

interface GroupedExercise {
  date: string;
  records: ExerciseRecord[];
  totalCalorie: number;
}

// 运动记录类型接口
interface ExerciseItem {
  exerciseId: string;
  exerciseName: string;
  calories: number;
  duration: number;
  type: string;
  exerciseTime: string;
}

interface ExerciseResponse {
  status: string;
  data: ExerciseItem[];
  message?: string;
}

// 需要的接口定义
interface RecentExercisesResponse {
  status: string;
  data: any[];
  message?: string;
}

// 移到 Page 对象外部，作为普通函数定义
function numberToRoman(num: number): string {
  const romanNumerals: { [key: string]: number } = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1
  };
  
  let result = '';
  for (const key in romanNumerals) {
    while (num >= romanNumerals[key]) {
      result += key;
      num -= romanNumerals[key];
    }
  }
  return result;
}

Page({
  data: {
    exerciseHistoryList: [] as GroupedExercise[],
    searchKeyword: '',
    originalExerciseList: [] as GroupedExercise[],
    isLoading: true,
    apiBaseUrl: 'http://60.205.245.221:5050' // 添加API基础地址，与sport.ts保持一致
  },

  // 页面加载时执行
  onLoad() {
    wx.showLoading({
      title: '加载中',
    });
    
    // 尝试从缓存加载最近的数据
    const cachedData = wx.getStorageSync('lastExerciseHistory');
    if (cachedData && Date.now() - cachedData.time < 300000) { // 5分钟内的缓存有效
      this.setData({
        exerciseHistoryList: cachedData.data,
        originalExerciseList: cachedData.data,
        isLoading: false
      });
      wx.hideLoading();
    }
    
    // 无论是否有缓存，都从服务器刷新最新数据
    this.loadExerciseHistoryRecords();
  },

  // 下拉刷新功能
  onPullDownRefresh() {
    this.loadExerciseHistoryRecords();
    wx.stopPullDownRefresh();
  },

  // 页面隐藏时保存数据到缓存
  onHide() {
    // 页面隐藏时保存当前数据到缓存
    wx.setStorageSync('lastExerciseHistory', {
      time: Date.now(),
      data: this.data.exerciseHistoryList
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '我的运动记录',
      path: '/pages/exerciseHistory/exerciseHistory',
      imageUrl: '/images/运动记录.jpg' // 使用项目中已有的图片
    };
  },

  // 加载运动记录 - 从后端API获取
  loadExerciseHistoryRecords() {
    try {
      // 从缓存中获取用户ID
      const userId = wx.getStorageSync('userId');
      
      // 如果缓存中没有用户ID，使用默认ID并提示用户
      const currentUserId = userId || 'a631c63702a5453c86fce9a42008e54a';
      
      if (!userId) {
        console.warn('未找到用户ID，使用默认ID');
        wx.showToast({
          title: '正在使用默认用户数据',
          icon: 'none',
          duration: 1500
        });
      }
  
      wx.request({
        url: `${this.data.apiBaseUrl}/api/recent_exercises?id=${currentUserId}`,
        method: 'GET',
        timeout: 10000,
        success: (res: { data: RecentExercisesResponse }) => {
          console.log('后端运动数据返回:', res.data);
  
          // 处理后端返回的数据
          const backendData = res.data;
  
          // 如果请求成功且有数据，解析后端数据
          if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
            // 解析后端数据为前端需要的格式
            const allRecords: ExerciseRecord[] = backendData.data.map((exerciseItem: any) => {
              // 尝试从不同可能的字段获取卡路里数据
              let calorieValue = 0;
              if (typeof exerciseItem.calories === 'number' && exerciseItem.calories > 0) {
                calorieValue = exerciseItem.calories;
              } else if (typeof exerciseItem.calorie === 'number' && exerciseItem.calorie > 0) {
                calorieValue = exerciseItem.calorie;
              } else if (typeof exerciseItem.total_calories_burned_today === 'number' && exerciseItem.total_calories_burned_today > 0) {
                // 如果没有单次卡路里，尝试使用总卡路里
                calorieValue = exerciseItem.total_calories_burned_today;
              }
              
              // 处理时间格式，将月份转换为罗马数字
              let displayTime = exerciseItem.created_at;
              if (displayTime) {
                const date = new Date(displayTime);
                const month = date.getMonth() + 1;
                const year = date.getFullYear();
                const day = date.getDate();
                // 使用罗马数字显示月份
                displayTime = `${year}年 ${numberToRoman(month)}月 ${day}日`;
              }
  
              return {
                time: displayTime,
                exerciseName: exerciseItem.exercise_name,
                calorie: calorieValue,
                type: exerciseItem.type || '有氧运动' // 尝试从API获取运动类型
              };
            });
  
            // 按日期分组
            const groupedRecords: Record<string, GroupedExercise> = {};
            
            allRecords.forEach((record: ExerciseRecord) => {
              // 提取日期部分（现在已经是格式化的中文日期）
              const dateMatch = record.time.match(/(\d{4})年\s*(\w+)月\s*(\d+)日/);
              let date = '未知日期';
              
              if (dateMatch) {
                // 使用格式化的日期
                date = `${dateMatch[1]}年 ${dateMatch[2]}月 ${dateMatch[3]}日`;
              }
              
              if (!groupedRecords[date]) {
                groupedRecords[date] = {
                  date: date,
                  records: [],
                  totalCalorie: 0
                };
              }
              
              groupedRecords[date].records.push(record);
              // 累加当日总热量
              groupedRecords[date].totalCalorie += record.calorie;
            });
  
            // 转换为数组并按日期倒序排序
            const exerciseHistoryList = Object.values(groupedRecords)
              .sort((a, b) => new Date(b.date.replace(/[年月]/g, '-').replace('日', '')).getTime() - 
                                new Date(a.date.replace(/[年月]/g, '-').replace('日', '')).getTime());
  
            // 更新数据
            this.setData({
              exerciseHistoryList,
              originalExerciseList: exerciseHistoryList,
              isLoading: false
            });
          } else {
            // 无数据时的处理
            this.setData({
              exerciseHistoryList: [],
              originalExerciseList: [],
              isLoading: false
            });
            
            wx.showToast({
              title: '暂无运动记录',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('获取运动数据失败:', err);
          this.setData({
            isLoading: false
          });
          wx.showToast({
            title: '加载运动记录失败',
            icon: 'none'
          });
        },
        complete: () => {
          wx.hideLoading();
        }
      });
    } catch (error) {
      console.error('加载运动记录失败:', error);
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载运动记录失败',
        icon: 'none'
      });
    }
  },

  // 搜索功能
  onSearch(e: any) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword });
    
    if (!keyword) {
      // 搜索词为空时恢复完整列表
      this.setData({ exerciseHistoryList: this.data.originalExerciseList });
      return;
    }
    
    // 过滤逻辑：按日期、运动名称或类型搜索
    const filtered = this.data.originalExerciseList.filter(group => {
      return (
        group.date.toLowerCase().includes(keyword) || 
        group.records.some(exercise => 
          exercise.exerciseName.toLowerCase().includes(keyword) ||
          exercise.type.toLowerCase().includes(keyword)
        )
      );
    });
    
    this.setData({ exerciseHistoryList: filtered });
  }
});

// 移除重复的错误函数定义
// function numberToRoman(num: any, number: any): unknown {
//   throw new Error("Function not implemented.");
// }

