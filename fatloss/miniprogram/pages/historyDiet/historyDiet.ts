interface DietRecord {
  time: string;
  dishName: string;
  calorie: number;
  weight: number;      // 可选属性
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };// 可选属性  
 
}

interface GroupedRecord {
  date: string;
  records: DietRecord[];
  totalCalorie: number;
}

interface DietRecord {
  time: string;
  dishName: string;
  calorie: number;
  weight: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
 
  timestamp?: number; // 添加时间戳用于排序
}

interface GroupedRecord {
  date: string;
  records: DietRecord[];
  totalCalorie: number;
}

Page({
  data: {
    historyDietList: [] as GroupedRecord[],
    searchKeyword: '',
    originalDietList: [] as GroupedRecord[]
  },

  onLoad() {
    this.loadHistoryDietRecords();
  },

  // 加载历史饮食记录
  loadHistoryDietRecords() {
    try {
      // 1. 从缓存读取原始数据
      const rawRecords = wx.getStorageSync('dietHistory') || [];
      console.log('[调试] 原始缓存数据:', rawRecords);

      // 2. 转换为标准格式并确保热量是数字
      const allRecords: any[] = rawRecords.map((record: any) => {
        let timestamp: number;
        
        // 如果已经有时间戳，直接使用
        if (typeof record.timestamp === 'number') {
          timestamp = record.timestamp;
        } 
        // 处理时间字符串
        else if (typeof record.time === 'string') {
          // 尝试直接解析时间字符串
          timestamp = new Date(record.time).getTime();
          
          // 如果解析失败，尝试处理中文格式
          if (isNaN(timestamp)) {
            // 处理中文时间格式：2025/8/23上午11:06:54
            const timeStr = record.time;
            const dateMatch = timeStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
            
            if (dateMatch) {
              const year = parseInt(dateMatch[1]);
              const month = parseInt(dateMatch[2]) - 1;
              const day = parseInt(dateMatch[3]);
              
              let hours = 0, minutes = 0;
              
              // 检查上午/下午
              if (timeStr.includes('上午')) {
                const timeMatch = timeStr.match(/上午(\d+):(\d+)/);
                if (timeMatch) {
                  hours = parseInt(timeMatch[1]);
                  minutes = parseInt(timeMatch[2]);
                }
              } else if (timeStr.includes('下午')) {
                const timeMatch = timeStr.match(/下午(\d+):(\d+)/);
                if (timeMatch) {
                  hours = parseInt(timeMatch[1]) + 12;
                  minutes = parseInt(timeMatch[2]);
                }
              }
              
              timestamp = new Date(year, month, day, hours, minutes).getTime();
            } else {
              // 如果还是无法解析，使用当前时间
              console.warn('无法解析时间:', record.time);
              timestamp = Date.now();
            }
          }
        } else {
          // 未知格式，使用当前时间
          timestamp = Date.now();
        }
        
        return {
          timestamp: timestamp, // 保存时间戳用于排序
          dishName: record.dishName || '未知食物',
          calorie: Number(record.calorie) || 0,
          weight: record.weight || 0,
          nutrition: record.nutrition || { protein: 0, carbs: 0, fat: 0 },
          portion: record.portion || 0
        };
      });

      console.log('[调试] 转换后记录:', allRecords);

      // 3. 按日期分组
      const groupedRecords: Record<string, GroupedRecord> = {};
      
      allRecords.forEach((record: any) => {
        // 使用时间戳创建日期对象
        const dateObj = new Date(record.timestamp);
        
        // 标准化日期格式为YYYY/MM/DD
        const year = dateObj.getFullYear();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');
        const date = `${year}/${month}/${day}`;
        
        if (!groupedRecords[date]) {
          groupedRecords[date] = {
            date: date,
            records: [],
            totalCalorie: 0
          };
        }
        
        // 格式化时间为易读格式（包含上午/下午）
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        const period = hours >= 12 ? '下午' : '上午';
        const displayHours = hours > 12 ? hours - 12 : hours;
        const formattedTime = `${period}${displayHours}:${minutes}`;
        
        // 添加格式化后的记录，同时保留时间戳用于排序
        groupedRecords[date].records.push({
          time: formattedTime,
          dishName: record.dishName,
          calorie: record.calorie,
          weight: record.weight,
          nutrition: record.nutrition,
          date:"",
          timestamp: record.timestamp // 保留时间戳用于排序
        });
        
        // 累加当日总热量
        groupedRecords[date].totalCalorie = 
          Number((groupedRecords[date].totalCalorie + record.calorie).toFixed(1));
      });

      // 4. 对每个日期的记录按时间戳排序（从早到晚）
      Object.keys(groupedRecords).forEach(date => {
        groupedRecords[date].records.sort((a: any, b: any) => {
          return a.timestamp - b.timestamp; // 直接使用时间戳排序
        });
        
        // 排序后移除时间戳，避免影响界面显示
        groupedRecords[date].records.forEach(record => {
          delete record.timestamp;
        });
      });

      // 5. 转换为数组并按日期倒序排序
      const historyDietList = Object.values(groupedRecords)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('[调试] 分组后数据:', historyDietList);

      // 6. 更新数据
      this.setData({
        historyDietList,
        originalDietList: historyDietList
      });

    } catch (error) {
      console.error('加载饮食记录失败:', error);
      wx.showToast({
        title: '加载记录失败',
        icon: 'none'
      });
    }
  },

  // 搜索功能保持不变
  onSearch(e: any) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword });
    
    if (!keyword) {
      this.setData({ historyDietList: this.data.originalDietList });
      return;
    }
    
    const filtered = this.data.originalDietList.filter(group => {
      return (
        group.date.toLowerCase().includes(keyword) || 
        group.records.some(diet => diet.dishName.toLowerCase().includes(keyword))
      );
    });
    
    this.setData({ historyDietList: filtered });
  }
});