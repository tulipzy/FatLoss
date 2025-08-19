// pages/index/index.ts
Page({
  data: {
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null as number | null,
    cardWidth: 700,
    
    // 添加饮食摄入数据
    dietCalories: 0,
    remainingCalories: 1364,
    exerciseCalories: 0,
    carbs: 0,
    totalCarbs: 187.6,
    protein: 0,
    totalProtein: 51.2,
    fat: 0,
    totalFat: 45.5
  },

  onLoad() {
    this.startAutoScroll();
  },

  
  // 添加饮食摄入相关方法
  calculateProgress(current: number, total: number): number {
    return Math.min((current / total) * 100, 100);
  },

  // 计算还可摄入进度环的偏移量
  calculateRemainingProgress(remaining: number, recommended: number): number {
    // 计算剩余的比例
    const remainingRatio = remaining / recommended;
    // 圆的周长 = 2 * Math.PI * 半径
    const circumference = 2 * Math.PI * 100;
    // 计算偏移量（未绘制部分）
    return (1 - remainingRatio) * circumference;
  },

  getProgressColor(current: number, total: number): string {
    const progress = current / total;
    if (progress < 0.3) return '#FF4D4F'; // 红色
    if (progress < 0.7) return '#FAAD14'; // 黄色
    return '#52C41A'; // 绿色
  }, // 这里添加了缺少的逗号

  navigateToDietRecord() {
    // 跳转到详细饮食记录页面
    wx.navigateTo({
      url: '/pages/food/food'
    });
  },

  onUnload() {
    this.stopAutoScroll();
  },

  startAutoScroll() {
    const timerId = setInterval(() => {
      const nextIndex = (this.data.currentIndex + 1) % 3;
      this.setData({
        currentIndex: nextIndex,
        scrollLeft: nextIndex * (this.data.cardWidth + 40)
      });
    }, 3000) as unknown as number;
    
    this.setData({ timer: timerId });
  },

  stopAutoScroll() {
    if (this.data.timer !== null) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  // 跳转到我的数据页面
  navigateToMyData() {
    wx.navigateTo({
      url: '/pages/my-data/my-data',  // 确保路径正确
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none'
        });
      }
    });
  },

  switchTab(e: WechatMiniprogram.BaseEvent<{ tab: string }>) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },
});
