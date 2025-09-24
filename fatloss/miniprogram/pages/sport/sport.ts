// 定义所有需要的接口（统一前置声明）
interface ExerciseRecommendation {
  calories_burned_per_ten_minutes: string;
  category: string;
  exercise_id: number;
  exercise_name: string;
  reps_or_duration: string;
  sets: number;
}

interface Recommendations {
  [key: string]: ExerciseRecommendation[];
}

interface RecommendResponse {
  age: number;
  id: string;
  intensity: string;
  recommendations: Recommendations;
  recommended_weeks: number;
  status: string;
}

interface ApiError {
  status: string;
  message: string;
}

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

interface ExercisePlan {
  id: string;
  name: string;
  duration: number;
  intensity: string;
  intensityText: string;
  calories: number;
  heart_rate: string;
  status: 'todo' | 'doing' | 'done' | 'completed';
  animationData?: any;
}

interface ConfirmExerciseResponse {
  message: string;
  status: string;
}

interface CustomExercise {
  exercise_name: string;
  type: number;
  sets: number;
  reps: number;
  duration_type: number;
  calories_per_10min: number;
}

interface CustomTaskResponse {
  status: string;
  message: string;
}

interface AddSpentTimeResponse {
  status: string;
  message: string;
  total_calories_burned_today?: string; // 添加可选的总卡路里字段
}

// 统一运动记录项接口定义
interface RecentExerciseItem {
  created_at: string;
  exercise_name: string;
  spent_time: number;
  calories?: number;
  date?: string;
  animationData?: any;
}

interface RecentExercisesResponse {
  status: string;
  data: any[];
}

// 添加新的接口响应类型定义
interface DailyCaloriesResponse {
  total_calories_burned_today?: string | number;
  message?: string;
  status?: string;
}

interface ConfirmTaskResponse {
  status: string;
  message: string;
}

