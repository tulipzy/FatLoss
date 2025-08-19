Page({
  data: {
    userInfo: {
      nickName: '用户昵称',
      avatarUrl: '',
      points: 0,
      badges: 0,
      calorieGoal: 1800
    }
  },

  onLoad() {
    this.getUserInfo();
    this.updateBadgeCount();
  },

  onShow() {
    this.updateBadgeCount();
  },

  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: {
          ...this.data.userInfo,
          ...userInfo,
          nickName: userInfo.nickName || '用户昵称',
          avatarUrl: userInfo.avatarUrl || '',
          calorieGoal: Number(userInfo.calorieGoal) || 1800
        }
      });
    } else {
      this.tryGetWechatProfile();
    }
  },

  updateBadgeCount() {
    const badgesData = wx.getStorageSync('badgesData') || {};
    const ownedBadges = badgesData.ownedBadges || [];
    const newCount = ownedBadges.length;
    
    this.setData({
      'userInfo.badges': newCount
    });
    
    const userInfo = wx.getStorageSync('userInfo') || {};
    wx.setStorageSync('userInfo', {
      ...userInfo,
      badges: newCount
    });
    
    return newCount;
  },

  tryGetWechatProfile() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        const newUserInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          points: 0,
          badges: 0,
          calorieGoal: 1800
        };
        this.setData({ userInfo: newUserInfo });
        wx.setStorageSync('userInfo', newUserInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err);
        wx.showToast({ title: '获取信息失败，请稍后再试', icon: 'none' });
      }
    });
  },

  onAvatarTap() {
    wx.navigateTo({
      url: '/pages/information/information'
    });
  },

  onBadgesTap() {
    wx.navigateTo({
      url: '/pages/my-badges/my-badges'
    });
  },

  onHistoryDietTap() {
    wx.navigateTo({
      url: '/pages/historyDiet/historyDiet' 
    });
  },

  viewExerciseHistory() {
    wx.navigateTo({
      url: '/pages/exerciseHistory/exerciseHistory'
    });
  },

  setCalorieGoal() {
    wx.showModal({
      title: '设置每日热量目标',
      content: '请输入每日热量目标(kcal)',
      editable: true,
      placeholderText: this.data.userInfo.calorieGoal.toString(),
      success: (res) => {
        if (res.confirm && res.content) {
          const calorieNumber = Number(res.content);
          
          if (!isNaN(calorieNumber) && calorieNumber > 0) {
            const updatedUserInfo = {
              ...this.data.userInfo,
              calorieGoal: calorieNumber
            };
            
            this.setData({ userInfo: updatedUserInfo });
            wx.setStorageSync('userInfo', updatedUserInfo);
            
            // 通知相关页面更新热量目标
            this.notifyRelatedPages(calorieNumber);
            
            wx.showToast({
              title: '设置成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '请输入有效数字且大于0',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 优化：增强页面通知机制
  notifyRelatedPages(newCalorieGoal:any) {
    const pages = getCurrentPages();
    
    // 1. 通知首页更新
    const firstPage = pages.find(page => page.route === 'pages/first/first');
    if (firstPage) {
      firstPage.setData({
        calorieGoal: newCalorieGoal,
        remainingCalories: newCalorieGoal
      });
    }
    
    // 2. 通知减脂页面更新（增强逻辑）
    const foodPage = pages.find(page => page.route === 'pages/food/food');
    if (foodPage) {
      // 直接调用减脂页面的同步方法，确保逻辑一致性
      foodPage.syncCalorieGoal();
    }
    
    // 更新全局存储，作为保底机制
    wx.setStorageSync('calorieGoal', newCalorieGoal);
  },

  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const currentUserInfo = wx.getStorageSync('userInfo') || {};
          const preservedInfo = {
            gender: currentUserInfo.gender,
            birthday: currentUserInfo.birthday,
            height: currentUserInfo.height,
            weight: currentUserInfo.weight,
            targetWeight: currentUserInfo.targetWeight
          };
          
          wx.removeStorageSync('hasCompletedInfo');
          
          this.setData({
            userInfo: {
              ...preservedInfo,
              nickName: '用户昵称',
              avatarUrl: '',
              points: 0,
              badges: 0,
              calorieGoal: Number(currentUserInfo.calorieGoal) || 1800
            }
          });
          
          wx.setStorageSync('userInfo', {
            ...preservedInfo,
            calorieGoal: Number(currentUserInfo.calorieGoal) || 1800
          });
          
          wx.reLaunch({
            url: '/pages/index/index'
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