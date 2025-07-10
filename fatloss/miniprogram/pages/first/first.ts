Page({
  data: {
    currentTab: "home",
    currentIndex: 0,
    scrollLeft: 0,
    timer: null as number | null,  // 明确指定类型
    cardWidth: 700
  },

  onLoad() {
    this.startAutoScroll();
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
  }
});