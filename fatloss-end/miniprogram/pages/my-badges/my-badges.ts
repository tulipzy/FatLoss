interface Badge {
  id: number;
  name: string;
  desc?: string;
  condition?: string;
  imageUrl: string;
}

interface TaskProgress {
  id: number;
  desc: string;
  current: number;
  target: number;
  unit: string;
  badgeName: string;
  progressPercent: number;
}

interface BadgesData {
  ownedBadges: Badge[];
  unlockedBadges: Badge[];
  taskProgress: TaskProgress[];
}

Page({
  data: {
    ownedBadges: [] as Badge[],
    unlockedBadges: [] as Badge[],
    taskProgress: [] as TaskProgress[]
  },

  onLoad() {
    // 先清除旧数据
    wx.removeStorageSync('badgesData');
    // 再初始化新数据
    this.initBadgeData();
    this.loadBadgeData();
  },

  onShow() {
    this.loadBadgeData();
    this.calculateProgressPercent();
  },

  // 初始化徽章数据
  initBadgeData() {
    const defaultData: BadgesData = {
      ownedBadges: [
        {
          id: 1,
          name: "运动新星",
          desc: "累计运动10公里",
          imageUrl: "/images/xinxing.jpg"
        },
        {
          id: 2,
          name: "自律达人",
          desc: "连续7天记录饮食",
          imageUrl: "/images/zilv.jpg"
        }
      ],
      unlockedBadges: [
        {
          id: 3,
          name: "耐力王者",
          condition: "累计运动100公里",
          imageUrl: "/images/weizhi.jpg"
        }
      ],
      taskProgress: [
        {
          id: 1,
          desc: "累计运动公里数",
          current: 30,
          target: 100,
          unit: "公里",
          badgeName: "耐力王者",
          progressPercent: 0
        }
      ]
    };

    if (!wx.getStorageSync('badgesData')) {
      wx.setStorageSync('badgesData', defaultData);
    }
  },

  loadBadgeData() {
    const badgesData: BadgesData = wx.getStorageSync('badgesData') || {
      ownedBadges: [],
      unlockedBadges: [],
      taskProgress: []
    };
    this.setData({
      ownedBadges: badgesData.ownedBadges,
      unlockedBadges: badgesData.unlockedBadges,
      taskProgress: badgesData.taskProgress
    });
  },

  calculateProgressPercent() {
    const progressList: TaskProgress[] = this.data.taskProgress.map(item => ({
      ...item,
      progressPercent: Math.min(100, Math.round((item.current / item.target) * 100))
    }));
    
    this.setData({ taskProgress: progressList });
    this.checkNewBadges(progressList);
  },

  checkNewBadges(progressList: TaskProgress[]) {
    let newOwnedBadges = [...this.data.ownedBadges];
    let newUnlockedBadges = [...this.data.unlockedBadges];
    let hasNewBadge = false;

    progressList.forEach((progress: TaskProgress) => {
      if (progress.progressPercent >= 100) {
        const badgeExists = newOwnedBadges.some(badge => 
          badge.name.includes(progress.badgeName)
        );
        
        if (!badgeExists) {
          const index = newUnlockedBadges.findIndex(badge => 
            badge.name.includes(progress.badgeName)
          );
          
          if (index !== -1) {
            const unlockedBadge = newUnlockedBadges[index];
            newOwnedBadges.push({
              id: newOwnedBadges.length + 1,
              name: unlockedBadge.name,
              desc: unlockedBadge.condition || '',
              imageUrl: unlockedBadge.imageUrl
            });
            newUnlockedBadges.splice(index, 1);
            hasNewBadge = true;
          }
        }
      }
    });

    if (hasNewBadge) {
      this.setData({
        ownedBadges: newOwnedBadges,
        unlockedBadges: newUnlockedBadges
      });
      
      this.saveBadgeData();
      this.updateProfileBadgeCount(newOwnedBadges.length);
      
      wx.showToast({
        title: '获得新徽章！',
        icon: 'success'
      });
    }
  },

  saveBadgeData() {
    const badgesData: BadgesData = {
      ownedBadges: this.data.ownedBadges,
      unlockedBadges: this.data.unlockedBadges,
      taskProgress: this.data.taskProgress
    };
    wx.setStorageSync('badgesData', badgesData);
  },

  updateProfileBadgeCount(count: number) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    wx.setStorageSync('userInfo', {
      ...userInfo,
      badges: count
    });
    
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.route === 'pages/my/my') {
        prevPage.setData({
          'userInfo.badges': count
        });
      }
    }
  },

  onBadgeTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const badge = this.data.ownedBadges[index];
    wx.showModal({
      title: `徽章详情 - ${badge.name}`,
      content: badge.desc || '',
      showCancel: false
    });
  }
});