// 单一Page实例
Page({
  data: {
      // 基础状态
      currentMode: 'home',
      modeOptions: [
          { id: 'home', name: '居家减脂' },
          { id: 'outdoor', name: '户外训练' },
          { id: 'gym', name: '健身房' }
      ],
      // 控制显示全部推荐的状态
      showAllRecommendations: false,
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
          home: { primary: '#4CAF50', secondary: '#C8E6C9', accent: '#388E3C' },
          outdoor: { primary: '#2196F3', secondary: '#BBDEFB', accent: '#1976D2' },
          gym: { primary: '#FF9800', secondary: '#FFE0B2', accent: '#F57C00' }
      } as ModeColors,
      currentBgColor: '#C8E6C9',
      currentModeContent: '',
      caloriesBurned: 0,
      trainingTime: 0,
      level: 1,
      roleName: "健身新手",
      currentExp: 0,
      totalExp: 100,
      completedSets: 0,
      plans: [] as ExercisePlan[],
      showEditPanel: false,
      showAddForm: false,
      editPlans: [] as ExercisePlan[],
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
      deleteIndex: -1,
      recommendations: null as Recommendations | null,
      isLoading: false,
      errorMsg: '',
      // 从缓存获取userId，缓存键为userId，无缓存时使用默认值
      userID: wx.getStorageSync('userId'),
      selectedIntensity: 'low',
      apiBaseUrl: 'http://60.205.245.221:5050',
      hasConfirmedToday: false,
      isLoadingRecentExercises: false,
      // 统一类型为RecentExerciseItem[]，解决类型冲突
      recentExercises: [] as RecentExerciseItem[],

      // 图片显示控制
      showFullImage: false, // 控制图片是否完全显示
      clickCount: 0, // 记录点击次数

      // 计时核心状态 - 正向计时（修复NodeJS类型问题）
      isRunning: false, // 计时是否进行中
      timer: null as any, // 定时器实例（使用any类型适配小程序环境）
      elapsedSeconds: 0, // 已过去的时间（秒）

      // 训练相关数据
      currentGroup: 0, // 当前组数
      totalGroups: 4, // 总组数
      restSeconds: 45, // 休息时间（秒）
      isResting: false, // 是否处于休息状态

      // 按钮文本
      primaryBtnText: "开始", // 主按钮文本

      // 新视图控制
      showSportsRecordView: false, // 控制运动记录新视图的显示/隐藏

      // 提示窗口控制
      showNoMoreToast: false, // 控制"暂时没有更多啦"提示窗口的显示/隐藏

      // 时间输入相关
      tempExerciseData: {
          name: '',
          caloriesPerTen: 0,
          spentTime: 0
      },
      
      // 临时存储当前操作的运动项目，用于输入框提示
      currentExerciseName: '',

      // 按日期分组的运动记录
      groupedExercises: [] as { date: string; dateLabel: string; exercises: RecentExerciseItem[]; totalMinutes: number; totalCalories: number }[],
  },

  // 动画实例
  panelAnimation: wx.createAnimation({ duration: 300, timingFunction: 'ease' }),
  formAnimation: wx.createAnimation({ duration: 300, timingFunction: 'ease' }),
  contentAnimation: wx.createAnimation({ duration: 300, timingFunction: 'ease' }),

  /**
   * 切换训练模式（居家/户外/健身房）
   * @param e 事件对象，包含选中的模式
   */
  selectMode(e: { currentTarget: { dataset: { mode: string } } }): void {
      const mode = e.currentTarget.dataset.mode;
      if (mode === this.data.currentMode) return;

      // 切换动画 - 淡出
      this.contentAnimation.opacity(0).translateY(-10).step();
      this.setData({ contentAnimation: this.contentAnimation.export() });

      setTimeout(() => {
          const isValidMode = ['home', 'outdoor', 'gym'].includes(mode);

          this.setData({
              currentMode: mode,
              currentBgColor: isValidMode
                ? this.data.modeColors[mode as keyof ModeColors].secondary
                : '#FFFFFF'
          });

          // 更新模式内容和推荐
          this.renderModeContent(mode as 'home' | 'outdoor' | 'gym');
          this.getExerciseRecommendations();

          // 切换动画 - 淡入
          this.contentAnimation.opacity(1).translateY(0).step();
          this.setData({ contentAnimation: this.contentAnimation.export() });

          // 更新导航栏颜色
          if (isValidMode) {
              wx.setNavigationBarColor({
                  frontColor: '#ffffff',
                  backgroundColor: this.data.modeColors[mode as keyof ModeColors].primary
              });
          }
      }, 300);
  },

  /**
   * 渲染当前模式的描述内容
   * @param mode 当前模式
   */
  renderModeContent(mode: 'home' | 'outdoor' | 'gym'): void {
      const contentMap = {
          home: '居家减脂模式：推荐使用瑜伽垫、弹力带等简易器械，适合在家碎片化训练',
          outdoor: '户外训练模式：推荐跑步、骑行、跳绳等，充分利用户外空间',
          gym: '健身房模式：推荐使用跑步机、哑铃、卧推架等专业器械，高效增肌减脂'
      };
      this.setData({ currentModeContent: contentMap[mode] });
  },

  /**
   * 从API获取运动推荐
   * @returns 推荐数据Promise
   */
  fetchRecommendations(): Promise<RecommendResponse> {
      return new Promise((resolve, reject) => {
          wx.request({
              url: `${this.data.apiBaseUrl}/api/recommend`,
              method: 'POST',
              data: {
                  id: this.data.userID,  // 使用从缓存获取的userID
                  intensity: this.data.selectedIntensity
              },
              timeout: 10000,
              header: { 'content-type': 'application/json' },
              success: (res) => {
                  const response = res.data as RecommendResponse | ApiError;
                  if ('status' in response && response.status === 'success') {
                      resolve(response as RecommendResponse);
                  } else {
                      reject(new Error((response as ApiError).message || '获取推荐失败'));
                  }
              },
              fail: (err) => {
                  const errorMsg = err.errMsg.includes('timeout')
                     ? '请求超时，请检查网络连接'
                      : '网络错误，请稍后重试';
                  reject(new Error(errorMsg));
              }
          });
      });
  },

  /**
   * 获取并处理运动推荐
   */
  async getExerciseRecommendations(): Promise<void> {
      this.setData({ isLoading: true, errorMsg: '' });
      try {
          const response = await this.fetchRecommendations();
          const plans = this.convertRecommendationsToPlans(response.recommendations);

          this.setData({
              recommendations: response.recommendations,
              plans
          });

          // 保存到本地存储
          wx.setStorageSync('fitnessUserData', {
             ...this.data,
              plans
          });
      } catch (error) {
          console.error('获取运动推荐失败:', error);
          this.setData({
              errorMsg: error instanceof Error? error.message : '获取推荐失败'
          });
          this.loadUserDataFromStorage();
      } finally {
          this.setData({ isLoading: false });
      }
  },

  /**
   * 将推荐数据转换为训练计划格式
   * @param recommendations 推荐数据
   * @returns 训练计划数组
   */
  convertRecommendationsToPlans(recommendations: Recommendations): ExercisePlan[] {
      const plans: ExercisePlan[] = [];
      let planIndex = 1;

      const currentModeMapping: Record<string, string> = {
          'home': '居家',
          'outdoor': '户外',
          'gym': '健身房'
      };
      const currentModeChinese = currentModeMapping[this.data.currentMode] || '居家';
      const currentRecommendations = recommendations[currentModeChinese] || [];

      currentRecommendations.forEach((rec: ExerciseRecommendation, index: number) => {
          const caloriesPerTenMin = parseFloat(rec.calories_burned_per_ten_minutes || '0');
          let totalDuration = 0;

          if (rec.reps_or_duration.includes('minutes')) {
              totalDuration = parseInt(rec.reps_or_duration);
          } else if (rec.reps_or_duration.includes('reps')) {
              totalDuration = 3 * rec.sets;
          }
          const totalCalories = Math.round((totalDuration / 10) * caloriesPerTenMin);

          // 强度映射
          const intensityMap: Record<string, { value: string; text: string; heartRate: string }> = {
              high: { value: 'high', text: '高强度', heartRate: '150-170' },
              medium: { value:'medium', text: '中强度', heartRate: '120-140' },
              low: { value: 'low', text: '低强度', heartRate: '90-120' }
          };
          let intensity = intensityMap.medium;
          if (totalCalories / totalDuration > 10) intensity = intensityMap.high;
          if (totalCalories / totalDuration < 5) intensity = intensityMap.low;

          plans.push({
              id: `plan${planIndex++}`,
              name: rec.exercise_name,
              duration: totalDuration,
              intensity: intensity.value,
              intensityText: intensity.text,
              calories: totalCalories,
              heart_rate: intensity.heartRate,
              status: index === 0? 'doing' : 'todo'
          });
      });

      return plans;
  },

  /**
   * 改变训练强度
   * @param e 事件对象，包含强度索引
   */
  changeIntensity(e: { detail: { value: number } }): void {
      const index = e.detail.value;
      const intensityMap = ['low','medium', 'high'];

      if (index >= 0 && index < intensityMap.length) {
          this.setData({ selectedIntensity: intensityMap[index] });
          this.getExerciseRecommendations();
      }
  },

  /**
   * 页面加载生命周期函数
   */
  onLoad(): void {
      // 初始化动画
      this.panelAnimation.opacity(0).translateY(-50).step();
      this.setData({ panelAnimation: this.panelAnimation.export() });

      this.formAnimation.opacity(0).translateY(-50).step();
      this.setData({ formAnimation: this.formAnimation.export() });

      // 加载本地存储数据并初始化训练计划
      this.loadUserDataFromStorage();

      // 初始化页面数据
      this.renderModeContent('home');
      this.getExerciseRecommendations();
      this.getRecentExercises();

      // 初始化时获取今日总消耗数据
      this.fetchTodayCalories();
  },

  /**
   * 从本地存储加载用户数据
   */
  loadUserDataFromStorage(): void {
      const userData = wx.getStorageSync('fitnessUserData');
      if (userData) {
          // 加载训练计划数据
          if (userData.plans && userData.plans.length > 0) {
              const normalizedPlans = userData.plans.map((plan: any) => ({
                 ...plan,
                  duration: Number(plan.duration),
                  calories: Number(plan.calories),
                  status: plan.status || 'todo'
              })) as ExercisePlan[];
              this.setData({ plans: normalizedPlans });
          }

          // 加载今日成就数据（已消耗卡路里和训练时长）
          if (typeof userData.caloriesBurned === 'number') {
              this.setData({ caloriesBurned: userData.caloriesBurned });
          }
          if (typeof userData.trainingTime === 'number') {
              this.setData({ trainingTime: userData.trainingTime });
          }
          if (typeof userData.completedSets === 'number') {
              this.setData({ completedSets: userData.completedSets });
          }
          if (typeof userData.currentExp === 'number') {
              this.setData({ currentExp: userData.currentExp });
          }
          if (typeof userData.level === 'number') {
              this.setData({ level: userData.level });
          }
          if (userData.roleName) {
              this.setData({ roleName: userData.roleName });
          }
          if (typeof userData.totalExp === 'number') {
              this.setData({ totalExp: userData.totalExp });
          }
      } else {
          // 使用默认训练计划
          this.setData({
              plans: [
                  { id: 'plan1', name: '有氧热身', duration: 5, intensity: 'low', intensityText: '低强度', calories: 100, heart_rate: '120-130', status: 'completed' },
                  { id: 'plan2', name: 'HIIT训练', duration: 15, intensity: 'high', intensityText: '高强度', calories: 150, heart_rate: '150-170', status: 'doing' },
                  { id: 'plan3', name: '力量训练', duration: 20, intensity:'medium', intensityText: '中强度', calories: 200, heart_rate: '130-150', status: 'todo' },
                  { id: 'plan4', name: '拉伸放松', duration: 10, intensity: 'low', intensityText: '低强度', calories: 50, heart_rate: '90-110', status: 'todo' }
              ]
          });
      }
  },

  /**
   * 打开编辑计划面板 - 优化动画实现，确保面板居中
   */
  openEditPanel(): void {
      const editPlans = JSON.parse(JSON.stringify(this.data.plans)).map((plan: any) => ({
         ...plan,
          animationData: wx.createAnimation({ duration: 200, timingFunction: 'ease' })
      })) as ExercisePlan[];

      // 重置动画并设置初始状态
      this.panelAnimation = wx.createAnimation({
          duration: 300,
          timingFunction: 'ease',
          transformOrigin: 'center center'
      });
      
      // 先设置为完全透明并小幅缩小，然后显示面板
      this.setData({
          editPlans,
          showEditPanel: true,
          panelAnimation: this.panelAnimation.opacity(0).scale(0.95).export()
      });

      // 在下一个动画帧中执行淡入和缩放动画，不修改translate属性
      setTimeout(() => {
          this.panelAnimation.opacity(1).scale(1).step();
          this.setData({ panelAnimation: this.panelAnimation.export() });
      }, 10);
  },

  /**
   * 关闭编辑计划面板
   */
  closeEditPanel(): void {
      this.panelAnimation.opacity(0).step();
      this.setData({ panelAnimation: this.panelAnimation.export() });
      
      setTimeout(() => {
          this.setData({ showEditPanel: false });
      }, 300);
  },

  /**
   * 打开添加计划表单
   */
  openAddForm(): void {
      this.setData({
          showAddForm: true,
          newPlan: { name: '', duration: '', intensity: 'low', intensityText: '低强度', calories: '', heart_rate: '' },
          intensityIndex: 0
      });

      this.formAnimation.opacity(1).translateY(0).step();
      this.setData({ formAnimation: this.formAnimation.export() });
  },

  /**
   * 关闭添加计划表单
   */
  closeAddForm(): void {
      this.formAnimation.opacity(0).translateY(-50).step();
      this.setData({ formAnimation: this.formAnimation.export() });
      
      setTimeout(() => {
          this.setData({ showAddForm: false });
      }, 300);
  },

  /**
   * 关闭所有面板
   */
  closeAllPanels(): void {
      this.closeEditPanel();
      this.closeAddForm();
  },

  /**
   * 确认删除计划项
   * @param e 事件对象，包含索引
   */
  confirmDelete(e: any): void {
      const index = e.currentTarget.dataset.index;
      this.setData({ deleteIndex: index });
      wx.showModal({
          title: '确认删除',
          content: '确定删除该项目？',
          success: (res) => res.confirm && this.deleteItem(index)
      });
  },

  /**
   * 删除计划项
   * @param index 计划项索引
   */
  deleteItem(index: number): void {
      const editPlans = [...this.data.editPlans];
      if (editPlans[index] && 'animationData' in editPlans[index]) {
          (editPlans[index] as any).animationData.opacity(0).translateX(-50).step();
      }
      this.setData({ editPlans });
      
      setTimeout(() => {
          editPlans.splice(index, 1);
          this.setData({ editPlans });
      }, 200);
  },

  /**
   * 处理计划名称输入
   * @param e 事件对象
   */
  onNameInput(e: { detail: { value: any } }): void {
      this.setData({ 'newPlan.name': e.detail.value });
  },

  /**
   * 处理计划时长输入
   * @param e 事件对象
   */
  onDurationInput(e: { detail: { value: any } }): void {
      this.setData({ 'newPlan.duration': e.detail.value });
  },

  /**
   * 处理强度变化
   * @param e 事件对象
   */
  onIntensityChange(e: { detail: { value: any } }): void {
      const index = e.detail.value;
      const intensityMap = ['low','medium', 'high'];
      const intensityTextMap = ['低强度', '中强度', '高强度'];
      this.setData({
          intensityIndex: index,
          'newPlan.intensity': intensityMap[index],
          'newPlan.intensityText': intensityTextMap[index]
      });
  },

  /**
   * 处理卡路里输入
   * @param e 事件对象
   */
  onCaloriesInput(e: { detail: { value: any } }): void {
      this.setData({ 'newPlan.calories': e.detail.value });
  },

  /**
   * 处理心率输入
   * @param e 事件对象
   */
  onHeartRateInput(e: { detail: { value: any } }): void {
      this.setData({ 'newPlan.heart_rate': e.detail.value });
  },

  /**
   * 处理搜索输入
   * @param e 事件对象
   */
  onSearchInput(e: any) {
      const searchValue = e.detail.value;
      // 这里可以根据搜索值进行过滤或其他操作
      console.log('搜索输入:', searchValue);
  },

  /**
   * 确认添加新计划
   */
  confirmAdd(): void {
      const { name, duration, calories, heart_rate } = this.data.newPlan;
      
      // 表单验证
      if (!name.trim()) {
          wx.showToast({ title: '请输入训练名称', icon: 'none' });
          return;
      }
      
      if (!duration ||!/^\d+$/.test(duration) || Number(duration) <= 0) {
          wx.showToast({ title: '时长必须为正整数', icon: 'none' });
          return;
      }
      
      if (!calories ||!/^\d+$/.test(calories) || Number(calories) <= 0) {
          wx.showToast({ title: '卡路里必须为正整数', icon: 'none' });
          return;
      }
      
      if (!heart_rate ||!/^\d+-\d+$/.test(heart_rate)) {
          wx.showToast({ title: '心率格式应为"数字-数字"', icon: 'none' });
          return;
      }

      // 处理名称重复
      const { editPlans, newPlan } = this.data;
      let newName = newPlan.name.trim();
      let count = 1;
      while (editPlans.some((plan: any) => plan.name === newName)) {
          newName = `${newPlan.name.trim()}(${count})`;
          count++;
      }

      // 创建新计划项
      const newItem = {
         ...newPlan,
          id: `plan${Date.now()}`,
          name: newName,
          duration: Number(duration),
          calories: Number(calories),
          status: 'todo',
          animationData: wx.createAnimation({ duration: 300, timingFunction: 'ease' })
      };

      // 添加动画效果
      const updatedPlans = [...editPlans, newItem];
      newItem.animationData!.opacity(0).translateY(20).step();
      this.setData({ editPlans: updatedPlans as any });

      setTimeout(() => {
          newItem.animationData!.opacity(1).translateY(0).step();
          this.setData({ editPlans: updatedPlans as any });
      }, 10);

      this.closeAddForm();
  },

  /**
   * 取消编辑
   */
  cancelEdit(): void {
      if (JSON.stringify(this.data.editPlans)!== JSON.stringify(this.data.plans)) {
          wx.showModal({
              title: '提示',
              content: '是否放弃修改？',
              success: (res) => res.confirm && this.closeEditPanel()
          });
      } else {
          this.closeEditPanel();
      }
  },

  /**
   * 保存编辑的计划
   */
  saveEdit(): void {
      this.setData({ plans: this.data.editPlans });
      wx.setStorageSync('fitnessUserData', this.data);
      
      // 调用确认锻炼任务接口，保存修改后的计划
      this.saveAndConfirmPlan();
      
      this.closeEditPanel();
  },
  
  /**
   * 保存计划并调用确认接口
   */
  async saveAndConfirmPlan(): Promise<void> {
      try {
          const response = await this.requestAPI<{ status: string; message: string }>('/api/confirm', 'POST', {
              id: this.data.userID,  // 使用从缓存获取的userID
              type: 1
          });
          
          if (response.status === 'success') {
              wx.showToast({
                  title: response.message || '保存成功', 
                  icon: 'success',
                  duration: 2000
              });
          } else {
              wx.showToast({
                  title: '保存成功，确认任务失败', 
                  icon: 'none',
                  duration: 2000
              });
          }
      } catch (error) {
          console.error('调用确认锻炼任务接口失败:', error);
          wx.showToast({
              title: '保存成功，确认任务失败', 
              icon: 'none',
              duration: 2000
          });
      }
  },

  /**
   * 更新训练数据（时间、卡路里、经验值）
   * @param timeAdded 新增时间（分钟）
   * @param caloriesAdded 新增卡路里
   */
  updateTrainingData(timeAdded: number, caloriesAdded: number): void {
      if (typeof timeAdded!== 'number' || typeof caloriesAdded!== 'number') {
          console.error('时间和卡路里必须为数字类型');
          return;
      }

      // 计算基础数据
      const newTime = this.data.trainingTime + timeAdded;
      const newCalories = this.data.caloriesBurned + caloriesAdded;
      const newSets = this.data.completedSets + 1;

      // 修改后的经验值计算算法：降低卡路里贡献，增加时间权重
      const expFromCalories = Math.floor(caloriesAdded / 5); // 卡路里贡献降低为原来的1/5
      const expFromTime = Math.floor(timeAdded / 5); // 每分钟增加约0.2点经验值，比原来更合理
      const expGained = expFromCalories + expFromTime;
      
      let newCurrentExp = this.data.currentExp + expGained;
      let newLevel = this.data.level;
      let newRoleName = this.data.roleName;
      let newTotalExp = this.data.totalExp;

      // 处理升级逻辑
      while (newCurrentExp >= newTotalExp) {
          newCurrentExp -= newTotalExp;
          newLevel++;
          newTotalExp = Math.floor(newTotalExp * 1.5);
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

      // 保存到本地
      wx.setStorageSync('fitnessUserData', this.data);
  },

  /**
   * 根据等级获取角色名称
   * @param level 用户等级
   * @returns 角色名称
   */
  getRoleName(level: number): string {
      const roleMap = [
          { min: 10, name: "健身大神" },
          { min: 7, name: "健身达人" },
          { min: 4, name: "健身爱好者" },
          { min: 1, name: "健身新手" }
      ];
      return roleMap.find(role => level >= role.min)?.name || "健身新手";
  },

  /**
   * 确认完成今日锻炼
   */
  async confirmExerciseTask(): Promise<void> {
      wx.showLoading({ title: '确认中...' });
      
      try {
          // 获取所有已完成的计划
          const completedPlans = this.data.plans.filter((plan: ExercisePlan) => 
              plan.status === 'completed' || plan.status === 'done'
          );
          
          const response = await this.requestAPI<ConfirmExerciseResponse>('/api/confirm', 'POST', {
              id: this.data.userID,  // 使用从缓存获取的userID
              type: 1,
              completed_plans: completedPlans.map(plan => ({
                  id: plan.id,
                  name: plan.name,
                  duration: plan.duration,
                  calories: plan.calories
              }))
          });
          
          if (response.status === 'success') {
              wx.showToast({
                  title: response.message,
                  icon: 'success',
                  duration: 2000
              });
              
              this.setData({ hasConfirmedToday: true });
              const userData = wx.getStorageSync('fitnessUserData') || {};
              wx.setStorageSync('fitnessUserData', { ...userData, hasConfirmedToday: true });
          }
      } catch (error) {
          console.error('确认锻炼任务失败:', error);
          wx.showToast({
              title: error instanceof Error? error.message : '确认失败',
              icon: 'none',
              duration: 2000
          });
      } finally {
          wx.hideLoading();
      }
  },
  
  /**
   * 通用API请求方法
   * @param url 请求路径
   * @param method 请求方法
   * @param data 请求数据
   * @returns 响应数据Promise
   */
  requestAPI<T>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
      return new Promise((resolve, reject) => {
          wx.request({
              url: `${this.data.apiBaseUrl}${url}`,
              method,
              data,
              timeout: 10000,
              header: { 'content-type': 'application/json' },
              success: (res) => {
                  resolve(res.data as T);
              },
              fail: (err) => {
                  const errorMsg = err.errMsg.includes('timeout')
                     ? '请求超时，请检查网络连接'
                      : '网络错误，请稍后重试';
                  reject(new Error(errorMsg));
              }
          });
      });
  },
  
  /**
   * 添加自定义训练任务
   */
  async addCustomTask(): Promise<void> {
      const modeMap: Record<string, number> = {
          'home': 1,
          'outdoor': 2,
          'gym': 3
      };
      
      // 转换计划为API所需格式
      const exercises = this.data.plans.map(plan => {
          let durationType = 1;
          let reps = parseInt(plan.duration.toString());
          
          if (plan.name.includes('跳') || plan.name.includes('蹲')) {
              durationType = 2;
              reps = Math.floor(plan.duration / 3);
          }
          
          return {
              exercise_name: plan.name,
              type: modeMap[this.data.currentMode] || 1,
              sets: 1,
              reps: reps,
              duration_type: durationType,
              calories_per_10min: Math.round(plan.calories * 10 / plan.duration)
          } as CustomExercise;
      });
      
      if (exercises.length === 0) {
          wx.showToast({ title: '请先添加运动计划', icon: 'none' });
          return;
      }
      
      // 使用弹窗让用户输入运动天数
      wx.showModal({
          title: '设置运动天数',
          content: '请输入您计划进行的运动天数',
          editable: true,
          placeholderText: '14', // 默认14天
          success: async (res) => {
              if (res.confirm && res.content) {
                  const days = Number(res.content);
                  
                  if (!isNaN(days) && days > 0 && Number.isInteger(days)) {
                      wx.showLoading({ title: '添加中...' });
                      
                      try {
                          const response = await this.requestAPI<CustomTaskResponse>('/api/readd', 'POST', {
                              id: this.data.userID,  // 使用从缓存获取的userID
                              type: modeMap[this.data.currentMode] || 1,
                              days: days,
                              exercises: exercises
                          });
                          
                          if (response.status === 'success') {
                              wx.showToast({
                                  title: response.message,
                                  icon: 'success',
                                  duration: 2000
                              });
                          }
                      } catch (error) {
                          console.error('添加自定义任务失败:', error);
                          wx.showToast({
                              title: error instanceof Error? error.message : '添加失败',
                              icon: 'none',
                              duration: 2000
                          });
                      } finally {
                          wx.hideLoading();
                      }
                  } else {
                      wx.showToast({ 
                          title: '请输入有效的整数天数', 
                          icon: 'none' 
                      });
                  }
              }
          }
      });
  },
  
  /**
   * 添加运动时间记录
   * @param exerciseName 运动名称
   * @param spentTime 运动时间（分钟）
   */
  async addExerciseTime(exerciseName: string, spentTime: number): Promise<void> {
    if (!this.data.userID) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '记录中...' });

    try {
      // 获取当前本地时间作为记录时间
      const now = new Date();
      
      const response = await this.requestAPI<AddSpentTimeResponse>('/api/add_spentTime', 'POST', {
        id: this.data.userID,  // 使用从缓存获取的userID
        exercise_name: exerciseName,
        spent_time: spentTime,
        // 添加当前本地时间作为记录时间
        record_time: now.toISOString()
      });

      if (response.status === 'success') {
        // 添加调试信息，检查API返回的数据
        console.log('API返回的运动记录数据:', response);
        // 获取接口返回的总卡路里数据
        const totalCalories = response.total_calories_burned_today || '0.00';

        wx.showToast({
          title: `记录成功，今日已消耗${totalCalories}千卡`,
          icon: 'success',
          duration: 2000
        });

        // 更新最近运动记录和训练数据
        this.getRecentExercises();
        // 从返回的总卡路里中计算本次消耗的卡路里
        const currentTotalCalories = parseFloat(totalCalories);
        const previousCalories = this.data.caloriesBurned;
        const caloriesBurned = Math.max(0, currentTotalCalories - previousCalories);
        this.updateTrainingData(spentTime, caloriesBurned);

        // 同步运动消耗数据到缓存，供其他页面使用
        wx.setStorageSync('exerciseCalories', currentTotalCalories);

        // 设置一个标志，表示我的页面需要更新
        wx.setStorageSync('needUpdateMyPage', true);

        // 发送事件通知其他页面更新数据
        if ((wx as any).eventBus) {
          (wx as any).eventBus.emit('exerciseDataChanged');
        }
      }
    } catch (error) {
      console.error('记录运动时间失败:', error);
      wx.showToast({
        title: error instanceof Error? error.message : '记录失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  /**
   * 获取最近运动记录
   */
  async getRecentExercises(): Promise<void> {
      this.setData({ isLoadingRecentExercises: true });
      
      try {
          // 首先尝试从本地缓存获取数据（5分钟内有效）
          const cachedData = wx.getStorageSync("lastExerciseHistory");
          if (cachedData && Date.now() - cachedData.time < 300000) { // 300000ms = 5分钟
              console.log('使用本地缓存的运动数据（sport页面）');
              
              // 从缓存数据中提取所有记录
              const allRecords: any[] = [];
              cachedData.data.forEach((group: any) => {
                  allRecords.push(...group.records);
              });
              
              // 处理缓存数据
              const processedExercises = allRecords.map(item => {
                  // 从原始数据中获取完整信息
                  const original = item.original || item;
                   
                  // 格式化日期
                  const dateObj = new Date(original.created_at || item.date.replace(/[年月]/g, "-").replace("日", ""));
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                   
                  // 打印所有可能的运动名字段，查看哪个字段实际包含运动名称
                  console.log('缓存数据中的运动名字段:', { exercise_name: original.exercise_name, name: original.name, sport_name: original.sport_name });
                   
                  return {
                      ...original,
                      date: formattedDate,
                      time: item.time || '',
                      calories: item.calorie,
                      animationData: wx.createAnimation({ duration: 300, timingFunction: 'ease' }),
                      // 显式添加运动名称
                      exercise_name: original.exercise_name || original.name || original.sport_name || '未知运动'
                  };
              });
              
              // 按日期分组
              const grouped = this.groupExercisesByDate(processedExercises);
              
              this.setData({
                  recentExercises: processedExercises,
                  groupedExercises: grouped
              });
              
              // 添加动画效果
              this.animateRecords();
              this.setData({ isLoadingRecentExercises: false });
              return;
          }
          
          // 缓存不存在或已过期，调用API获取数据
          const response = await this.requestAPI<RecentExercisesResponse>(
              `/api/recent_exercises?id=${this.data.userID}`,  // 使用从缓存获取的userID
              'GET'
          );
          
          if (response.status === 'success' && response.data) {
              // 打印原始响应数据，查看created_at的实际值
              console.log('原始API响应数据:', response.data);
              
              // 在处理API数据前添加
          console.log('API返回的单个记录数据结构:', response.data[0]);
          console.log('运动名称字段是否存在:', 'exercise_name' in response.data[0]);
          
          // 处理API返回的数据，转换日期格式并计算卡路里
              const processedExercises = response.data.map(item => {
                  // 打印每个item的created_at值
                  console.log('原始created_at值:', item.created_at);
                  
                  // 打印所有可能的运动名字段，查看哪个字段实际包含运动名称
                  console.log('检查运动名字段:', { exercise_name: item.exercise_name, name: item.name, sport_name: item.sport_name });
                       
                  // 将created_at转换为YYYY-MM-DD格式
                  const dateObj = new Date(item.created_at);
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const day = String(dateObj.getDate()).padStart(2, '0');
                  const formattedDate = `${year}-${month}-${day}`;
                       
                  // 计算卡路里消耗（如果API没有返回）
                  const calories = item.calories || Math.round(item.spent_time * 10);
                       
                  return {
                      ...item, // 修复语法错误：删除...item前面的空格
                      date: formattedDate,
                      calories: calories,
                      animationData: wx.createAnimation({ duration: 300, timingFunction: 'ease' }),
                      // 改进运动名称提取逻辑，确保获取用户上传的实际运动名称
                      exercise_name: item.exercise_name || item.name || item.sport_name || '未知运动'
                  };
              });
              
              // 按日期分组
              const grouped = this.groupExercisesByDate(processedExercises);
              
              this.setData({
                  recentExercises: processedExercises,
                  groupedExercises: grouped
              });
              
              // 添加动画效果
              this.animateRecords();
          }
      } catch (error) {
          console.error('获取最近运动记录失败:', error);
      } finally {
          this.setData({ isLoadingRecentExercises: false });
      }
  },
  
  /**
   * 按日期分组运动记录
   */
  groupExercisesByDate(exercises: RecentExerciseItem[]): { date: string; dateLabel: string; exercises: RecentExerciseItem[]; totalMinutes: number; totalCalories: number }[] {
      const groups: Record<string, RecentExerciseItem[]> = {};
      
      // 按日期分组
      exercises.forEach(exercise => {
          const date = exercise.date || '';
          if (!groups[date]) {
              groups[date] = [];
          }
          groups[date].push(exercise);
      });
      
      // 转换为数组并添加统计信息
      return Object.keys(groups).map(date => {
          const exercisesInDate = groups[date];
          const totalMinutes = exercisesInDate.reduce((sum: number, item) => sum + item.spent_time, 0);
          const totalCalories = exercisesInDate.reduce((sum: number, item) => sum + (item.calories || 0), 0);
          
          // 获取日期标签（今天、昨天、前天或具体日期）
          const dateLabel = this.getDateLabel(date);
          
          return {
              date,
              dateLabel,
              exercises: exercisesInDate,
              totalMinutes,
              totalCalories
          };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // 按日期倒序排列
  },
  
  /**
   * 获取日期标签
   */
  getDateLabel(dateString: string): string {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays === 2) return '前天';
      
      // 返回具体日期
      return `${date.getMonth() + 1}月${date.getDate()}日`;
  },
  
  /**
   * 根据运动名称获取图标
   */
  getExerciseIcon(exerciseName: string): string {
      // 简单的图标映射
      const iconMap: Record<string, string> = {
          '跑步': '🏃',
          '游泳': '🏊',
          '瑜伽': '🧘',
          '健身': '🏋️',
          '骑行': '🚴',
          '跳绳': '🥅',
          '有氧': '🔥',
          'HIIT': '⚡',
          '力量': '💪',
          '拉伸': '🧘'
      };
      
      // 查找匹配的图标
      for (const [key, icon] of Object.entries(iconMap)) {
          if (exerciseName.includes(key)) {
              return icon;
          }
      }
      
      return '🏃'; // 默认图标
  },
  
  /**
   * 根据运动名称获取颜色
   */
  getExerciseColor(exerciseName: string): string {
      // 简单的颜色映射
      const colorMap: Record<string, string> = {
          '跑步': '#FF6B6B',
          '游泳': '#4ECDC4',
          '瑜伽': '#45B7D1',
          '健身': '#F9CA24',
          '骑行': '#6C5CE7',
          '跳绳': '#FD79A8',
          '有氧': '#FFA000',
          'HIIT': '#E74C3C',
          '力量': '#2ECC71',
          '拉伸': '#9B59B6'
      };
      
      // 查找匹配的颜色
      for (const [key, color] of Object.entries(colorMap)) {
          if (exerciseName.includes(key)) {
              return color;
          }
      }
      
      return '#1E90FF'; // 默认颜色
  },
  
  /**
   * 为记录项添加动画效果
   */
  animateRecords(): void {
      const records = this.data.groupedExercises;
      
      records.forEach((group: any, groupIndex: number) => {
          group.exercises.forEach((exercise: any, index: number) => {
              setTimeout(() => {
                  exercise.animationData.opacity(1).translateY(0).step();
                  this.setData({
                      [`groupedExercises[${groupIndex}].exercises[${index}].animationData`]: exercise.animationData.export()
                  });
              }, (groupIndex * 3 + index) * 100);
          });
      });
  },
  
  /**
   * 导航到历史记录页面
   */
  navigateToHistory(): void {
      wx.navigateTo({
          url: '/pages/exerciseHistory/exerciseHistory'
      });
  },

  /**
   * 格式化时间（秒 -> HH:MM:SS 或 MM:SS）
   * @param seconds 秒数
   * @returns 格式化后的时间字符串
   */
  formatTime(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      // 小时为0则不显示
      if (hours === 0) {
          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  /**
   * 开始计时
   */
  startTimer(): void {
      if (this.data.timer) return;
      
      const timer = setInterval(() => {
          this.setData((prev: any) => {
              // 休息状态计时
              if (prev.isResting) {
                  if (prev.restSeconds <= 1) {
                      clearInterval(timer);
                      return {
                          restSeconds: 45,
                          isResting: false,
                          timer: null,
                          primaryBtnText: "继续"
                      };
                  }
                  return { restSeconds: prev.restSeconds - 1 };
              }
              
              // 训练计时（正向增加）
              return { elapsedSeconds: prev.elapsedSeconds + 1 };
          });
      }, 1000);
      
      this.setData({
          isRunning: true,
          timer,
          primaryBtnText: "暂停"
      });
  },
  
  /**
   * 暂停计时
   */
  pauseTimer(): void {
      if (this.data.timer) {
          clearInterval(this.data.timer);
      }
      
      this.setData({
          isRunning: false,
          timer: null,
          primaryBtnText: "继续"
      });
  },
  
  /**
   * 切换计时状态（开始/继续/暂停）
   */
  toggleTimer(): void {
      if (this.data.isRunning) {
          this.pauseTimer();
      } else {
          this.startTimer();
      }
  },
  
  /**
   * 完成当前组训练
   */
  completeGroup(): void {
      // 记录当前组的训练时间
      const minutesSpent = Math.floor(this.data.elapsedSeconds / 60);
      if (minutesSpent > 0) {
          // 估算卡路里消耗（假设每分钟消耗10千卡）
          const caloriesBurned = minutesSpent * 10;
          this.updateTrainingData(minutesSpent, caloriesBurned);
      }
      
      this.pauseTimer();
      this.setData((prev: any) => {
          const nextGroup = prev.currentGroup + 1;
          const isLastGroup = nextGroup > prev.totalGroups;
          
          if (isLastGroup) {
              // 完成所有组
              return {
                  currentGroup: prev.totalGroups,
                  elapsedSeconds: 0,
                  primaryBtnText: "完成"
              };
          }
          
          // 进入休息状态
          return {
              currentGroup: nextGroup,
              isResting: true,
              elapsedSeconds: 0,
              primaryBtnText: "开始下一组"
          };
      });
  },
  
  /**
   * 页面卸载时清理定时器
   */
  onUnload(): void {
      if (this.data.timer) {
          clearInterval(this.data.timer);
      }
  },
  
  /**
   * 切换显示全部推荐
   */
  toggleShowAllRecommendations(): void {
      this.setData({
          showAllRecommendations:!this.data.showAllRecommendations
      });
  },
  
  /**
   * 获取今日总消耗卡路里的方法
   */
  async fetchTodayCalories(): Promise<void> {
      try {
          // 调用新的API获取今日总消耗卡路里
          const response = await this.requestAPI<DailyCaloriesResponse>(
              `/api/daily_calories?id=${this.data.userID}`,  // 使用从缓存获取的userID
              'GET'
          );
          
          // 兼容旧的接口格式
          if ((response as any).status === 'success' && (response as any).total_calories_burned_today) {
              const totalCalories = parseFloat((response as any).total_calories_burned_today);
              
              // 更新页面数据并持久化
              this.setData({ caloriesBurned: totalCalories });
              
              // 保存到本地存储
              const userData = wx.getStorageSync('fitnessUserData') || {};
              wx.setStorageSync('fitnessUserData', {
                 ...userData,
                  caloriesBurned: totalCalories
              });
              
              // 同步运动消耗数据到首页使用的缓存
              wx.setStorageSync('exerciseCalories', totalCalories);
          } else if (typeof response === 'object' && 'total_calories_burned_today' in response) {
              // 处理新的接口响应格式
              const totalCalories = parseFloat(response.total_calories_burned_today as string);
              
              // 更新页面数据并持久化
              this.setData({ caloriesBurned: totalCalories });
              
              // 保存到本地存储
              const userData = wx.getStorageSync('fitnessUserData') || {};
              wx.setStorageSync('fitnessUserData', {
                 ...userData,
                  caloriesBurned: totalCalories
              });
              
              // 同步运动消耗数据到首页使用的缓存
              wx.setStorageSync('exerciseCalories', totalCalories);
          }
      } catch (error) {
          console.error('获取今日卡路里数据失败:', error);
          // 失败时不影响用户体验，继续使用本地数据
      }
  },
  
  /**
   * 切换图片显示状态的方法
   */
  toggleImageDisplay(): void {
      // 切换新视图的显示状态
      this.setData({
          showSportsRecordView:!this.data.showSportsRecordView
      });
  },

  /**
   * 显示"暂时没有更多啦"提示窗口
   */
  showNoMoreDataToast(): void {
      this.setData({
          showNoMoreToast: true
      });
  },

  /**
   * 隐藏"暂时没有更多啦"提示窗口
   */
  hideNoMoreToast(): void {
      this.setData({
          showNoMoreToast: false
      });
  },

  /**
   * 显示时间输入对话框 - 核心修改：将运动项目设置为临时提示文本
   */
  showTimeInputDialog(e: any): void {
      const exerciseName = e.currentTarget.dataset.exercise;
      const caloriesPerTen = parseFloat(e.currentTarget.dataset.caloriesPerTen) || 50;
      
      // 存储当前运动项目名称到数据中
      this.setData({
          'tempExerciseData.name': exerciseName,
          'tempExerciseData.caloriesPerTen': caloriesPerTen,
          currentExerciseName: exerciseName // 存储当前运动项目用于输入框提示
      });
      
      // 创建一个自定义弹窗，使用input组件实现临时提示文本功能
      wx.showModal({
          title: '记录运动时间',
          content: '', // 清空内容，使用input的placeholder作为提示
          editable: true,
          // 设置placeholder为运动项目名称，用户输入时会自动消失
          placeholderText: `运动项目：${exerciseName}，请输入时间（分钟）`,
          success: (res) => {
              if (res.confirm && res.content) {
                  const spentTime = Number(res.content);
                  
                  if (!isNaN(spentTime) && spentTime > 0 && spentTime <= 300) {
                      // 先计算消耗的卡路里，以便在对话框中显示
                      const caloriesBurned = Math.round((spentTime / 10) * caloriesPerTen);
                      
                      // 显示确认对话框，包含计算的卡路里
                      wx.showModal({
                          title: '确认记录',
                          content: `\n运动项目：${exerciseName}\n运动时间：${spentTime}分钟\n消耗：${caloriesBurned}千卡\n\n是否确认记录？`,
                          showCancel: true,
                          success: (confirmRes) => {
                              if (confirmRes.confirm) {
                                  // 修复参数数量不匹配错误：只传递两个参数
                                  this.addExerciseTimeWithCalories(exerciseName, spentTime);
                              }
                          }
                      });
                  } else {
                      wx.showToast({
                          title: '请输入有效的时间（1-300分钟）',
                          icon: 'none'
                      });
                  }
              }
          }
      });
  },

  /**
   * 添加运动时间记录（带计算的卡路里）
   */
  async addExerciseTimeWithCalories(exerciseName: string, spentTime: number): Promise<void> {
      if (!exerciseName || spentTime <= 0) {
          wx.showToast({ title: '运动信息不完整', icon: 'none' });
          return;
      }
      
      wx.showLoading({ title: '记录中...' });
      
      try {
          const response = await this.requestAPI<AddSpentTimeResponse>('/api/add_spentTime', 'POST', {
              id: this.data.userID,  // 使用从缓存获取的userID
              exercise_name: exerciseName,
              spent_time: spentTime
          });
          
          if (response.status === 'success') {
              // 使用接口返回的总卡路里数据
              const totalCalories = response.total_calories_burned_today || '0.00';
              
              wx.showToast({
                  title: `记录成功，今日已消耗${totalCalories}千卡`,
                  icon: 'success',
                  duration: 2000
              });
              
              // 更新最近运动记录和训练数据
              this.getRecentExercises();
              // 从返回的总卡路里中计算本次消耗的卡路里
              const currentTotalCalories = parseFloat(totalCalories);
              const previousCalories = this.data.caloriesBurned;
              const actualCaloriesBurned = Math.max(0, currentTotalCalories - previousCalories);
              this.updateTrainingData(spentTime, actualCaloriesBurned);
              
              // 同步运动消耗数据到首页使用的缓存
              wx.setStorageSync('exerciseCalories', currentTotalCalories);
              
              // 发送事件通知首页更新数据
              const app = getApp();
              if (app.globalData?.eventBus) {
                  app.globalData.eventBus.emit('exerciseDataChanged');
              }
          }
      } catch (error) {
          console.error('记录运动时间失败:', error);
          wx.showToast({
              title: error instanceof Error? error.message : '记录失败',
              icon: 'none',
              duration: 2000
          });
      } finally {
          wx.hideLoading();
      }
  },

  /**
   * 切换计划项完成状态
   */
  changePlanStatus(e: { currentTarget: { dataset: { id: string } } }): void {
      const planId = e.currentTarget.dataset.id;
      const plan = this.data.plans.find((p: ExercisePlan) => p.id === planId);
      
      if (!plan) {
          wx.showToast({ title: '计划不存在', icon: 'none' });
          return;
      }
      
      // 只有待完成状态可以切换为已完成
      if (plan.status === 'todo') {
          const updatedPlans = this.data.plans.map((p: ExercisePlan) => {
              if (p.id === planId) {
                  return { ...p, status: 'completed' as const };
              }
              return p;
          });
          
          this.setData({ plans: updatedPlans });
          
          // 保存到本地存储
          wx.setStorageSync('fitnessUserData', { ...this.data, plans: updatedPlans });
          
          // 调用API记录完成的训练计划
          this.recordCompletedPlan(plan);
          
          // 显示成功提示
          wx.showToast({
              title: '已添加到记录，你太棒了~',
              icon: 'success',
              duration: 2000
          });
      }
  },
  
  /**
   * 记录完成的训练计划到后端
   */
  async recordCompletedPlan(plan: ExercisePlan): Promise<void> {
      try {
          // 首先获取用户ID
          const userId = wx.getStorageSync('userId') || 'a631c63702a5453c86fce9a42008e54a';
          
          await this.requestAPI('/api/complete_plan', 'POST', {
              id: userId,
              plan_id: plan.id,
              exercise_name: plan.name,
              duration: plan.duration,
              calories: plan.calories,
              calorie: plan.calories // 额外添加calorie字段，确保后端能接收到热量数据
          });
          
          console.log('运动计划记录成功:', plan.name);
          
          // 更新训练数据
          this.updateTrainingData(plan.duration, plan.calories);
          
          // 同步到本地存储，确保数据一致性
          wx.setStorageSync('fitnessUserData', this.data);
          
          // 发送事件通知，确保其他页面能及时更新数据
          const app = getApp();
          if (app.globalData?.eventBus) {
              app.globalData.eventBus.emit('exerciseDataChanged');
          }
      } catch (error) {
          console.error('记录完成的训练计划失败:', error);
      }
  }
});


