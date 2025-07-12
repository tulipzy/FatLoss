// pages/index/index.ts
Page({
  data: {
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null as number | null,
    cardWidth: 700,
    // 打卡功能数据
    targetDays: 7,
    completedDays: 3,
    totalDays: 12,
    lastCheckDate: "2025-07-11",
    isChecked: false,
    showTargetModal: false,
    customTarget: 7,
    progress: 0,
    animationData: {}
  },

  onLoad() {
    this.startAutoScroll();
    this.initCheckInData();
    this.drawProgressRing();
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

  switchTab(e: WechatMiniprogram.BaseEvent<{ tab: string }>) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  initCheckInData() {
    try {
      const checkInData = wx.getStorageSync('checkInData');
      if (checkInData) {
        this.setData({
          targetDays: checkInData.targetDays || 7,
          completedDays: checkInData.completedDays || 0,
          totalDays: checkInData.totalDays || 0,
          lastCheckDate: checkInData.lastCheckDate || ""
        });
      }
      this.checkDateChange();
      this.calculateProgress();
    } catch (err) {
      console.error('初始化打卡数据失败:', err);
    }
  },

  checkDateChange() {
    const today = new Date().toISOString().split('T')[0];
    this.setData({ 
      isChecked: this.data.lastCheckDate === today 
    });
  },

  calculateProgress() {
    const progress = Math.min(
      (this.data.completedDays / this.data.targetDays) * 100, 
      100
    );
    this.setData({ progress });
  },

  drawProgressRing() {
    const ctx = wx.createCanvasContext('progressCanvas', this);
    const radius = 80;
    const centerX = 90;
    const centerY = 90;

    // 背景圆环
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.setStrokeStyle('#EEEEEE');
    ctx.setLineWidth(8);
    ctx.stroke();

    // 进度圆环
    ctx.beginPath();
    const startAngle = -0.5 * Math.PI;
    const endAngle = startAngle + (this.data.progress / 100) * 2 * Math.PI;
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.setStrokeStyle('#07C160');
    ctx.setLineWidth(8);
    ctx.setLineCap('round');
    ctx.stroke();

    ctx.draw();
  },

  handleCheckIn() {
    if (this.data.isChecked) return;

    const today = new Date().toISOString().split('T')[0];
    const newCompletedDays = this.data.completedDays + 1;
    const newTotalDays = this.data.totalDays + 1;

    this.setData({
      completedDays: newCompletedDays,
      totalDays: newTotalDays,
      lastCheckDate: today,
      isChecked: true
    });

    this.calculateProgress();
    this.drawProgressRing();
    this.animateButton();

    wx.setStorageSync('checkInData', {
      targetDays: this.data.targetDays,
      completedDays: newCompletedDays,
      totalDays: newTotalDays,
      lastCheckDate: today
    });
  },

  animateButton() {
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease'
    });

    animation.scale(0.9).step({ duration: 100 });
    animation.scale(1).step({ duration: 100 });

    this.setData({
      animationData: animation.export()
    });
  },

  showTargetPicker() {
    this.setData({
      showTargetModal: true,
      customTarget: this.data.targetDays
    });
  },

  hideTargetPicker() {
    this.setData({ showTargetModal: false });
  },

  setPresetTarget(e: WechatMiniprogram.BaseEvent<{ days: string }>) {
    this.setData({
      customTarget: Number(e.currentTarget.dataset.days)
    });
  },

  onSliderChange(e: WechatMiniprogram.CustomEvent<{ value: number }>) {
    this.setData({
      customTarget: e.detail.value
    });
  },

  confirmTarget() {
    const newTarget = Math.max(1, Math.min(365, this.data.customTarget));
    this.setData({
      targetDays: newTarget,
      showTargetModal: false
    });

    this.calculateProgress();
    this.drawProgressRing();

    const checkInData = wx.getStorageSync('checkInData') || {};
    wx.setStorageSync('checkInData', {
      ...checkInData,
      targetDays: newTarget
    });
  }
});