interface DietRecord {
  time: string;
  dishName: string;
  calorie: number; 
}

interface GroupedRecord {
  date: string;
  records: DietRecord[];
  totalCalorie: number;
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
    historyDietList: [] as GroupedRecord[],
    searchKeyword: '',
    originalDietList: [] as GroupedRecord[], // 保存原始数据用于搜索过滤
    isLoading: true
  },

  onLoad() {
    wx.showLoading({
      title: '加载中',
    });
    this.loadHistoryDietRecords();
  },

  // 加载历史饮食记录 - 从后端API获取
  loadHistoryDietRecords() {
    try {
      // 首先从缓存中获取用户ID
      const userId = wx.getStorageSync('userID');
      
      // 如果缓存中没有用户ID，使用默认ID
      const currentUserId = userId || 'a631c63702a5453c86fce9a42008e54a';

      // 发起GET请求到后端API - 使用动态构建的URL
      wx.request({
        url: `http://60.205.245.221:9090/FoodIntake/meal?userId=${currentUserId}`,
        method: 'GET',
        timeout: 10000, // 添加超时设置
        success: (res: { data: FoodIntakeResponse }) => {
          console.log('后端数据返回:', res.data);

          // 如果缓存中没有用户ID，则存入storage
          if (!userId) {
            wx.setStorageSync('userID', currentUserId);
          }

          // 处理后端返回的数据
          const backendData = res.data;

          // 如果请求成功且有数据，解析后端数据
          if (backendData.status === 'success' && backendData.data && backendData.data.length > 0) {
            // 解析后端数据为前端需要的格式
            const allRecords: DietRecord[] = backendData.data.map((foodItem: FoodItem) => {
              return {
                time: foodItem.eatingTime,
                dishName: foodItem.foodName,
                calorie: Number(foodItem.calories) || 0
              };
            });

            // 按日期分组
            const groupedRecords: Record<string, GroupedRecord> = {};
            
            allRecords.forEach((record: DietRecord) => {
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
            const historyDietList = Object.values(groupedRecords)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            console.log('[调试] 分组后数据:', historyDietList);

            // 更新数据
            this.setData({
              historyDietList,
              originalDietList: historyDietList, // 保存原始数据用于搜索
              isLoading: false
            });
          } else {
            // 无数据时的处理
            this.setData({
              historyDietList: [],
              originalDietList: [],
              isLoading: false
            });
            
            wx.showToast({
              title: '暂无饮食记录',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('获取数据失败:', err);
          this.setData({
            isLoading: false
          });
          wx.showToast({
            title: '加载记录失败',
            icon: 'none'
          });
        },
        complete: () => {
          wx.hideLoading();
        }
      });
    } catch (error) {
      console.error('加载饮食记录失败:', error);
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载记录失败',
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
      this.setData({ historyDietList: this.data.originalDietList });
      return;
    }
    
    // 过滤逻辑：按日期或食物名称搜索
    const filtered = this.data.originalDietList.filter(group => {
      return (
        group.date.toLowerCase().includes(keyword) || 
        group.records.some(diet => diet.dishName.toLowerCase().includes(keyword))
      );
    });
    
    this.setData({ historyDietList: filtered });
  }
});