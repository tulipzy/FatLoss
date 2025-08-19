// pages/my-data/my-data.ts
Page({
  data: {
    isLoading: true,
    // 打卡状态数据
    checkInStatus: {
      status: '已打卡',
      time: '07:30'
    },
    // 体重数据
    weightData: {
      current: 62.5,
      change: -0.3,
      initial: 65.0,
      target: 60.0,
      progress: 50 // 已减2.5kg，目标5kg
    },
    // 热量差数据
    calorieData: {
      diff: 350,
      intake: 1500,
      consume: 1850,
      progress: 70, // 350/500
      // 热量来源数据
      sources: {
        intake: [
          { name: '早餐', desc: '鸡蛋+燕麦', calorie: 400 },
          { name: '午餐', desc: '鸡胸肉沙拉', calorie: 550 },
          { name: '加餐', desc: '水果', calorie: 200 },
          { name: '晚餐', desc: '建议控制占比30%', calorie: 350, warning: true }
        ],
        consume: [
          { name: '基础代谢', desc: '日常生命活动', calorie: 1200 },
          { name: '运动消耗', desc: '运动时长达标', calorie: 450 },
          { name: '日常活动', desc: '多走楼梯增加消耗', calorie: 200 },
          { name: '', desc: '', calorie: 0, empty: true }
        ]
      }
    },
    // 连续打卡数据
    checkInData: {
      days: 8,
      target: 10,
      progress: 80 // 80%
    }
  },

  onLoad() {
    // 页面加载逻辑
    wx.showLoading({
      title: '加载中',
    });

    // 模拟加载完成
    setTimeout(() => {
      this.setData({
        isLoading: false
      });
      wx.hideLoading();
    }, 500);
  }
});