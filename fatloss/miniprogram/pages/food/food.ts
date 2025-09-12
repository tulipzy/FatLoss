// 定义饮食记录类型
interface DietRecord {
  dishName: string;
  weight: number;
  calorie: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  time: string; // 统一使用 ISO 格式
}

// 定义喝水记录类型
interface WaterRecord {
  amount: number;
  time: string; // 统一使用 ISO 格式
  date?: Date;
}

// 工具函数：生成 YYYY-MM-DD 格式的日期
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 定义用户信息接口
interface UserInfo {
  calorieGoal: number;
  hand_length: number;
  height: number;
  weight: number;
  target_weight: number;
  gender: number;
  activity_level: number;
  birth: string;
}

// 定义百度API识别响应类型
interface BaiduApiResponse {
  code: string;
  msg: string;
  data: {
    items: {
      kcal_per100g: number;
      density: number;
      intro: string;
      name: string;
      weight_g: number;
      volume_cm3: number;
      total_kcal: number;
    }[];
  } | null;
}

// 定义数据库查询响应类型
interface DbQueryResponse {
  code: string;
  msg: string;
  data: {
    items: {
      kcal_per100g: number;
      density: number;
      intro: string;
      name: string;
      weight_g: number;
      volume_cm3: number;
      total_kcal: number;
    }[];
  } | null;
}

// 定义添加食物响应类型
interface AddFoodResponse {
  code: string;
  msg: string;
  data: string;
}

// 定义热量计算响应类型
interface BackendCalorieResponse {
  code: string;
  msg: string;
  data: {
    caloriePlan?: number;
    tdee?: number;
    recordDate?: string;
  };
}

// 定义餐具类型联合类型
type DishType = "bowl" | "plane";

