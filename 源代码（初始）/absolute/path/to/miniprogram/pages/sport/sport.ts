// ... existing code ...
Page({
  data: {
    // 添加训练模式相关数据
    currentMode: 'home', // 默认选中居家减脂
    modeOptions: [
      { id: 'home', name: '居家减脂' },
      { id: 'outdoor', name: '户外训练' },
      { id: 'gym', name: '健身房' }
    ],
    // 根据模式存储不同的训练计划
    modePlans: {
      home: [
        { id: 'home1', name: '有氧热身', duration: 5, intensity: 'low', intensityText: '低强度', calories: 100, heart_rate: '120-130', status: 'completed' },
        { id: 'home2', name: 'HIIT训练', duration: 15, intensity: 'high', intensityText: '高强度', calories: 150, heart_rate: '150-170', status: 'doing' },
        { id: 'home3', name: '力量训练(徒手)', duration: 20, intensity: 'medium', intensityText: '中强度', calories: 200, heart_rate: '130-150', status: 'todo' },
        { id: 'home4', name: '拉伸放松', duration: 10, intensity: 'low', intensityText: '低强度', calories: 50, heart_rate: '90-110', status: 'todo' }
      ],
      outdoor: [
        { id: 'outdoor1', name: '慢跑热身', duration: 10, intensity: 'low', intensityText: '低强度', calories: 150, heart_rate: '120-130', status: 'todo' },
        { id: 'outdoor2', name: '间歇跑', duration: 20, intensity: 'high', intensityText: '高强度', calories: 300, heart_rate: '150-170', status: 'todo' },
        { id: 'outdoor3', name: '核心训练', duration: 15, intensity: 'medium', intensityText: '中强度', calories: 150, heart_rate: '130-150', status: 'todo' },
        { id: 'outdoor4', name: '步行放松', duration: 10, intensity: 'low', intensityText: '低强度', calories: 80, heart_rate: '100-120', status: 'todo' }
      ],
      gym: [
        { id: 'gym1', name: '器械热身', duration: 10, intensity: 'low', intensityText: '低强度', calories: 120, heart_rate: '110-120', status: 'todo' },
        { id: 'gym2', name: '重量训练', duration: 30, intensity: 'high', intensityText: '高强度', calories: 350, heart_rate: '140-160', status: 'todo' },
        { id: 'gym3', name: '有氧运动', duration: 20, intensity: 'medium', intensityText: '中强度', calories: 250, heart_rate: '130-150', status: 'todo' },
        { id: 'gym4', name: '拉伸放松', duration: 15, intensity: 'low', intensityText: '低强度', calories: 70, heart_rate: '90-110', status: 'todo' }
      ]
    },
    plans: [], // 初始化为空，在onLoad中根据模式加载
    // ... 其他现有数据 ...
  },

  // 添加训练模式选择方法
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    // 执行模式切换动画
    this.switchModeAnimation(mode);
  },

  // 模式切换动画
  switchModeAnimation(mode) {
    // 创建页面淡出动画
    const pageAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });

    pageAnimation.opacity(0).step();
    this.setData({
      pageAnimation: pageAnimation.export()
    });

    // 动画结束后切换模式
    setTimeout(() => {
      this.setData({
        currentMode: mode,
        plans: this.data.modePlans[mode],
        // 重置训练数据
        caloriesBurned: 0,
        trainingTime: 0,
        completedSets: 0
      });

      // 执行淡入动画
      pageAnimation.opacity(1).step();
      this.setData({
        pageAnimation: pageAnimation.export()
      });
    }, 300);
  },

  onLoad() {
    // 页面初始化时加载用户数据
    this.loadUserData();
    // 初始化动画
    this.initAnimations();
    // 加载默认模式(居家减脂)的训练计划
    this.setData({
      plans: this.data.modePlans['home']
    });
    // 初始化表单动画状态（隐藏状态）
    this.formAnimation.opacity(0).translateY(-50).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
  },

  // 初始化动画
  initAnimations() {
    this.panelAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
    this.formAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
    this.contentAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
    // 添加下拉菜单动画
    this.dropdownAnimation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease',
    });
  },
  // ... 其他现有方法 ...
  // 切换下拉菜单显示/隐藏
  toggleDropdown() {
    const isExpanded = this.data.isDropdownExpanded;
    // 更新展开状态
    this.setData({
      isDropdownExpanded: !isExpanded
    });
    // 应用动画
    if (!isExpanded) {
      // 展开动画
      this.dropdownAnimation.height(0).opacity(0).step();
      this.setData({
        dropdownAnimation: this.dropdownAnimation.export()
      });
      // 强制重绘后执行展开动画
      setTimeout(() => {
        this.dropdownAnimation.height('auto').opacity(1).step();
        this.setData({
          dropdownAnimation: this.dropdownAnimation.export()
        });
      }, 10);
    } else {
      // 收起动画
      this.dropdownAnimation.height(0).opacity(0).step();
      this.setData({
        dropdownAnimation: this.dropdownAnimation.export()
      });
    }
  },
  pageAnimation = wx.createAnimation({
    duration: 300,
    timingFunction: 'ease',
  });
});