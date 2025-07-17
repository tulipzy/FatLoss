// pages/sport/sport.ts
// 用户数据接口定义
interface UserData {
  level: number;
  experience: number;
  nextLevelExp: number;
  diamonds: number;
  friends: Friend[];
}

interface Friend {
  name: string;
  avatar: string;
  calories: number;
  minutes: number;
}

// 页面配置
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userData: {
      level: 7,
      experience: 2450,
      nextLevelExp: 3000,
      diamonds: 240,
      friends: [
        { name: '张三', avatar: 'https://picsum.photos/32/32?random=1', calories: 2400, minutes: 120 },
        { name: '李四', avatar: 'https://picsum.photos/32/32?random=3', calories: 1800, minutes: 90 },
        { name: '王五', avatar: 'https://picsum.photos/32/32?random=4', calories: 1500, minutes: 75 }
      ]
    } as UserData,
    challengeTimer: '08:45:30',
    progress: 0,
    isPaused: false,
    timerInterval: 0,
    challengeInterval: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    // 初始化游戏化元素
    this.updateLevelDisplay();
    this.updateDiamondDisplay();
    this.startChallengeTimer();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清除定时器
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    if (this.data.challengeInterval) {
      clearInterval(this.data.challengeInterval);
    }
  },

  /**
   * 更新等级和经验显示
   */
  updateLevelDisplay() {
    const userData = this.data.userData;
    const progress = (userData.experience / userData.nextLevelExp) * 100;

    this.setData({
      'userData': userData,
      'progress': progress
    });
  },

  /**
   * 更新钻石数量显示
   */
  updateDiamondDisplay() {
    this.setData({
      'userData': this.data.userData
    });
  },

  /**
   * 开始挑战计时器
   */
  startChallengeTimer() {
    let timeLeft = 8 * 3600 + 45 * 60 + 30; // 8小时45分30秒

    this.setData({
      challengeInterval: setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) timeLeft = 0;

        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;

        this.setData({
          challengeTimer: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        });
      }, 1000)
    });
  },

  /**
   * 完成组按钮点击事件
   */
  completeSet() {
    const userData = this.data.userData;
    // 增加经验
    userData.experience += 25;

    // 检查是否升级
    if (userData.experience >= userData.nextLevelExp) {
      userData.level++;
      userData.experience = userData.experience - userData.nextLevelExp;
      userData.nextLevelExp = Math.floor(userData.nextLevelExp * 1.2);

      // 显示升级通知
      wx.showToast({
        title: `恭喜！升级到Lv.${userData.level}！`,
        icon: 'success',
        duration: 2000
      });

      // 升级奖励
      userData.diamonds += 10;
      this.updateDiamondDisplay();

      // 解锁新徽章（需在WXML中配合数据绑定实现）
      if (userData.level === 8) {
        this.setData({
          badgeUnlocked: true
        });
      }
    }

    this.updateLevelDisplay();

    // 按钮点击动画
    this.createAnimation('#completeSetBtn');
  },

  /**
   * 商店购买功能
   */
  purchaseItem(e: WechatMiniprogram.TouchEvent) {
    const { cost, name } = e.currentTarget.dataset;
    const userData = this.data.userData;

    if (userData.diamonds >= cost) {
      wx.showModal({
        title: '购买确认',
        content: `确定要花费 ${cost} 钻石购买 ${name} 吗？`,
        success: (res) => {
          if (res.confirm) {
            userData.diamonds -= cost;
            this.updateDiamondDisplay();
            wx.showToast({
              title: `购买成功！获得 ${name}`,
              icon: 'success'
            });

            // 购买动画
            this.createAnimation(`#item-${name}`);
          }
        }
      });
    } else {
      wx.showToast({
        title: '钻石不足！',
        icon: 'none'
      });
    }
  },

  /**
   * 创建点击动画
   */
  createAnimation(selector: string) {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease'
    });

    animation.scale(1.1).step().scale(1).step();

    this.setData({
      animation: animation.export()
    });
  },

  // ... 其他已实现的方法（如分享、挑战等）
});