Page({
  data: {
    previewImage: "",
    showSearch: false,
    dietIntake: 0,                // 已摄入热量（与首页同步）
    sportConsume: 0,
    recommendCalorie: 1800,       // 推荐热量
    remainCalorie: 1800,          // 剩余热量
    progressCircleStyle: "",
    dietList: [] as DietRecord[], 
    formattedDietList: [] as any[], // 格式化后的饮食记录列表

    // 喝水记录相关
    waterIntake: 0,
    recommendWater: 2000, 
    waterUnit: 'ml',
    waterOptions: [100, 200, 300, 500] as const, 
    selectedWater: 200,
    waterRecords: [] as WaterRecord[], 
    waterProgressRatio: 0, 
    waterProgressBarStyle: "", 
    waterCupStyle: "", 

    // 接口参数
    handLength: 18.0,
    dishType: "bowl" as DishType,  // 全局餐具类型参数
    showCameraTip: true,
    isProcessing: false,
    searchKeyword: "", // 用于存储搜索关键词

    // 添加食物弹窗相关
    showAddFoodModal: false, // 控制弹窗显示
    newFoodName: "", // 新食物名称
    newFoodKcalPer100g: "", // 新食物每100g热量
    newFoodWeight: "100", // 新食物重量，默认100g
    addFoodError: "", // 添加食物错误提示

    // 数据库查询前的食物名称输入弹窗
    showInputFoodNameModal: false, // 控制名称输入弹窗显示
    foodNameForDbQuery: "", // 存储用户输入的、用于数据库查询的食物名称
    inputFoodNameError: "", // 名称输入错误提示
    tempImagePath: "", // 临时存储待查询的图片路径（AI识别失败后保存）

    // 餐具类型选择弹窗相关
    showDishTypeModal: false, // 控制弹窗显示
    selectedDishType: "bowl" as DishType, // 当前选中的餐具类型（弹窗内）
    dishTypePickerValue: 0, // 存储 picker 的 value 值
    dishTypeOptions: [ // 弹窗选择项：显示中文，实际值为英文
      { label: "碗", value: "bowl" },
      { label: "盘子", value: "plane" }
    ],
    
    dishTypeLabels: [] as string[], // 存储餐具类型标签（供picker的range使用）
    currentDate: formatDate(new Date()) // 当前日期（YYYY-MM-DD），用于判断是否新一天
  },

  onLoad() {
    this.syncCalorieGoal();
    this.loadTodayDietRecords();
    this.loadWaterRecords();
    this.loadUserHandLength();
    // 初始化picker的range数据
    this.setData({
      dishTypeLabels: this.data.dishTypeOptions.map(item => item.label),
      dishTypePickerValue: this.data.dishTypeOptions.findIndex(item => item.value === this.data.selectedDishType),
      currentDate: formatDate(new Date()) // 初始化当前日期
    });
    
    if ((wx as any).eventBus) {
      (wx as any).eventBus.on('calorieGoalChanged', this.handleCalorieGoalChange.bind(this));
    }
  },

  onUnload() {
    if ((wx as any).eventBus) {
      (wx as any).eventBus.off('calorieGoalChanged', this.handleCalorieGoalChange.bind(this));
    }
  },

  onShow() {
    // 每次显示页面时更新当前日期，并重新加载数据（确保跨天数据重置）
    const currentDate = formatDate(new Date());
    this.setData({ currentDate }, () => {
      this.syncCalorieGoal();
      this.loadTodayDietRecords();
      this.loadWaterRecords();
    });
  },

  // 加载用户手长信息
  loadUserHandLength() {
    const userInfo: UserInfo = wx.getStorageSync('userInfo') || {};
    if (userInfo.hand_length) {
      this.setData({
        handLength: userInfo.hand_length
      });
    }
  },

  // 同步热量目标（与首页保持一致）
  syncCalorieGoal() {
    const userInfo: UserInfo = wx.getStorageSync('userInfo') || {};
    const calorieGoal = userInfo.calorieGoal || 1800;
    
    // 将热量目标写入缓存，供首页读取
    wx.setStorageSync('calorieGoal', calorieGoal);
    
    if (!userInfo.calorieGoal) {
      this.fetchCaloriePlan().then(plan => {
        if (plan) this.handleCalorieGoalChange(plan);
      });
    } else {
      this.handleCalorieGoalChange(calorieGoal);
    }
  },

  handleCalorieGoalChange(newCalorieGoal: number) {
    this.setData({
      recommendCalorie: newCalorieGoal,
      remainCalorie: newCalorieGoal - this.data.dietIntake
    }, () => this.calculateProgress());
    
    // 更新缓存中的热量目标
    wx.setStorageSync('calorieGoal', newCalorieGoal);
    
    // 通知首页热量目标已变更
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.emit('calorieGoalChanged', newCalorieGoal);
    }
  },

  // 获取热量计划
  fetchCaloriePlan(): Promise<number | null> {
    return new Promise((resolve) => {
      const userId = wx.getStorageSync('userId');
      if (!userId) {
        wx.showToast({ title: '未获取到用户信息', icon: 'none' });
        resolve(null);
        return;
      }

      const userInfo = wx.getStorageSync('userInfo') || {};
      const requiredFields = ['height', 'weight', 'target_weight', 'gender', 'activity_level'];
      const missingFields = requiredFields.filter(field => !userInfo[field]);

      if (missingFields.length > 0) {
        wx.showToast({ title: '用户信息不完整，请先完善', icon: 'none' });
        resolve(null);
        return;
      }

      // 计算年龄
      const calculateAge = (birthday: string): number | null => {
        if (!birthday) return null;
        try {
          const birthDate = new Date(birthday);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
          return age;
        } catch (error) {
          return null;
        }
      };

      const age = calculateAge(userInfo.birth);
      const requestData = {
        id: userId,
        height: Number(userInfo.height),
        weight: Number(userInfo.weight),
        target_weight: Number(userInfo.target_weight),
        gender: Number(userInfo.gender),
        activity_level: Number(userInfo.activity_level),
        age: age,
        hand_length: Number(userInfo.hand_length) || 0
      };

      wx.request<BackendCalorieResponse>({
        url: 'http://60.205.245.221:9090/Calorie/calculate',
        method: 'POST',
        data: requestData,
        success: (res) => {
          const response = res.data;
          if (response.code === '200' && response.data?.caloriePlan !== undefined) {
            const storedUserInfo = wx.getStorageSync('userInfo') || {};
            storedUserInfo.calorieGoal = response.data.caloriePlan;
            wx.setStorageSync('userInfo', storedUserInfo);
            
            // 更新缓存中的热量目标
            wx.setStorageSync('calorieGoal', response.data.caloriePlan);
            
            resolve(response.data.caloriePlan);
          } else {
            wx.showToast({ title: '热量计算失败，使用默认值', icon: 'none' });
            resolve(null);
          }
        },
        fail: () => {
          wx.showToast({ title: '网络异常，使用默认值', icon: 'none' });
          resolve(null);
        }
      });
    });
  },

  onSearch(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword.trim() });
    console.log('搜索关键词:', keyword);
  },

  // 选择食物图片（先弹餐具选择弹窗）
  chooseFoodImage() {
    if (this.data.isProcessing) return;
    
    // 显示餐具选择弹窗
    this.setData({ showDishTypeModal: true });
  },

  // 餐具类型选择事件（弹窗内picker选择时触发）
  onDishTypeChange(e: WechatMiniprogram.PickerChange) {
    const index = e.detail.value;
    // 明确类型转换，同步选择的餐具类型
    const selectedValue = this.data.dishTypeOptions[Number(index)].value as DishType;
    this.setData({
      selectedDishType: selectedValue,
      dishTypePickerValue: Number(index) // 同步Picker选中索引
    });
  },

  // 确认选择餐具（关闭弹窗，调相机）
  onConfirmDishType() {
    // 保存用户选择的餐具类型到全局数据（后续接口用）
    this.setData({
      dishType: this.data.selectedDishType, // 与全局dishType字段同步
      showDishTypeModal: false
    }, () => {
      // 弹窗关闭后，调用相机/相册选择
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          this.setData({ 
            previewImage: tempFilePath,
            isProcessing: true,
            tempImagePath: tempFilePath // 保存图片路径，供后续数据库查询使用
          });
          // 调用识别接口
          this.uploadImageAndRecognize(tempFilePath);
        },
        fail: (err) => {
          console.error('选择图片失败:', err);
          wx.showToast({
            title: '选择图片失败: ' + (err.errMsg || ''),
            icon: 'none'
          });
        }
      });
    });
  },

  // 取消选择餐具（关闭弹窗）
  onCancelDishType() {
    this.setData({ showDishTypeModal: false });
  },

  // 上传图片并识别
  uploadImageAndRecognize(filePath: string) {
    const handLength = this.data.handLength;
    const dishType = this.data.dishType; // 使用用户选择的餐具类型

    wx.showLoading({ title: '识别中...' });
    
    wx.uploadFile({
      url: 'http://60.205.245.221:8001/api/predict',
      filePath: filePath,
      name: 'file',
      formData: {
        hand_length_cm: handLength.toString(),
        dish_type: dishType // 传递用户选择的餐具类型
      },
      success: (res) => {
        wx.hideLoading();
        this.setData({ isProcessing: false });
        
        try {
          const data = JSON.parse(res.data) as BaiduApiResponse;
          if (data.code === '200' && data.data?.items.length) {
            const foodItem = data.data.items[0];
            this.handleFoodRecognized(foodItem);
          } else {
            console.log('百度API识别失败，需输入食物名称后查询数据库:', data.msg);
            wx.showToast({
              title: '识别失败，请输入食物名称',
              icon: 'none',
              duration: 1500
            });
            // 显示食物名称输入弹窗
            setTimeout(() => {
              this.setData({
                showInputFoodNameModal: true,
                foodNameForDbQuery: this.data.searchKeyword || "",
                inputFoodNameError: ""
              });
            }, 1500);
          }
        } catch (e) {
          console.error('解析百度API响应失败:', e);
          wx.showToast({ title: '数据解析失败，请输入食物名称', icon: 'none' });
          // 解析失败也显示输入弹窗
          setTimeout(() => {
            this.setData({
              showInputFoodNameModal: true,
              foodNameForDbQuery: this.data.searchKeyword || "",
              inputFoodNameError: ""
            });
          }, 1500);
        }
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({ isProcessing: false });
        console.error('百度API调用失败:', err);
        wx.showToast({ title: '识别接口调用失败，请输入食物名称', icon: 'none' });
        // API调用失败显示输入弹窗
        setTimeout(() => {
          this.setData({
            showInputFoodNameModal: true,
            foodNameForDbQuery: this.data.searchKeyword || "",
            inputFoodNameError: ""
          });
        }, 1500);
      }
    });
  },

  // 食物名称输入事件（数据库查询专用）
  onFoodNameForDbInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value.trim();
    // 校验：不允许空值或纯特殊字符
    if (value && /^[\W_]+$/.test(value)) {
      this.setData({
        foodNameForDbQuery: value,
        inputFoodNameError: "名称不能仅包含特殊字符"
      });
      return;
    }
    this.setData({
      foodNameForDbQuery: value,
      inputFoodNameError: "" // 输入有效时清空错误提示
    });
  },

  // 取消输入食物名称（数据库查询流程）
  onCancelInputFoodName() {
    this.setData({
      showInputFoodNameModal: false,
      foodNameForDbQuery: "",
      inputFoodNameError: ""
    });
  },

  // 确认输入食物名称，触发数据库查询
  onConfirmInputFoodName() {
    const { foodNameForDbQuery, tempImagePath } = this.data;
    // 强制校验：名称不能为空
    if (!foodNameForDbQuery.trim()) {
      this.setData({ inputFoodNameError: "请输入食物名称（必填）" });
      return;
    }
    // 关闭输入弹窗，触发数据库查询
    this.setData({ showInputFoodNameModal: false });
    this.queryFoodFromDb(tempImagePath, foodNameForDbQuery.trim());
  },

  // 从数据库查询食物
  queryFoodFromDb(filePath: string, dishName: string) {
    wx.showLoading({ title: '查询数据库...' });
    
    // 构造表单数据
    const formData = {
      hand_length_cm: this.data.handLength.toString(),
      dish_type: this.data.dishType, // 使用用户选择的餐具类型
      dish_name: dishName
    };
    
    wx.uploadFile({
      url: 'http://60.205.245.221:8001/api/DishExistsCaculate',
      filePath: filePath,
      name: 'file',
      formData: formData,
      header: {
        'Content-Type': 'multipart/form-data'
      },
      success: (res) => {
        wx.hideLoading();
        
        try {
          const data = JSON.parse(res.data) as DbQueryResponse;
          if (data.code === '200' && data.data?.items.length) {
            const foodItem = data.data.items[0];
            this.handleFoodRecognized(foodItem);
          } else {
            console.log('数据库查询失败:', data.msg);
            // 数据库查询失败，跳转至添加食物弹窗
            this.setData({
              showAddFoodModal: true,
              newFoodName: dishName,
              newFoodKcalPer100g: "",
              newFoodWeight: "100",
              addFoodError: "数据库未找到该食物，请补充热量信息"
            });
          }
        } catch (e) {
          console.error('解析数据库响应失败:', e);
          wx.showToast({ title: '数据解析失败', icon: 'none' });
          this.setData({
            showAddFoodModal: true,
            newFoodName: dishName,
            newFoodKcalPer100g: "",
            newFoodWeight: "100",
            addFoodError: "数据解析失败，请补充热量信息"
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库查询失败:', err);
        wx.showToast({ title: '数据库查询失败', icon: 'none' });
        this.setData({
          showAddFoodModal: true,
          newFoodName: dishName,
          newFoodKcalPer100g: "",
          newFoodWeight: "100",
          addFoodError: "查询接口异常，请补充热量信息"
        });
      }
    });
  },

  // 处理识别到的食物数据
  handleFoodRecognized(foodItem: any) {
    // 构造饮食记录 - 使用ISO格式时间
    const dietRecord: DietRecord = {
      dishName: foodItem.name,
      weight: foodItem.weight_g,
      calorie: foodItem.total_kcal,
      nutrition: {
        protein: 0,
        carbs: 0,
        fat: 0
      },
      date:"",
      time: new Date().toISOString(), // 统一使用ISO格式
    };
    
    // 保存到临时存储，供结果页使用
    wx.setStorageSync('tempFoodRecord', dietRecord);
    
    wx.showToast({
      title: '识别成功',
      icon: 'success',
      duration: 1500
    });

    setTimeout(() => {
      wx.navigateTo({
        url: `/pages/result/result?` +
          `previewImage=${encodeURIComponent(this.data.previewImage)}&` +
          `dishName=${encodeURIComponent(foodItem.name)}&` +
          `calorie=${foodItem.total_kcal}&` +
          `weight=${foodItem.weight_g}&` +
          `intro=${encodeURIComponent(foodItem.intro)}&` +
          `kcalPer100g=${foodItem.kcal_per100g}&` +
          `density=${foodItem.density}&` +
          `volume=${foodItem.volume_cm3}`
      });
    }, 1500);
  },

  // 添加食物名称输入事件（添加食物弹窗专用）
  onNewFoodNameInput(e: WechatMiniprogram.Input) {
    this.setData({
      newFoodName: e.detail.value.trim(),
      addFoodError: ""
    });
  },

  // 添加食物重量输入事件
  onNewFoodWeightInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value.trim();
    if (value && !/^\d+$/.test(value)) {
      this.setData({ addFoodError: "请输入有效的重量" });
      return;
    }
    if (value && parseInt(value) <= 0) {
      this.setData({ addFoodError: "重量需大于0" });
      return;
    }
    this.setData({
      newFoodWeight: value,
      addFoodError: ""
    });
  },

  // 添加食物每100g热量输入事件
  onNewFoodKcalInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value.trim();
    if (value && !/^\d+(\.\d+)?$/.test(value)) {
      this.setData({ addFoodError: "请输入有效的数字" });
      return;
    }
    if (value && parseFloat(value) <= 0) {
      this.setData({ addFoodError: "热量需大于0" });
      return;
    }
    this.setData({
      newFoodKcalPer100g: value,
      addFoodError: ""
    });
  },

  // 取消添加食物
  onCancelAddFood() {
    this.setData({ showAddFoodModal: false });
  },

  // 确认添加食物
  onConfirmAddFood() {
    const { newFoodName, newFoodKcalPer100g, newFoodWeight } = this.data;
    let error = "";

    // 表单校验
    if (!newFoodName) {
      error = "请输入食物名称";
    } else if (!newFoodKcalPer100g) {
      error = "请输入每100g热量";
    } else if (parseFloat(newFoodKcalPer100g) <= 0) {
      error = "每100g热量需大于0";
    } else if (!newFoodWeight || parseInt(newFoodWeight) <= 0) {
      error = "请输入有效的食物重量";
    }

    if (error) {
      this.setData({ addFoodError: error });
      return;
    }

    // 构造接口请求数据
    const addFoodData = {
      dish_name: newFoodName,
      kcal_per_100g: parseFloat(newFoodKcalPer100g)
    };

    wx.showLoading({ title: '添加中...' });

    // 调用添加食物接口
    wx.request<AddFoodResponse>({
      url: 'http://60.205.245.221:8001/api/add',
      method: 'POST',
      data: addFoodData,
      success: (res) => {
        const response = res.data;
        if (response.code === '200') {
          wx.hideLoading();
          wx.showToast({ title: '添加食物成功', icon: 'success' });

          // 计算总热量
          const weight = parseInt(newFoodWeight);
          const kcalPer100g = parseFloat(newFoodKcalPer100g);
          const totalCalorie = (weight / 100) * kcalPer100g;

          // 构造饮食记录 - 使用ISO格式时间
          const newDietRecord: DietRecord = {
            dishName: newFoodName,
            weight: weight,
            calorie: Math.round(totalCalorie * 10) / 10,
            nutrition: {
              protein: 0,
              carbs: 0,
              fat: 0
            },
            date:"",
            time: new Date().toISOString(), // 统一使用ISO格式
          };

          // 保存到今日饮食记录
          this.addToTodayDietRecords(newDietRecord);

          // 隐藏弹窗
          this.setData({ showAddFoodModal: false });
          
          // 提示用户
          wx.showModal({
            title: '添加成功',
            content: "",
            showCancel: false,
            confirmText: '确定'
          });
        } else {
          wx.hideLoading();
          this.setData({
            addFoodError: response.msg || '添加失败，请重试'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('添加食物接口调用失败:', err);
        this.setData({
          addFoodError: '网络异常，添加失败'
        });
      }
    });
  },

  // 添加到今日饮食记录（核心：同步到首页）
  addToTodayDietRecords(record: DietRecord) {
    // 1. 存储到全局历史
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    allRecords.push(record);
    wx.setStorageSync('dietHistory', allRecords);
    
    // 2. 存储到按日期的存储键（供报告页读取）
    const today = formatDate(new Date());
    const todayRecords = wx.getStorageSync(`dietRecords_${today}`) as DietRecord[] || [];
    todayRecords.push(record);
    wx.setStorageSync(`dietRecords_${today}`, todayRecords);
    
    // 3. 重新计算总摄入热量并更新缓存（核心：与首页同步）
    this.updateDietIntake();
    
    // 4. 更新宏量营养素数据（示例逻辑，实际应根据食物营养成分计算）
    this.updateNutritionData(todayRecords);
    
    // 5. 通知首页更新数据
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.emit('dietIntakeChanged');
    }
  },

  // 重新计算总摄入热量并写入缓存（与首页同步的核心）
  updateDietIntake() {
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    const today = formatDate(new Date());
    
    // 过滤当天记录
    const todayRecords = allRecords.filter((record) => {
      try {
        let recordDate: string;
        if (record.time.includes('T')) {
          recordDate = formatDate(new Date(record.time));
        } else {
          const date = new Date(record.time);
          if (!isNaN(date.getTime())) {
            recordDate = formatDate(date);
          } else {
            return false;
          }
        }
        return recordDate === today;
      } catch (error) {
        return false;
      }
    });
    
    // 计算总热量并写入缓存
    const totalCalorie = todayRecords.reduce((sum, record) => sum + record.calorie, 0);
    wx.setStorageSync('dietIntake', totalCalorie);
    
    // 更新当前页面数据
    this.setData({ dietIntake: totalCalorie });
    this.calculateProgress();
  },

  // 更新宏量营养素数据（供首页同步显示）
  updateNutritionData(todayRecords: DietRecord[]) {
    const totalNutrition = todayRecords.reduce((sum, record) => ({
      carbs: sum.carbs + record.nutrition.carbs,
      protein: sum.protein + record.nutrition.protein,
      fat: sum.fat + record.nutrition.fat
    }), { carbs: 0, protein: 0, fat: 0 });
    
    wx.setStorageSync('todayNutrition', totalNutrition);
  },

  saveDietRecord(record: DietRecord) {
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    allRecords.push(record);
    wx.setStorageSync('dietHistory', allRecords);
  },

  calculateProgress() {
    const { dietIntake, recommendCalorie } = this.data;
    if (recommendCalorie <= 0) {
      this.setData({
        progressCircleStyle: `--progress-ratio: 0%`,
        remainCalorie: 0
      });
      return;
    }
    const ratio = (dietIntake / recommendCalorie) * 100;
    const remain = recommendCalorie - dietIntake;
    
    this.setData({
      progressCircleStyle: `--progress-ratio: ${Math.min(100, ratio)}%`,
      remainCalorie: Math.max(0, remain)  
    });
  },

  // 加载饮食记录（只加载当天记录）
  loadTodayDietRecords() {
    const { currentDate } = this.data;
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];

    // 过滤出当前日期的记录
    const todayRecords = allRecords.filter((record) => {
      try {
        let recordDate: string;
        if (record.time.includes('T')) {
          // ISO 格式
          recordDate = formatDate(new Date(record.time));
        } else {
          // 尝试解析其他格式
          const date = new Date(record.time);
          if (!isNaN(date.getTime())) {
            recordDate = formatDate(date);
          } else {
            // 无法解析的日期不显示
            return false;
          }
        }
        return recordDate === currentDate;
      } catch (error) {
        console.error('日期解析错误:', error, record.time);
        return false;
      }
    });

    // 格式化日期
    const formattedRecords = todayRecords.map(record => ({
      ...record,
      formattedTime: this.formatDateTime(record.time)
    }));

    const totalCalorie = todayRecords.reduce((sum, record) => sum + record.calorie, 0);
    
    // 更新缓存中的总摄入热量（确保与首页同步）
    wx.setStorageSync('dietIntake', totalCalorie);

    this.setData({
      dietList: todayRecords,
      formattedDietList: formattedRecords,
      dietIntake: totalCalorie,
    });
    this.calculateProgress();
  },

  // 日期格式化方法
  formatDateTime(timeString: string): string {
    try {
      let date: Date;
      
      if (timeString.includes('T')) {
        // ISO 格式
        date = new Date(timeString);
      } else {
        // 尝试解析其他格式
        date = new Date(timeString);
      }
      
      if (isNaN(date.getTime())) {
        return timeString; // 返回原始字符串
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('日期格式化错误:', error, timeString);
      return timeString;
    }
  },

  // 删除记录（同步更新到首页）
  onDeleteRecord(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
    const deletedRecord = allRecords[index];
    
    allRecords.splice(index, 1);
    wx.setStorageSync('dietHistory', allRecords);
    
    // 重新计算总摄入热量并更新缓存
    this.updateDietIntake();
    
    // 更新宏量营养素数据
    const today = formatDate(new Date());
    const todayRecords = wx.getStorageSync(`dietRecords_${today}`) as DietRecord[] || [];
    this.updateNutritionData(todayRecords);
    
    // 通知首页更新
    const app = getApp();
    if (app.globalData?.eventBus) {
      app.globalData.eventBus.emit('dietIntakeChanged');
    }
    
    this.setData({
      dietIntake: this.data.dietIntake - deletedRecord.calorie,
    });
    this.calculateProgress();
    
    wx.showToast({ title: '记录已删除', icon: 'success' });
  },

  gotoDietReport() {
    const today = formatDate(new Date());
    wx.navigateTo({ url: `/pages/report/report?date=${today}` });
  },

  // 喝水记录相关方法
  chooseWaterAmount(e: any) {
    const index = e.detail.value;
    this.setData({ selectedWater: this.data.waterOptions[index] });
  },

  addWater() {
    const amount = this.data.selectedWater;
    const time = new Date().toISOString(); // 统一使用ISO格式
    
    const newWaterIntake = this.data.waterIntake + amount;
    const newWaterRecord = { amount, time };
    
    this.setData({
      waterIntake: newWaterIntake,
      waterRecords: [...this.data.waterRecords, newWaterRecord],
      waterProgressRatio: (newWaterIntake / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
    
    this.saveWaterRecords();
  },

  deleteWaterRecord(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number;
    const deletedAmount = this.data.waterRecords[index].amount;
    
    const newWaterIntake = this.data.waterIntake - deletedAmount;
    this.setData({
      waterIntake: newWaterIntake,
      waterRecords: this.data.waterRecords.filter((_, i) => i !== index),
      waterProgressRatio: (newWaterIntake / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
    
    this.saveWaterRecords();
    wx.showToast({ title: '已删除记录', icon: 'none' });
  },

  // 加载喝水记录
  loadWaterRecords() {
    const { currentDate } = this.data;
    const allRecords = wx.getStorageSync('waterHistory') as WaterRecord[] || [];
    
    // 过滤出当前日期的记录
    const todayRecords = allRecords.filter((record) => {
      try {
        let recordDate: string;
        if (record.time.includes('T')) {
          // ISO 格式
          recordDate = formatDate(new Date(record.time));
        } else {
          // 尝试解析其他格式
          const date = new Date(record.time);
          if (!isNaN(date.getTime())) {
            recordDate = formatDate(date);
          } else {
            // 无法解析的日期不显示
            return false;
          }
        }
        return recordDate === currentDate;
      } catch (error) {
        return false;
      }
    });
    
    const totalWater = todayRecords.reduce((sum, record) => sum + record.amount, 0);
    
    this.setData({
      waterIntake: totalWater,
      waterRecords: todayRecords.map(record => ({
        amount: record.amount,
        time: record.time
      })),
      waterProgressRatio: (totalWater / this.data.recommendWater) * 100 
    }, () => {
      this.updateWaterProgressStyle();
      this.updateWaterCupStyle();
    });
  },

  saveWaterRecords() {
    const today = formatDate(new Date());
    const todayRecords = this.data.waterRecords.map((record) => ({
      ...record,
      date: new Date()
    }));
    
    const allRecords = wx.getStorageSync('waterHistory') as WaterRecord[] || [];
    const otherRecords = allRecords.filter((record) => {
      try {
        let recordDate: string;
        if (record.time.includes('T')) {
          recordDate = formatDate(new Date(record.time));
        } else {
          const date = new Date(record.time);
          if (!isNaN(date.getTime())) {
            recordDate = formatDate(date);
          } else {
            recordDate = "";
          }
        }
        return recordDate !== today;
      } catch (error) {
        return true;
      }
    });
    
    wx.setStorageSync('waterHistory', [...otherRecords, ...todayRecords]);
  },
  
  updateWaterProgressStyle() {
    this.setData({
      waterProgressBarStyle: `width: ${this.data.waterProgressRatio}%;`
    });
  },
  
  updateWaterCupStyle() {
    const ratio = this.data.waterProgressRatio;
    this.setData({
      waterCupStyle: `height: ${ratio}%; opacity: ${Math.max(0.3, ratio/100)}`
    });
  }
});


