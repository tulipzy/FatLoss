// 在data中添加以下字段
Page({
  data: {
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null as number | null,
    cardWidth: 700,
    // 新增打卡功能数据
    targetDays: 7,
    completedDays: 3,
    totalDays: 12,
    lastCheckDate: "2025-07-11",
    isChecked: false,
    showPicker: false,
    progress: 0
  },

  onLoad() {
    this.startAutoScroll();
    // 初始化打卡数据
    this.initCheckInData();
    // 绘制进度环
    this.drawProgressRing();
  },

  onUnload() {
    this.stopAutoScroll();
  },

  startAutoScroll() {
    // 使用类型断言确保类型正确
    const timerId: number = setInterval(() => {
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

  switchTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  // 新增打卡功能方法
  initCheckInData() {
    // 从本地存储读取数据
    const checkInData = wx.getStorageSync('checkInData');
    if (checkInData) {
      this.setData({
        targetDays: checkInData.targetDays,
        completedDays: checkInData.completedDays,
        totalDays: checkInData.totalDays,
        lastCheckDate: checkInData.lastCheckDate
      });
    }
    // 检查是否跨天
    this.checkDateChange();
    // 计算进度
    this.calculateProgress();
  },

  checkDateChange() {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.lastCheckDate !== today) {
      this.setData({ isChecked: false });
    } else {
      this.setData({ isChecked: true });
    }
  },

  calculateProgress() {
    const progress = (this.data.completedDays / this.data.targetDays) * 100;
    this.setData({ progress });
  },

  drawProgressRing() {
    const ctx = wx.createCanvasContext('progressCanvas', this);
    const radius = 80;
    const lineWidth = 2;
    const centerX = 90;
    const centerY = 90;

    // 绘制未完成部分
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.setStrokeStyle('#EEEEEE');
    ctx.setLineWidth(lineWidth);
    ctx.stroke();

    // 绘制已完成部分
    ctx.beginPath();
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (this.data.progress / 100) * 2 * Math.PI;
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.setStrokeStyle('#00FF00'); // 实际应使用渐变色
    ctx.setLineWidth(lineWidth);
    ctx.setLineCap('round');
    ctx.stroke();

    ctx.draw();
  },

  handleCheckIn() {
    if (!this.data.isChecked) {
      const newCompletedDays = this.data.completedDays + 1;
      const newTotalDays = this.data.totalDays + 1;
      const today = new Date().toISOString().split('T')[0];

      this.setData({
        completedDays: newCompletedDays,
        totalDays: newTotalDays,
        lastCheckDate: today,
        isChecked: true
      });

      // 更新进度
      this.calculateProgress();
      this.drawProgressRing();

      // 保存到本地存储
      wx.setStorageSync('checkInData', {
        targetDays: this.data.targetDays,
        completedDays: newCompletedDays,
        totalDays: newTotalDays,
        lastCheckDate: today
      });

      // 添加按钮点击动画
      this.animateButton();
    }
  },

  animateButton() {
    // 按钮缩放动画逻辑
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease'
    });

    animation.scale(0.95).step();
    animation.scale(1).step();

    this.setData({ animation });
  },

  // 显示目标设置弹窗
  showTargetPicker() {
    this.setData({
      showTargetModal: true,
      customTarget: this.data.targetDays
    });
  },

  // 隐藏目标设置弹窗
  hideTargetPicker() {
    this.setData({
      showTargetModal: false
    });
  },

  // 设置预设目标
  setPresetTarget(e: WechatMiniprogram.BaseEvent) {
    const days = Number(e.currentTarget.dataset.days);
    this.setData({
      customTarget: days
    });
  },

  // 滑动条变化事件
  onSliderChange(e: WechatMiniprogram.BaseEvent) {
    this.setData({
      customTarget: e.detail.value
    });
  },

  // 确认目标设置
  confirmTarget() {
    const newTarget = this.data.customTarget;
    this.setData({
      targetDays: newTarget,
      showTargetModal: false
    });
    
    // 保存到本地存储
    const checkInData = wx.getStorageSync('checkInData') || {};
    checkInData.targetDays = newTarget;
    wx.setStorageSync('checkInData', checkInData);
    
    // 重新绘制进度环
    this.drawProgressRing();
  },

  showTargetPicker() {
    this.setData({ showPicker: true });
  },
  saveDays(newDays: number) {
    this.setData({
      targetDays: newDays,
      showPicker: false
    });

    // 重新计算进度
    this.calculateProgress();
    this.drawProgressRing();

    // 保存到本地存储
    wx.setStorageSync('checkInData', {
      ...wx.getStorageSync('checkInData'),
      targetDays: newDays
    });
  }
});