// 保持原有的接口定义不变
interface ModeColorConfig {
  primary: string;
  secondary: string;
  accent: string;
}

interface ModeColors {
  home: ModeColorConfig;
  outdoor: ModeColorConfig;
  gym: ModeColorConfig;
  [key: string]: ModeColorConfig;
}

Page({
  data: {
    // 所有数据定义保持不变
    currentMode: '',
    modeOptions: [
      { id: 'home', name: '居家减脂' },
      { id: 'outdoor', name: '户外训练' },
      { id: 'gym', name: '健身房' }
    ],
    isDropdownExpanded: false,
    dropdownAnimation: {},
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
    } as ModeColors,
    currentBgColor: '#FFFFFF',
    currentModeContent: '',
    caloriesBurned: 0,
    trainingTime: 0,
    level: 1,
    roleName: "健身新手",
    currentExp: 0,
    totalExp: 100,
    completedSets: 0,
    plans: [
      {
        id: 'plan1',
        name: '有氧热身',
        duration: 5,
        intensity: 'low',
        intensityText: '低强度',
        calories: 100,
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
    showEditPanel: false,
    showAddForm: false,
    editPlans: [],
    newPlan: {
      name: '',
      duration: '',
      intensity: 'low',
      intensityText: '低强度',
      calories: '',
      heart_rate: ''
    },
    intensityOptions: ['低强度', '中强度', '高强度'],
    intensityIndex: 0,
    panelAnimation: {},
    formAnimation: {},
    deleteIndex: -1
  },

  // 新增：在页面实例上声明动画属性
  panelAnimation: wx.createAnimation({
    duration: 300,
    timingFunction: 'ease',
  }),
  formAnimation: wx.createAnimation({
    duration: 300,
    timingFunction: 'ease',
  }),
  contentAnimation: wx.createAnimation({
    duration: 300,
    timingFunction: 'ease',
  }),

  // 选择模式方法保持不变
  selectMode(e: { currentTarget: { dataset: { mode: any; }; }; }) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.currentMode) return;

    // 退场动画
    this.contentAnimation.opacity(0).translateY(-10).step();
    this.setData({
      contentAnimation: this.contentAnimation.export()
    });

    // 动画结束后切换模式
    setTimeout(() => {
      const isValidMode = ['home', 'outdoor', 'gym'].includes(mode);
      
      this.setData({
        currentMode: mode,
        currentBgColor: isValidMode 
          ? this.data.modeColors[mode].secondary 
          : '#FFFFFF',
      });

      this.renderModeContent(mode);

      // 入场动画
      this.contentAnimation.opacity(1).translateY(0).step();
      this.setData({
        contentAnimation: this.contentAnimation.export()
      });

      if (isValidMode) {
        wx.setNavigationBarColor({
          frontColor: '#ffffff',
          backgroundColor: this.data.modeColors[mode].primary,
        });
      }
    }, 300);
  },

  // 渲染模式内容方法保持不变
  // 修改renderModeContent方法的参数类型声明
  renderModeContent(mode: 'home' | 'outdoor' | 'gym') {
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
    
  // 渲染居家模式方法保持不变
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

  // 渲染户外模式方法保持不变
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

  // 渲染健身房模式方法保持不变
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

  // 修改onLoad方法，移除重复的动画初始化
  onLoad() {
    // 页面初始化时加载用户数据
    this.loadUserData();
    // 初始渲染居家减脂模式
    this.renderModeContent('home');
    // 初始化表单动画状态（隐藏状态）
    this.formAnimation.opacity(0).translateY(-50).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
  },

  // 删除原有的initAnimations方法，因为我们已经在页面实例上直接声明了动画对象

  // 加载用户数据方法保持不变
  loadUserData() {
    const userData = wx.getStorageSync('fitnessUserData');
    if (userData) {
      const normalizedData = {
        ...userData,
        plans: userData.plans.map((plan: any) => ({
          ...plan,
          duration: Number(plan.duration),
          calories: Number(plan.calories)
        }))
      };
      this.setData(normalizedData);
    } else {
      this.setData(this.data);
    }
  },

  // 打开编辑面板方法保持不变
  openEditPanel() {
    const editPlans = JSON.parse(JSON.stringify(this.data.plans));
    editPlans.forEach((item: any) => {
      item.animationData = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease',
      });
    });
    
    this.panelAnimation.opacity(0).step();
    this.setData({
      editPlans,
      showEditPanel: true,
      panelAnimation: this.panelAnimation.export()
    });
    
    setTimeout(() => {
      this.panelAnimation.opacity(1).step();
      this.setData({
        panelAnimation: this.panelAnimation.export()
      });
    }, 10);
  },

  // 其余方法保持不变...
  closeEditPanel() {
    this.panelAnimation.opacity(0).step();
    this.setData({
      panelAnimation: this.panelAnimation.export()
    });
    setTimeout(() => {
      this.setData({
        showEditPanel: false
      });
    }, 300);
  },

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
    this.formAnimation.opacity(1).translateY(0).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
  },

  closeAddForm() {
    this.formAnimation.opacity(0).translateY(-50).step();
    this.setData({
      formAnimation: this.formAnimation.export()
    });
    setTimeout(() => {
      this.setData({
        showAddForm: false
      });
    }, 300);
  },

  closeAllPanels() {
    this.closeEditPanel();
    this.closeAddForm();
  },

  confirmDelete(e: any) {
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

  deleteItem(index: number) {
    const editPlans = [...this.data.editPlans];
    if (editPlans[index] && 'animationData' in editPlans[index]) {
      (editPlans[index] as any).animationData.opacity(0).translateX(-50).step();
    }
    this.setData({
      editPlans
    });
    setTimeout(() => {
      editPlans.splice(index, 1);
      this.setData({
        editPlans
      });
    }, 200);
  },

  onNameInput(e: { detail: { value: any; }; }) {
    this.setData({
      'newPlan.name': e.detail.value
    });
  },

  onDurationInput(e: { detail: { value: any; }; }) {
    this.setData({
      'newPlan.duration': e.detail.value
    });
  },

  onIntensityChange(e: { detail: { value: any; }; }) {
    const index = e.detail.value;
    const intensityMap = ['low', 'medium', 'high'];
    const intensityTextMap = ['低强度', '中强度', '高强度'];
    this.setData({
      intensityIndex: index,
      'newPlan.intensity': intensityMap[index],
      'newPlan.intensityText': intensityTextMap[index]
    });
  },

  onCaloriesInput(e: { detail: { value: any; }; }) {
    this.setData({
      'newPlan.calories': e.detail.value
    });
  },

  onHeartRateInput(e: { detail: { value: any; }; }) {
    this.setData({
      'newPlan.heart_rate': e.detail.value
    });
  },

  confirmAdd() {
    const { name, duration, calories, heart_rate } = this.data.newPlan;
    
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

    const { editPlans, newPlan } = this.data;
    let newName = newPlan.name.trim();
    let count = 1;
    while (editPlans.some((plan: any) => plan.name === newName)) {
      newName = `${newPlan.name.trim()}(${count})`;
      count++;
    }

    const newItem = {
      ...newPlan,
      id: `plan${Date.now()}`,
      name: newName,
      duration: Number(duration),
      calories: Number(calories),
      status: 'todo',
      animationData: wx.createAnimation({
        duration: 300,
        timingFunction: 'ease',
      })
    };

    const updatedPlans = [...editPlans, newItem];
    newItem.animationData.opacity(0).translateY(20).step();
    this.setData({
      editPlans: updatedPlans as any
    });

    setTimeout(() => {
      newItem.animationData.opacity(1).translateY(0).step();
      this.setData({
        editPlans: updatedPlans as any
      });
    }, 10);

    this.closeAddForm();
  },

  cancelEdit() {
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

  saveEdit() {
    this.setData({
      plans: this.data.editPlans
    });

    wx.setStorageSync('fitnessUserData', this.data);
    this.closeEditPanel();
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  updateTrainingData(timeAdded: number, caloriesAdded: number) {
    if (typeof timeAdded !== 'number' || typeof caloriesAdded !== 'number') {
      console.error('时间和卡路里必须为数字类型');
      return;
    }

    const newTime = this.data.trainingTime + timeAdded;
    const newCalories = this.data.caloriesBurned + caloriesAdded;
    const newSets = this.data.completedSets + 1;

    const expGained = caloriesAdded + Math.floor(timeAdded / 60) * 2;
    let newCurrentExp = this.data.currentExp + expGained;
    let newLevel = this.data.level;
    let newRoleName = this.data.roleName;
    let newTotalExp = this.data.totalExp;

    while (newCurrentExp >= newTotalExp) {
      newCurrentExp -= newTotalExp;
      newLevel++;
      newTotalExp = Math.floor(newTotalExp * 1.5);
      newRoleName = this.getRoleName(newLevel);
    }

    this.setData({
      trainingTime: newTime,
      caloriesBurned: newCalories,
      completedSets: newSets,
      currentExp: newCurrentExp,
      level: newLevel,
      roleName: newRoleName,
      totalExp: newTotalExp
    });

    wx.setStorageSync('fitnessUserData', this.data);
  },

  getRoleName(level: number) {
    const roleMap = [
      { min: 10, name: "健身大神" },
      { min: 7, name: "健身达人" },
      { min: 4, name: "健身爱好者" },
      { min: 1, name: "健身新手" }
    ];
    return roleMap.find(role => level >= role.min)?.name || "健身新手";
  }
})
