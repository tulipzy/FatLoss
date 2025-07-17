viewDietHistory() {
  wx.navigateTo({
    url: '/pages/diet-history/diet-history',
    fail: (err) => {
      console.error('Navigation failed:', err);
      wx.showToast({ title: '页面不存在', icon: 'error' });
    }
  });
}