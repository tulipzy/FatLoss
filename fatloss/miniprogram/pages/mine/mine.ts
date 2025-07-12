// pages/mine/mine.js
Page({
  data: {
    userInfo: {
      nickName: '用户昵称',
      avatarUrl: '',
      points: 0,
      badges: 0,
      calorieGoal: '1800'
    }
  },

  onLoad() {
    this.getUserInfo();
  },

  // 获取用户信息
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        this.setData({
          'userInfo.nickName': res.userInfo.nickName,
          'userInfo.avatarUrl': res.userInfo.avatarUrl
        });
      }
    });
  },

  // 查看饮食记录
  viewDietHistory() {
    // Use for tabBar navigation
    wx.switchTab({
      url: '/pages/first/first'
    });
    
    // Use for non-tabBar navigation
    wx.navigateTo({
      url: '/pages/diet-history/diet-history'
    });
  },

  // 查看运动记录
  viewExerciseHistory() {
    wx.navigateTo({
      url: '/pages/exercise-history/exercise-history'
    });
  },

  // 设置热量目标
  setCalorieGoal() {
    wx.navigateTo({
      url: '/pages/set-goal/set-goal?type=calorie'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            userInfo: {
              nickName: '用户昵称',
              avatarUrl: '',
              points: 0,
              badges: 0,
              calorieGoal: '1800'
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'none'
          });
        }
      }
    });
  }
});