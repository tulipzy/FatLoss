Page({
  data: {
    // 添加训练模式相关数据
    currentMode: '', // 初始为空
    modeOptions: [
      { id: 'home', name: '居家减脂' },
      { id: 'outdoor', name: '户外训练' },
      { id: 'gym', name: '健身房' }
    ],
    isDropdownExpanded: false, // 下拉菜单展开状态
    dropdownAnimation: {}, // 下拉菜单动画
    // 模式专属标题和副标题
    modeTitles: {
      home: '居家减脂',
      outdoor: '户外训练',
      gym: '健身房'
    },
    modeSubtitles: {
      home: '利用碎片化时间进行高效训练',
      outdoor: '享受大自然的同时燃烧卡路里',
      gym: '专业器械助力，塑造完美身材'
    },
    // 模式专属背景色
    modeColors: {
      home: {
        primary: '#4CAF50',
        secondary: '#C8E6C9',
        accent: '#388E3C'
      },
      outdoor: {
        primary: '#2196F3',
        secondary: '#BBDEFB',
        accent: '#1976D2'
      },
      gym: {
        primary: '#FF9800',
        secondary: '#FFE0B2',
        accent: '#F57C00'
      }
    },
    currentBgColor: '#FFFFFF', // 默认背景色
    currentModeContent: '', // 模式专属内容
    contentAnimation: {}, // 内容区动画
    caloriesBurned: 0,       // 已消耗千卡数初始化为0
    trainingTime: 0,         // 训练时长初始化为0（秒）
    level: 1,                // 用户等级初始化为Lv.1
    roleName: "健身新手",     // 初始角色名称
    currentExp: 0,           // 当前经验值初始化为0
    totalExp: 100,           // Lv.1升级所需总经验
    completedSets: 0,        // 完成组数初始化为0
    plans: [                 // 训练计划数据
      {
        id: 'plan1',
        name: '有氧热身',
        duration: 5,         // 单位：分钟
        intensity: 'low',
        intensityText: '低强度',
        calories: 100,       // 单位：千卡
        heart_rate: '120-130',
        status: 'completed'
      },
      {
        id: 'plan2',
        name: 'HIIT训练',
        duration: 15,
        intensity: 'high',
        intensityText: '高强度',
        calories: 150,
        heart_rate: '150-170',
        status: 'doing'
      },
      {
        id: 'plan3',
        name: '力量训练',
        duration: 20,
        intensity: 'medium',
        intensityText: '中强度',
        calories: 200,
        heart_rate: '130-150',
        status: 'todo'
      },
      {
        id: 'plan4',
        name: '拉伸放松',
        duration: 10,
        intensity: 'low',
        intensityText: '低强度',
        calories: 50,
        heart_rate: '90-110',
        status: 'todo'
      }
    ],
    showEditPanel: false,    // 编辑面板显示状态
    showAddForm: false,      // 添加表单显示状态
    editPlans: [],           // 编辑中的计划数据
    newPlan: {
      name: '',
      duration: '',          // 临时存储字符串，提交时转为数字
      intensity: 'low',
      intensityText: '低强度',
      calories: '',          // 临时存储字符串，提交时转为数字
      heart_rate: ''
    },
    intensityOptions: ['低强度', '中强度', '高强度'],
    intensityIndex: 0,
    panelAnimation: {},      // 面板动画
    formAnimation: {},       // 表单动画
    deleteIndex: -1          // 待删除项目索引
  },

  // 添加训练模式选择方法
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.currentMode) return;

    // 退场动画
    this.contentAnimation.opacity(0).translateY(-10).step();
    this.setData({
      contentAnimation: this.contentAnimation.export()
    });

    // 动画结束后切换模式
    setTimeout(() => {
      this.setData({
        currentMode: mode,
        currentBgColor: this.data.modeColors[mode].secondary,
      });

      // 渲染新模式内容
      this.renderModeContent(mode);

      // 入场动画
      this.contentAnimation.opacity(1).translateY(0).step();
      this.setData({
        contentAnimation: this.contentAnimation.export()
      });

      // 应用主题色
      wx.setNavigationBarColor({
        frontColor: '#ffffff',
        backgroundColor: this.data.modeColors[mode].primary,
      });
    }, 300);
  },

  // 渲染模式专属内容
  renderModeContent(mode) {
    switch(mode) {
      case 'home':
        this.setData({
          currentModeContent: this.renderHomeMode()
        });
        break;
      case 'outdoor':
        this.setData({
          currentModeContent: this.renderOutdoorMode()
        });
        break;
      case 'gym':
        this.setData({
          currentModeContent: this.renderGymMode()
        });
        break;
    }
  },

  // 渲染居家减脂模式内容
  renderHomeMode() {
    return `
      <view class="feature-grid">
        <view class="feature-card" hover-class="feature-card-hover">
          <text class="feature-title">碎片化时间训练</text>
          <text class="feature-desc">利用碎片时间进行短训练</text>
        </view>
        <view class="feature-card" hover-class="feature-card-hover">
          <text class="feature-title">日常物品变器械</text>
          <text class="feature-desc">用水瓶/椅子等作为训练工具</text>
        </view>
        <view class="feature-card" hover-class="feature-card-hover">
          <text class="feature-title">小空间高效利用</text>
          <text class="feature-desc">仅需2㎡空间完成训练</text>
        </view>
        <view class="feature-card" hover-class="feature-card-hover">
          <text class="feature-title">静音训练方案</text>
          <text class="feature-desc">低噪音动作不扰邻</text>
        </view>
      </view>
      <view class="tip-card">
        <text class="tip-title">居家训练小贴士</text>
        <text class="tip-content">利用碎片化时间进行短时间高强度训练，可以有效提升代谢水平，达到更好的减脂效果。</text>
      </view>
    `;
  },

  // 渲染户外训练模式内容
  renderOutdoorMode() {
    return `
      <view class="weather-panel">
        <text class="weather-title">实时天气</text>
        <text class="weather-temp">25°C</text>
        <text class="weather-desc">晴朗 · 湿度50% · 风速3m/s</text>
      </view>
      <view class="terrain-selector">
        <text class="selector-title">选择地形</text>
        <view class="terrain-options">
          <view class="terrain-item">公园</view>
          <view class="terrain-item">山地</view>
          <view class="terrain-item">街道</view>
        </view>
      </view>
      <view class="map-preview">
        <text class="map-title">训练路线</text>
        <view class="map-placeholder">地图预览区域</view>
      </view>
    `;
  },

  // 渲染健身房模式内容
  renderGymMode() {
    return `
      <view class="equipment-panel">
        <text class="equipment-title">器械选择</text>
        <view class="equipment-options">
          <view class="equipment-item">自由重量</view>
          <view class="equipment-item">器械区</view>
          <view class="equipment-item">有氧区</view>
        </view>
      </view>
      <view class="schedule-panel">
        <text class="schedule-title">课程安排</text>
        <view class="schedule-list">
          <view class="schedule-item">
            <text class="schedule-time">09:00</text>
            <text class="schedule-name">动感单车</text>
          </view>
          <view class="schedule-item">
            <text class="schedule-time">11:00</text>
            <text class="schedule-name">瑜伽课程</text>
          </view>
          <view class="schedule-item">
            <text class="schedule-time">15:00</text>
            <text class="schedule-name">力量训练</text>
          </view>
        </view>
      </view>
    `;
  },

  onLoad() {
    // 页面初始化时加载用户数据
    this.loadUserData();
    // 初始化动画
    this.initAnimations();
    // 初始渲染居家减脂模式
    this.renderModeContent('home');
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
  },

  // 加载用户数据
  loadUserData() {
    const userData = wx.getStorageSync('fitnessUserData');
    if (userData) {
      // 确保加载的数据类型正确
      const normalizedData = {
        ...userData,
        plans: userData.plans.map(plan => ({
          ...plan,
          duration: Number(plan.duration),
          calories: Number(plan.calories)
        }))
      };
      this.setData(normalizedData);
    } else {
      // 初始化新用户数据
      this.setData(this.data);
    }
  },

  // 打开编辑面板
  openEditPanel() {
    // 深拷贝计划数据到编辑数据
    const editPlans = JSON.parse(JSON.stringify(this.data.plans));
    // 为每个项目添加动画
    editPlans.forEach(item => {
      item.animationData = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease',
      });
    });
    
    // 先初始化动画状态（透明）
    this.panelAnimation.opacity(0).step();
    this.setData({
      editPlans,
      showEditPanel: true,
      panelAnimation: this.panelAnimation.export()
    });
    
    // 强制重绘后执行淡入动画
    setTimeout(() => {
      this.panelAnimation.opacity(1).step();
      this.setData({
        panelAnimation: this.panelAnimation.export()
      });
    }, 10);
  },

  // 关闭编辑面板
  closeEditPanel() {
    // 执行动画 - 淡出效果
    this.panelAnimation.opacity(0).step();
    this.setData({
      panelAnimation: this.panelAnimation.export()
    });
    // 动画结束后隐藏
    setTimeout(() => {
      this.setData({
        showEditPanel: false
      });
    }, 300);
  },

  // 打开添加表单
  openAddForm() {
    this.setData({
      showAddForm: true,
      newPlan: {
        name: '',
        duration: '',
        intensity: 'low',
        intensityText: '低强度',
        calories: '',
        heart_rate: ''
      },
      intensityIndex: 0
    });
    // 执行动画 - 淡入并重置位置
    this.formAnimation.opacity(1).translateY(0).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
  },

  // 关闭添加表单
  closeAddForm() {
    this.formAnimation.opacity(0).translateY(-50).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
    // 动画结束后隐藏
    setTimeout(() => {
      this.setData({
        showAddForm: false
      });
    }, 300);
  },

  // 关闭所有面板
  closeAllPanels() {
    this.closeEditPanel();
    this.closeAddForm();
  },

  // 确认删除项目
  confirmDelete(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      deleteIndex: index
    });
    wx.showModal({
      title: '确认删除',
      content: '确定删除该项目？',
      success: (res) => {
        if (res.confirm) {
          this.deleteItem(index);
        }
      }
    });
  },

  // 删除项目
  deleteItem(index) {
    // 执行删除动画
    const editPlans = [...this.data.editPlans];
    editPlans[index].animationData.opacity(0).translateX(-50).step();
    this.setData({
      editPlans
    });
    // 动画结束后删除
    setTimeout(() => {
      editPlans.splice(index, 1);
      this.setData({
        editPlans
      });
    }, 200);
  },

  // 输入训练名称
  onNameInput(e) {
    this.setData({
      'newPlan.name': e.detail.value
    });
  },

  // 输入时长
  onDurationInput(e) {
    this.setData({
      'newPlan.duration': e.detail.value
    });
  },

  // 选择强度
  onIntensityChange(e) {
    const index = e.detail.value;
    const intensityMap = ['low', 'medium', 'high'];
    const intensityTextMap = ['低强度', '中强度', '高强度'];
    this.setData({
      intensityIndex: index,
      'newPlan.intensity': intensityMap[index],
      'newPlan.intensityText': intensityTextMap[index]
    });
  },

  // 输入消耗
  onCaloriesInput(e) {
    this.setData({
      'newPlan.calories': e.detail.value
    });
  },

  // 输入心率范围
  onHeartRateInput(e) {
    this.setData({
      'newPlan.heart_rate': e.detail.value
    });
  },

  // 确认添加
  confirmAdd() {
    const { name, duration, calories, heart_rate } = this.data.newPlan;
    
    // 表单验证
    if (!name.trim()) {
      wx.showToast({
        title: '请输入训练名称',
        icon: 'none'
      });
      return;
    }
    
    if (!duration || !/^\d+$/.test(duration) || Number(duration) <= 0) {
      wx.showToast({
        title: '时长必须为正整数',
        icon: 'none'
      });
      return;
    }
    
    if (!calories || !/^\d+$/.test(calories) || Number(calories) <= 0) {
      wx.showToast({
        title: '卡路里必须为正整数',
        icon: 'none'
      });
      return;
    }
    
    if (!heart_rate || !/^\d+-\d+$/.test(heart_rate)) {
      wx.showToast({
        title: '心率格式应为"数字-数字"',
        icon: 'none'
      });
      return;
    }

    // 检查名称重复
    const { editPlans, newPlan } = this.data;
    let newName = newPlan.name.trim();
    let count = 1;
    while (editPlans.some(plan => plan.name === newName)) {
      newName = `${newPlan.name.trim()}(${count})`;
      count++;
    }

    // 创建新项目（转换为正确的数据类型）
    const newItem = {
      ...newPlan,
      id: `plan${Date.now()}`,
      name: newName,
      duration: Number(duration),
      calories: Number(calories),
      status: 'todo', // 新项目默认为未开始
      animationData: wx.createAnimation({
        duration: 300,
        timingFunction: 'ease',
      })
    };

    // 添加到列表并设置初始动画状态
    const updatedPlans = [...editPlans, newItem];
    newItem.animationData.opacity(0).translateY(20).step();
    this.setData({
      editPlans: updatedPlans
    });

    // 执行入场动画
    setTimeout(() => {
      newItem.animationData.opacity(1).translateY(0).step();
      this.setData({
        editPlans: updatedPlans
      });
    }, 10);

    // 关闭表单
    this.closeAddForm();
  },

  // 取消编辑
  cancelEdit() {
    // 检查是否有修改
    if (JSON.stringify(this.data.editPlans) !== JSON.stringify(this.data.plans)) {
      wx.showModal({
        title: '提示',
        content: '是否放弃修改？',
        success: (res) => {
          if (res.confirm) {
            this.closeEditPanel();
          }
        }
      });
    } else {
      this.closeEditPanel();
    }
  },

  // 保存编辑
  saveEdit() {
    // 更新主计划数据
    this.setData({
      plans: this.data.editPlans
    });

    // 保存到用户数据缓存（与其他用户数据统一存储）
    wx.setStorageSync('fitnessUserData', this.data);

    // 关闭面板
    this.closeEditPanel();

    // 提示成功
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 更新训练数据并计算经验值
  updateTrainingData(timeAdded, caloriesAdded) {
    // 验证输入为数字
    if (typeof timeAdded !== 'number' || typeof caloriesAdded !== 'number') {
      console.error('时间和卡路里必须为数字类型');
      return;
    }

    // 更新基础数据
    const newTime = this.data.trainingTime + timeAdded;
    const newCalories = this.data.caloriesBurned + caloriesAdded;
    const newSets = this.data.completedSets + 1;

    // 计算获得的经验值（每消耗1千卡=1经验，每训练1分钟=2经验）
    const expGained = caloriesAdded + Math.floor(timeAdded / 60) * 2;
    let newCurrentExp = this.data.currentExp + expGained;
    let newLevel = this.data.level;
    let newRoleName = this.data.roleName;
    let newTotalExp = this.data.totalExp;

    // 等级提升逻辑
    while (newCurrentExp >= newTotalExp) {
      newCurrentExp -= newTotalExp;
      newLevel++;
      newTotalExp = Math.floor(newTotalExp * 1.5); // 每次升级所需经验增加50%
      newRoleName = this.getRoleName(newLevel);
    }

    // 更新数据
    this.setData({
      trainingTime: newTime,
      caloriesBurned: newCalories,
      completedSets: newSets,
      currentExp: newCurrentExp,
      level: newLevel,
      roleName: newRoleName,
      totalExp: newTotalExp
    });

    // 保存数据到本地缓存
    wx.setStorageSync('fitnessUserData', this.data);
  },

  // 根据等级获取角色名称
  getRoleName(level) {
    const roleMap = [
      { min: 10, name: "健身大神" },
      { min: 7, name: "健身达人" },
      { min: 4, name: "健身爱好者" },
      { min: 1, name: "健身新手" }
    ];
    return roleMap.find(role => level >= role.min)?.name || "健身新手";
  }
})
