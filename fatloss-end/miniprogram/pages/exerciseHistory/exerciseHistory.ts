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

Page({
  data: {
    exerciseHistoryList: [] as GroupedExercise[],
    searchKeyword: '',
    originalExerciseList: [] as GroupedExercise[],
    isLoading: true
  },

  onLoad() {
    wx.showLoading({
      title: '加载中',
    });
    this.loadExerciseHistoryRecords();
  },

  // 加载运动记录 - 从后端API获取
  loadExerciseHistoryRecords() {
    try {
      // 首先从缓存中获取用户ID
      const userId = wx.getStorageSync('userID');
      
      // 如果缓存中没有用户ID，使用默认ID
      const currentUserId = userId || 'a631c63702a5453c86fce9a42008e54a';

      // 发起GET请求到后端API - 使用与饮食记录相同的方式
      // 注意：这里的API地址是推测的，实际应该使用正确的运动记录API
      wx.request({
        url: `http://60.205.245.221:9090/Exercise/record?userId=${currentUserId}`,
        method: 'GET',
        timeout: 10000,
        success: (res: { data: ExerciseResponse }) => {
          console.log('后端运动数据返回:', res.data);

          // 处理后端返回的数据
          const backendData = res.data;

          // 如果请求成功且有数据，解析后端数据
          if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
            // 解析后端数据为前端需要的格式
            const allRecords: ExerciseRecord[] = backendData.data.map((exerciseItem: ExerciseItem) => {
              return {
                time: exerciseItem.exerciseTime,
                exerciseName: exerciseItem.exerciseName,
                calorie: Number(exerciseItem.calories) || 0,
                type: exerciseItem.type
              };
            });

            // 按日期分组
            const groupedRecords: Record<string, GroupedExercise> = {};
            
            allRecords.forEach((record: ExerciseRecord) => {
              // 提取日期部分
              const dateMatch = record.time.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
              let date = '未知日期';
              
              if (dateMatch) {
                // 标准化日期格式为YYYY/MM/DD
                const year = dateMatch[1];
                const month = dateMatch[2].padStart(2, '0');
                const day = dateMatch[3].padStart(2, '0');
                date = `${year}/${month}/${day}`;
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
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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