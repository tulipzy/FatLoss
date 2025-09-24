// miniprogram\pages\my\my.ts
// 统一用户信息接口定义，扩展tdee字段
interface UserInfo {
  id?: string;
  nickname: string;
  avatarUrl: string;
  gender: number; // 1-男, 2-女
  birth: string;
  age: number;
  height: number;
  weight: number;
  target_weight: number;
  hand_length: number;
  activity_level: number; // 1-低, 2-中, 3-高
  phone: string;
  calorieGoal: number; // 统一用此字段存储热量目标
  tdee?: number; // 总能量消耗
  points?: number;
  badges?: number;
}

// 存储键常量
const USER_STORAGE_KEY = 'userInfo';

// 定义类型安全的映射对象接口
interface GenderMap {
  [key: number]: string;
}

interface ActivityMap {
  [key: number]: string;
}

Page({
  data: {
    userInfo: {
      nickname: '用户昵称',
      avatarUrl: '',
      gender: 1,
      birth: '',
      height: 0,
      weight: 0,
      target_weight: 0,
      hand_length: 0,
      activity_level: 1,
      phone: '',
      calorieGoal: 1800, // 初始默认值
      points: 0,
      badges: 0
    } as UserInfo,
    // 用于页面显示的格式化数据
    formattedInfo: {
      nickname: '未设置',
      gender: '未设置',
      age: '未设置',
      height: '未设置',
      weight: '未设置',
      targetWeight: '未设置',
      activityLevel: '低',
      calorieGoal: '1800 千卡',
      tdee: '0 千卡'
    }
  } as {
    userInfo: UserInfo;
    formattedInfo: {
      nickname: string;
      gender: string;
      age: string;
      height: string;
      weight: string;
      targetWeight: string;
      activityLevel: string;
      calorieGoal: string;
      tdee: string;
    };
  },

  onLoad() {
    // 初始化全局事件总线（确保唯一实例）
    if (!(wx as any).eventBus) {
      (wx as any).eventBus = {
        listeners: {},
        on: function(event: string, callback: Function) {
          this.listeners[event] = this.listeners[event] || [];
          this.listeners[event].push(callback);
        },
        emit: function(event: string, ...args: any[]) {
          (this.listeners[event] || []).forEach((cb: Function) => cb(...args));
        },
        off: function(event: string, callback?: Function) {
          if (!this.listeners[event]) return;
          if (callback) {
            this.listeners[event] = this.listeners[event].filter(
              (cb: Function) => cb !== callback
            );
          } else {
            this.listeners[event] = [];
          }
        }
      };
    }
    
    this.getUserInfo();
    this.updateBadgeCount();
  },

  // 页面显示时刷新数据，确保获取最新的热量数据
  onShow() {
    const needUpdate = wx.getStorageSync('needUpdateMyPage') || false;
    if (needUpdate) {
      this.getUserInfo();
      wx.removeStorageSync('needUpdateMyPage');
    }
  },

  // 获取用户信息（以userInfo中的calorieGoal为准）
  getUserInfo() {
    const storedUserInfo: UserInfo = wx.getStorageSync(USER_STORAGE_KEY) || {} as UserInfo;
    console.log('我的页面 - 从存储获取的用户信息:', storedUserInfo);
    
    // 确保数据结构完整，优先使用存储中的热量目标
    const userInfo: UserInfo = {
      id: storedUserInfo.id || '',
      nickname: storedUserInfo.nickname || '用户昵称',
      avatarUrl: storedUserInfo.avatarUrl || '',
      gender: storedUserInfo.gender || 1,
      birth: storedUserInfo.birth || '',
      age: storedUserInfo.age || this.calculateAgeFromBirth(storedUserInfo.birth),
      height: storedUserInfo.height || 0,
      weight: storedUserInfo.weight || 0,
      target_weight: storedUserInfo.target_weight || 0,
      hand_length: storedUserInfo.hand_length || 0,
      activity_level: storedUserInfo.activity_level || 1,
      phone: storedUserInfo.phone || '',
      calorieGoal: storedUserInfo.calorieGoal || 1800, // 核心：从userInfo读取
      tdee: storedUserInfo.tdee || 0,
      points: storedUserInfo.points || 0,
      badges: storedUserInfo.badges || 0
    };
    
    this.checkUserInfoComplete(userInfo);
    const formattedInfo = this.formatUserInfo(userInfo);
    
    this.setData({
      userInfo,
      formattedInfo
    });
  },

  // 检查用户信息完整性
  checkUserInfoComplete(userInfo: UserInfo) {
    const requiredFields: string[] = [];
    if (!userInfo.nickname || userInfo.nickname === '用户昵称') requiredFields.push('昵称');
    if (!userInfo.avatarUrl) requiredFields.push('头像');
    if (!userInfo.birth) requiredFields.push('生日');
    if (userInfo.height <= 0) requiredFields.push('身高');
    if (userInfo.weight <= 0) requiredFields.push('当前体重');
    if (userInfo.target_weight <= 0) requiredFields.push('目标体重');
    if (userInfo.hand_length <= 0) requiredFields.push('手长');
    if (!userInfo.phone) requiredFields.push('手机号');
    
    if (requiredFields.length > 0 && !wx.getStorageSync('hasCompletedInfo')) {
      wx.showModal({
        title: '完善个人信息',
        content: `您的${requiredFields.join('、')}尚未完善，是否现在去完善？`,
        confirmText: '去完善',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/information/information?from=myPage`
            });
          }
        }
      });
    }
  },

  // 从生日计算年龄
  calculateAgeFromBirth(birthday: string): number {
    if (!birthday) return 0;
    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return Math.max(0, age);
    } catch (error) {
      console.error('计算年龄出错:', error);
      return 0;
    }
  },

  // 格式化用户信息
  formatUserInfo(userInfo: UserInfo): {
    nickname: string;
    gender: string;
    age: string;
    height: string;
    weight: string;
    targetWeight: string;
    activityLevel: string;
    calorieGoal: string;
    tdee: string;
  } {
    let age = userInfo.age || this.calculateAgeFromBirth(userInfo.birth);
    
    // 使用类型安全的映射对象
    const genderMap: GenderMap = { 1: '男', 2: '女' };
    const activityMap: ActivityMap = { 1: '低', 2: '中', 3: '高' };

    return {
      nickname: userInfo.nickname || '未设置',
      gender: genderMap[userInfo.gender] || '未设置',
      age: age > 0 ? `${age} 岁` : '未设置',
      height: userInfo.height > 0 ? `${userInfo.height} cm` : '未设置',
      weight: userInfo.weight > 0 ? `${userInfo.weight} kg` : '未设置',
      targetWeight: userInfo.target_weight > 0 ? `${userInfo.target_weight} kg` : '未设置',
      activityLevel: activityMap[userInfo.activity_level] || '低',
      calorieGoal: `${userInfo.calorieGoal} 千卡`, // 显示统一的热量目标
      tdee: userInfo.tdee ? `${userInfo.tdee} 千卡` : '0 千卡'
    };
  },

  updateBadgeCount() {
    const badgesData = wx.getStorageSync('badgesData') || {};
    const ownedBadges = badgesData.ownedBadges || [];
    const newCount = ownedBadges.length;
    
    this.setData({ 'userInfo.badges': newCount });
    
    const storedUserInfo: UserInfo = wx.getStorageSync(USER_STORAGE_KEY) || {} as UserInfo;
    if (storedUserInfo) {
      storedUserInfo.badges = newCount;
      wx.setStorageSync(USER_STORAGE_KEY, storedUserInfo);
    }
    
    return newCount;
  },

  // 获取微信用户信息
  tryGetWechatProfile() {
    wx.getUserProfile({
      desc: '用于展示用户信息',
      success: (res) => {
        const storedUserInfo: UserInfo = wx.getStorageSync(USER_STORAGE_KEY) || {} as UserInfo;
        
        const newUserInfo: UserInfo = {
          ...storedUserInfo,
          nickname: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl,
          gender: storedUserInfo.gender || 1,
          birth: storedUserInfo.birth || '',
          height: storedUserInfo.height || 0,
          weight: storedUserInfo.weight || 0,
          target_weight: storedUserInfo.target_weight || 0,
          hand_length: storedUserInfo.hand_length || 0,
          activity_level: storedUserInfo.activity_level || 1,
          phone: storedUserInfo.phone || '',
          calorieGoal: storedUserInfo.calorieGoal || 1800, // 保留热量目标
          tdee: storedUserInfo.tdee || 0,
          points: storedUserInfo.points || 0,
          badges: storedUserInfo.badges || 0
        };
        
        this.setData({ 
          userInfo: newUserInfo,
          formattedInfo: this.formatUserInfo(newUserInfo)
        });
        
        wx.setStorageSync(USER_STORAGE_KEY, newUserInfo);
        wx.showToast({ title: '获取信息成功', icon: 'success' });
        this.checkUserInfoComplete(newUserInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err);
        wx.showToast({ title: '获取信息失败，请稍后再试', icon: 'none' });
      }
    });
  },

  // 点击头像进入个人信息页
  onAvatarTap() {
    wx.navigateTo({
      url: `/pages/information/information?from=myPage`
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

  // 增强viewExerciseHistory方法，添加加载状态和错误处理
  // 查看运动记录
  viewExerciseHistory() {
    try {
      wx.showLoading({ title: '加载中' });
      // 检查用户是否登录（简化版，实际应检查token）
      const userInfo = wx.getStorageSync(USER_STORAGE_KEY);
      if (!userInfo || !userInfo.id) {
        // 未登录用户先登录
        wx.hideLoading();
        wx.showModal({
          title: '提示',
          content: '请先登录',
          showCancel: false,
          success: () => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        });
      } else {
        // 已登录用户直接跳转
        wx.navigateTo({
          url: '/pages/exerciseHistory/exerciseHistory',
          success: () => {
            wx.hideLoading();
          },
          fail: (err) => {
            console.error('跳转到运动记录页面失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '跳转失败，请重试',
              icon: 'none'
            });
          }
        });
      }
    } catch (error) {
      console.error('跳转异常:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作异常，请重试',
        icon: 'none'
      });
    }
  }, // 这里缺少了逗号

  // 设置每日热量目标（核心修改：更新到userInfo并广播）
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
              calorieGoal: calorieNumber // 更新到userInfo
            };
            
            this.setData({ 
              userInfo: updatedUserInfo,
              formattedInfo: this.formatUserInfo(updatedUserInfo)
            });
            
            // 更新存储的用户信息
            wx.setStorageSync(USER_STORAGE_KEY, updatedUserInfo);
            
            // 关键：广播事件通知所有页面更新
            (wx as any).eventBus.emit('calorieGoalChanged', calorieNumber);
            wx.showToast({ title: '设置成功', icon: 'success' });
          } else {
            wx.showToast({ title: '请输入有效数字且大于0', icon: 'none' });
          }
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清空用户数据
          wx.removeStorageSync(USER_STORAGE_KEY);
          // 重置页面数据
          this.setData({
            userInfo: {
              nickname: '用户昵称',
              avatarUrl: '',
              gender: 1,
              birth: '',
              height: 0,
              weight: 0,
              target_weight: 0,
              hand_length: 0,
              activity_level: 1,
              phone: '',
              calorieGoal: 1800,
              points: 0,
              badges: 0
            } as UserInfo,
            formattedInfo: this.formatUserInfo({
              nickname: '用户昵称',
              avatarUrl: '',
              gender: 1,
              birth: '',
              height: 0,
              weight: 0,
              target_weight: 0,
              hand_length: 0,
              activity_level: 1,
              phone: '',
              calorieGoal: 1800,
              points: 0,
              badges: 0,
              age: 0
            })
          });
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});