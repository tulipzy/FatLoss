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

Page({
  data: {
    historyDietList: [] as GroupedRecord[],
    searchKeyword: '',
    originalDietList: [] as GroupedRecord[] // 保存原始数据用于搜索过滤
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
      const allRecords: DietRecord[] = rawRecords.map((record: any) => {
        // 处理可能的时间格式问题
        let formattedTime = record.time;
        if (typeof record.time === 'number') {
          formattedTime = new Date(record.time).toLocaleString();
        }

        return {
          time: formattedTime,
          dishName: record.dishName || '未知食物',
          calorie: Number(record.calorie) || 0 // 确保转换为数字，默认为0
        };
      });

      console.log('[调试] 转换后记录:', allRecords);

      // 3. 按日期分组
      const groupedRecords: Record<string, GroupedRecord> = {};
      
      allRecords.forEach((record: DietRecord) => {
        // 改进的日期提取逻辑，处理多种时间格式
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

      // 4. 转换为数组并按日期倒序排序
      const historyDietList = Object.values(groupedRecords)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('[调试] 分组后数据:', historyDietList);

      // 5. 更新数据
      this.setData({
        historyDietList,
        originalDietList: historyDietList // 保存原始数据用于搜索
      });

    } catch (error) {
      console.error('加载饮食记录失败:', error);
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