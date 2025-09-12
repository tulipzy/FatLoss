interface Badge {
  id: number;
  name: string;
  desc?: string;
  condition?: string;
  imageUrl: string;
  isNew?: boolean;
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
    taskProgress: [] as TaskProgress[],
    totalBadgesCount: 0
  },

  onLoad() {
    this.initBadgeDemoData();
    this.calculateTotalBadgesCount();
    this.calculateProgressPercent();
  },

  onShow() {
    this.calculateProgressPercent();
    this.checkNewBadges();
  },

  /** 初始化演示数据 */
  initBadgeDemoData() {
    const demoData: BadgesData = {
      ownedBadges: [
        {
          id: 2,
          name: "自律达人",
          desc: "连续7天记录饮食",
          imageUrl: "/images/zilv.jpg",
          isNew: false
        },
        {
          id: 3,
          name: "运动新星",
          desc: "经验值超过100",
          imageUrl: "/images/1.jpg",
          isNew: true
        }
      ],
      unlockedBadges: [
        {
          id: 5,
          name: "饮食记录大师",
          condition: "连续记录饮食10天",
          imageUrl: "/images/zilv2.jpg"
        },
        {
          id: 6,
        name: "进阶达人",
        condition: "经验值达到200",
        imageUrl: "/images/3.jpg"
        },
        
        {
          id: 7,
          name: "耐力王者",
          condition: "经验值达到300",
          imageUrl: "/images/2.jpg"
        },
       
        {
          id: 8,
          name: "力量健将",
          condition: "经验值达到400",
          imageUrl: "/images/4.jpg"
        },
        {
          id: 9,
          name: "热量控制专家",
          condition: "连续达成热量目标",
          imageUrl: "/images/zilv3.jpg"
        }
      ],
      taskProgress: [
        {
          id: 2,
          desc: "连续记录饮食天数",
          current: 8,
          target: 10,
          unit: "天",
          badgeName: "饮食记录大师",
          progressPercent: 0
        },
        {
          id: 3,
          desc: "经验值",
          current: 30,
          target: 200,
          unit: "",
          badgeName: "力量健将",
          progressPercent: 0
        },
        {
          id: 4,
          desc: "连续达成热量目标",
          current: 5,
          target: 7,
          unit: "天",
          badgeName: "热量控制专家",
          progressPercent: 0
        }
      ]
    };

    this.setData({
      ownedBadges: demoData.ownedBadges,
      unlockedBadges: demoData.unlockedBadges,
      taskProgress: demoData.taskProgress
    });
  },

  /** 计算总勋章数 */
  calculateTotalBadgesCount() {
    const { ownedBadges, unlockedBadges } = this.data;
    this.setData({
      totalBadgesCount: ownedBadges.length + unlockedBadges.length
    });
  },

  /** 计算进度百分比并排序任务（完成的任务后置） */
  calculateProgressPercent() {
    const progressList: TaskProgress[] = this.data.taskProgress.map(item => {
      let progressPercent = 0;
      if (item.target > 0) {
        progressPercent = Math.min(100, Math.round((item.current / item.target) * 100));
      }
      return { ...item, progressPercent };
    });

    // 排序逻辑：未完成的任务在前，已完成的任务在后
    // 保持同类任务（都未完成或都已完成）的原始顺序
    progressList.sort((a, b) => {
      // 已完成的任务（100%）排在未完成的后面
      if (a.progressPercent === 100 && b.progressPercent < 100) {
        return 1;
      }
      if (a.progressPercent < 100 && b.progressPercent === 100) {
        return -1;
      }
      // 都未完成或都已完成则保持原有顺序
      return 0;
    });

    this.setData({ taskProgress: progressList });
  },

  /** 检查是否解锁新勋章 - 确保同时只有一个新勋章 */
  checkNewBadges() {
    const { ownedBadges, unlockedBadges, taskProgress } = this.data;
    let newOwnedBadges = [...ownedBadges];
    let newUnlockedBadges = [...unlockedBadges];
    let hasNewBadge = false;
    let newlyUnlockedBadge: Badge | null = null;

    // 遍历所有任务，检查是否达成解锁条件
    taskProgress.forEach(progress => {
      if (progress.progressPercent >= 100) {
        const isAlreadyOwned = newOwnedBadges.some(
          badge => badge.name === progress.badgeName
        );

        if (!isAlreadyOwned) {
          const unlockIndex = newUnlockedBadges.findIndex(
            badge => badge.name === progress.badgeName
          );

          if (unlockIndex !== -1) {
            // 记录新解锁的勋章
            newlyUnlockedBadge = {
              ...newUnlockedBadges[unlockIndex],
              isNew: true,
              desc: newUnlockedBadges[unlockIndex].condition
            };
            newOwnedBadges.push(newlyUnlockedBadge);
            newUnlockedBadges.splice(unlockIndex, 1);
            hasNewBadge = true;
          }
        }
      }
    });

    // 解锁成功处理
    if (hasNewBadge && newlyUnlockedBadge) {
      // 先将所有已拥有勋章的isNew设为false
      newOwnedBadges = newOwnedBadges.map(badge => ({
        ...badge,
        isNew: false
      }));
      
      // 只为新解锁的勋章设置isNew为true
      const newBadgeIndex = newOwnedBadges.findIndex(
        badge => badge.name === newlyUnlockedBadge!.name
      );
      if (newBadgeIndex !== -1) {
        newOwnedBadges[newBadgeIndex].isNew = true;
      }

      this.setData({
        ownedBadges: newOwnedBadges,
        unlockedBadges: newUnlockedBadges
      });
      this.calculateTotalBadgesCount();
      wx.showToast({ title: '恭喜解锁新勋章！', icon: 'success', duration: 1500 });
    }
  },

  /** 点击勋章查看详情 */
  onBadgeTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const badge = this.data.ownedBadges[index];

    wx.showModal({
      title: `勋章详情：${badge.name}`,
      content: `描述：${badge.desc || '无'}\n${badge.isNew ? '⚠️ 这是新获得的勋章哦！' : ''}`,
      showCancel: false,
      confirmText: '我知道了',
      confirmColor: '#FF9900'
    });

    // 点击新勋章后，取消当前勋章的新标记
    if (badge.isNew) {
      const newOwnedBadges = [...this.data.ownedBadges];
      newOwnedBadges[index].isNew = false;
      this.setData({ ownedBadges: newOwnedBadges });
    }
  },

  /** 返回按钮 */
  onBackTap() {
    wx.navigateBack({ delta: 1 });
  },

  /** 去记录按钮 */
  onGoRecordTap() {
    wx.showToast({ title: '跳转到记录页面', icon: 'none' });
  },

  /** 模拟：增加1天记录 */
  onAddRecordDay() {
    const { taskProgress } = this.data;
    const targetTaskIndex = taskProgress.findIndex(item => item.id === 2);
    
    if (targetTaskIndex !== -1) {
      const updatedTasks = [...taskProgress];
      const currentTask = updatedTasks[targetTaskIndex];
      
      if (currentTask.current < currentTask.target) {
        currentTask.current += 1;
        this.setData({ taskProgress: updatedTasks });
        this.calculateProgressPercent();
        this.checkNewBadges();
        
        wx.showToast({
          title: `记录天数+1（当前${currentTask.current}天）`,
          icon: 'none',
          duration: 1000
        });
      } else {
        wx.showToast({
          title: '已达到目标天数！',
          icon: 'none',
          duration: 1000
        });
      }
    }
  },

  /** 模拟：增加20点经验值 */
  onAddExp() {
    const { taskProgress } = this.data;
    const targetTaskIndex = taskProgress.findIndex(item => item.id === 3);
    
    if (targetTaskIndex !== -1) {
      const updatedTasks = [...taskProgress];
      const currentTask = updatedTasks[targetTaskIndex];
      
      if (currentTask.current < currentTask.target) {
        currentTask.current = Math.min(currentTask.current + 20, currentTask.target);
        this.setData({ taskProgress: updatedTasks });
        this.calculateProgressPercent();
        this.checkNewBadges();
        
        wx.showToast({
          title: `经验值+20（当前${currentTask.current}）`,
          icon: 'none',
          duration: 1000
        });
      } else {
        wx.showToast({
          title: '已达到目标经验值！',
          icon: 'none',
          duration: 1000
        });
      }
    }
  }
});