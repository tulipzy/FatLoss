interface IUser {
  nickname: string;
  email: string;
  password: string;
}

interface BackendResponse {
  code: string;
  msg: string;
  data: null | any;
}

interface CalorieResponse {
  code: string;
  msg: string;
  data: {
    caloriePlan?: number;
    tdee?: number;
    recordDate?: string;
  };
}

interface UserData {
  id: string;
  username: string;
  nickname: string;
  gender: number; 
  birth: string;
  phone: string;
  height: number;
  weight: number;
  target_weight: number;
  hand_length: number;
  activity_level: 1 | 2 | 3 | 4 | 5; // 1-5级活动水平
  avatarUrl?: string; 
  points?: number;
  badges?: number;
  calorieGoal?: number;
  tdee?: number; 
}

interface BirthdayPickerChangeDetail {
  value: string; 
}
type BirthdayPickerChangeEvent = WechatMiniprogram.BaseEvent & {
  detail: BirthdayPickerChangeDetail;
};

interface PickerChangeDetail {
  value: number;
}
type PickerChangeEvent = WechatMiniprogram.BaseEvent & {
  detail: PickerChangeDetail;
};

interface ActivityMultipliers {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickname: '', 
      gender: '', 
      age: '',
      birthday: '',
      height: '',       
      weight: '',       
      targetWeight: '', 
      handLength: '',
      intensity: '久坐不动' as "久坐不动" | "轻度活动" | "中度活动" | "重度活动" | "极重度活动",
      phone: ''
    },
    genders: ['男', '女'] as const,
    genderIndex: 0,
    weightOptions: Array.from({ length: 121 }, (_, i) => (i + 30).toFixed(1)),
    weightIndex: 0,
    targetWeightOptions: Array.from({ length: 121 }, (_, i) => (i + 30).toFixed(1)),
    targetWeightIndex: 0,
    intensityOptions: ['久坐不动', '轻度活动', '中度活动', '重度活动', '极重度活动'] as const, 
    intensityIndex: 0,
    intensityTips: [
      '很少运动',
      '每周1-3次运动',
      '每周3-5次运动',
      '每周6-7次运动',
      '每日剧烈运动和重体力工作'
    ],
    isSubmitting: false,
    currentDate: new Date().toISOString().split('T')[0],
    nicknameError: '',
    canIUseChooseAvatar: wx.canIUse('button.open-type.chooseAvatar'),
    fromMyPage: false,
    calculatedCalorie: 0,
    calculatedTdee: 0,
    showCalorieResult: false,
    defaultAvatarUrl: '',
    saveStatus: '' as '' | 'success' | 'fail',
    tempUserId: '',
    isFromLogin: false,
    hasValidatedUserId: false,
  },

  onLoad(options: { from?: string; userId?: string }) {
    console.log('个人信息页 onLoad 启动，参数:', options);
    this.setData({
      fromMyPage: options.from === 'myPage',
      isFromLogin: options.from === 'login',
      tempUserId: options.userId || ''
    });
    this.loadUserInfo();
  },

  loadUserInfo() {
    const storedUserInfo: UserData = wx.getStorageSync('userInfo') || {};
    console.log('从本地存储获取的用户信息:', storedUserInfo);

    // 1. 性别映射
    const genderStr = storedUserInfo.gender === 1 ? '男' : storedUserInfo.gender === 2 ? '女' : '';
    // 2. 活动水平映射（后端1-5 → 前端文字）
    const intensityStr = this.mapIntensityFromBackend(storedUserInfo.activity_level) || '久坐不动';
    // 3. 体重索引计算
    const weightIndex = storedUserInfo.weight 
      ? this.data.weightOptions.findIndex(option => parseFloat(option) === storedUserInfo.weight) 
      : 0;
    // 4. 目标体重索引计算
    const targetWeightIndex = storedUserInfo.target_weight 
      ? this.data.targetWeightOptions.findIndex(option => parseFloat(option) === storedUserInfo.target_weight) 
      : 0;
    // 5. 活动水平索引计算
    const intensityIndex = this.data.intensityOptions.findIndex(option => option === intensityStr);

    this.setData({
      userInfo: {
        avatarUrl: storedUserInfo.avatarUrl || this.data.defaultAvatarUrl,
        nickname: storedUserInfo.nickname || '', 
        gender: genderStr,
        age: this.calculateAge(storedUserInfo.birth)?.toString() || '', 
        birthday: storedUserInfo.birth || '',
        height: storedUserInfo.height ? storedUserInfo.height.toFixed(1) : '',
        weight: storedUserInfo.weight ? storedUserInfo.weight.toFixed(1) : '',
        targetWeight: storedUserInfo.target_weight ? storedUserInfo.target_weight.toFixed(1) : '',
        handLength: storedUserInfo.hand_length?.toString() || '',
        intensity: intensityStr,
        phone: storedUserInfo.phone || ''
      },
      genderIndex: genderStr === '男' ? 0 : 1,
      weightIndex: weightIndex === -1 ? 0 : weightIndex,
      targetWeightIndex: targetWeightIndex === -1 ? 0 : targetWeightIndex,
      intensityIndex: intensityIndex === -1 ? 0 : intensityIndex,
      calculatedCalorie: storedUserInfo.calorieGoal || 0,
      calculatedTdee: storedUserInfo.tdee || 0 
    });
  },

  validateUserId(): boolean {
    if (this.data.hasValidatedUserId || this.data.isFromLogin) {
      return true;
    }
    const userId = this.data.tempUserId || wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '用户信息失效，请重新登录', icon: 'none', duration: 2000 });
      setTimeout(() => wx.navigateTo({ url: '/pages/index/index' }), 1000);
      return false;
    }
    this.setData({ tempUserId: userId, hasValidatedUserId: true });
    return true;
  },

  async calculateCalorieGoal(userId: string): Promise<{ caloriePlan: number; tdee: number }> {
    console.log('开始计算热量目标，用户ID:', userId);
    return new Promise((resolve, reject) => {
      wx.request<CalorieResponse>({
        url: 'http://60.205.245.221:9090/Calorie/calculate',
        method: 'POST',
        data: { id: userId },
        success: (res) => {
          console.log('热量计算API响应:', res.data);
          if (res.data.code === '200' && res.data.data) {
            resolve({ 
              caloriePlan: res.data.data.caloriePlan || 0, 
              tdee: res.data.data.tdee || 0 
            });
          } else {
            if (res.data.msg?.includes('用户不存在')) {
              wx.showToast({ title: '用户信息未找到，请重新登录', icon: 'none', duration: 3000 });
              wx.removeStorageSync('userId');
              this.setData({ tempUserId: '' });
              setTimeout(() => wx.navigateTo({ url: '/pages/index/index' }), 1000);
            }
            reject(new Error(res.data.msg || '后端返回数据异常'));
          }
        },
        fail: (err) => reject(err)
      });
    });
  },

  calculateLocally(userData: any): { localCalorie: number; localTdee: number } {
    const age = userData.age || 25;
    let bmr = 0;
    if (userData.gender === 1) { 
      bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age + 5;
    } else { 
      bmr = 10 * userData.weight + 6.25 * userData.height - 5 * age - 161;
    }

    const activityMultipliers: ActivityMultipliers = { 
      1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725, 5: 1.9 
    };
    const activityLevel = [1,2,3,4,5].includes(userData.activity_level) 
      ? userData.activity_level as 1|2|3|4|5 
      : 1;
    const localTdee = Math.round(bmr * activityMultipliers[activityLevel]);

    const weightDifference = userData.weight - userData.target_weight;
    const calorieDeficit = Math.min(500, weightDifference * 7.7);
    const localCalorie = Math.max(1200, Math.round(localTdee - calorieDeficit));
    
    console.log('本地计算结果 - 热量目标:', localCalorie, 'TDEE:', localTdee);
    return { localCalorie, localTdee };
  },

  calculateAgeFromBirth(birthday: string): number {
    if (!birthday) return 25;
    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return Math.max(18, Math.min(age, 80));
    } catch (error) {
      return 25;
    }
  },

  mapIntensityFromBackend(level: 1|2|3|4|5|undefined): "久坐不动"|"轻度活动"|"中度活动"|"重度活动"|"极重度活动"|"" {
    if (!level) return "";
    const map = { 1: '久坐不动', 2: '轻度活动', 3: '中度活动', 4: '重度活动', 5: '极重度活动' } as const;
    return map[level] || "";
  },

  safeIndexOf<T>(arr: readonly T[], target: T): number {
    const index = arr.indexOf(target);
    return index === -1 ? 0 : index;
  },

  async saveInfo() {
    console.log('开始保存用户信息');
    console.log('当前活动水平值:', this.data.userInfo.intensity);
    
    if (!this.validateUserId()) {
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    const { userInfo } = this.data;
    
    // 1. 活动水平验证（新增）
    if (!userInfo.intensity || !this.data.intensityOptions.includes(userInfo.intensity as any)) {
      wx.showToast({ title: '请选择有效的活动水平', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    // 2. 昵称唯一性检查
    if (!this.checkNicknameUniqueness(userInfo.nickname)) {
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    // 3. 必填字段检查
    const requiredFields: string[] = [];
    if (!userInfo.nickname.trim()) requiredFields.push('昵称');
    if (!userInfo.gender) requiredFields.push('性别');
    if (!userInfo.birthday) requiredFields.push('生日');
    if (!userInfo.height.trim()) requiredFields.push('身高');
    if (!userInfo.weight.trim()) requiredFields.push('当前体重');
    if (!userInfo.targetWeight.trim()) requiredFields.push('目标体重');
    if (!userInfo.handLength.trim()) requiredFields.push('手长');
    if (!userInfo.phone.trim()) requiredFields.push('手机号');

    if (requiredFields.length > 0) {
      wx.showToast({ title: `请填写${requiredFields.join('、')}`, icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    // 4. 格式验证
    if (!/^1\d{10}$/.test(userInfo.phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    const weight = parseFloat(userInfo.weight);
    const targetWeight = parseFloat(userInfo.targetWeight);
    const height = parseFloat(userInfo.height);
    const handLength = parseFloat(userInfo.handLength);

    if (targetWeight >= weight) {
      wx.showToast({ title: '目标体重应小于当前体重', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }
    if (isNaN(height) || height <= 0 || height > 300) {
      wx.showToast({ title: '请输入30-300cm内的有效身高', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }
    if (isNaN(weight) || weight <= 0 || weight > 200) {
      wx.showToast({ title: '请输入0-200kg内的有效体重', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }
    if (isNaN(targetWeight) || targetWeight <= 0 || targetWeight > 200) {
      wx.showToast({ title: '请输入0-200kg内的有效目标体重', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }
    if (isNaN(handLength) || handLength <= 0 || handLength > 100) {
      wx.showToast({ title: '请输入0-100cm内的有效手长', icon: 'none' });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
      return;
    }

    this.setData({ isSubmitting: true, saveStatus: '' });
    const userId = this.data.tempUserId;

    // 5. 活动水平转换（前端文字 → 后端1-5）
    const activityLevel = this.mapIntensityToBackend(userInfo.intensity);
    console.log(`活动水平转换: ${userInfo.intensity} → ${activityLevel}`);

    const requestData = {
      id: userId,
      gender: userInfo.gender === '男' ? 1 : 2,
      birth: userInfo.birthday,
      phone: userInfo.phone,
      weight: weight,
      height: height,
      target_weight: targetWeight,
      hand_length: handLength,
      nickname: userInfo.nickname, 
      activity_level: activityLevel
    };
    console.log('提交给后端的完整数据:', requestData);

    try {
      wx.showLoading({ title: '保存并计算中...', mask: true });
      
      // 保存用户信息
      const saveResponse = await this.saveUserInfo(requestData);
      if (saveResponse.code !== '200') {
        throw new Error(`保存失败: ${saveResponse.msg || '未知错误'}`);
      }
      console.log('用户信息保存成功，后端响应:', saveResponse);

      // 计算热量目标
      let caloriePlan = 0, tdee = 0;
      try {
        const result = await this.calculateCalorieGoal(userId);
        caloriePlan = result.caloriePlan;
        tdee = result.tdee;
      } catch (error) {
        console.error('后端计算失败，使用本地计算:', error);
        const age = this.calculateAgeFromBirth(userInfo.birthday) || 25;
        const localResult = this.calculateLocally({
          ...requestData,
          age,
          activity_level: activityLevel
        });
        caloriePlan = localResult.localCalorie;
        tdee = localResult.localTdee;
      }

      // 处理保存成功
      this.handleSaveSuccess(requestData, caloriePlan, tdee, userInfo.avatarUrl);
      this.setData({ saveStatus: 'success' });

    } catch (error) {
      wx.hideLoading();
      console.error('保存过程出错:', error);
      wx.showToast({ 
        title: error instanceof Error ? error.message : '保存失败，请重试', 
        icon: 'none', duration: 3000 
      });
      this.setData({ isSubmitting: false, saveStatus: 'fail' });
    }
  },

  saveUserInfo(requestData: any): Promise<BackendResponse> {
    console.log('即将发送到后端的完整数据:', requestData);
    return new Promise((resolve, reject) => {
      wx.request<BackendResponse>({
        url: 'http://60.205.245.221:9090/user/completeProfile',
        method: 'POST',
        data: requestData,
        success: (res) => {
          if (res.data.code !== '200') console.warn('保存用户信息后端返回非成功状态:', res.data);
          resolve(res.data);
        },
        fail: (err) => {
          console.error('保存用户信息请求失败:', err);
          reject(new Error(`网络异常: ${err.errMsg || '请求失败'}`));
        }
      });
    });
  },

  handleSaveSuccess(requestData: any, calorieGoal: number, tdee: number, avatarUrl: string) {
    wx.hideLoading();
    const oldUserInfo: UserData = wx.getStorageSync('userInfo') || {};
    const updatedUserInfo: UserData = {
      ...oldUserInfo,
      ...requestData,
      avatarUrl: avatarUrl,
      calorieGoal: calorieGoal,
      tdee: tdee,
      activity_level: requestData.activity_level
    };

    try {
      wx.setStorageSync('userInfo', updatedUserInfo);
      wx.setStorageSync('hasCompletedInfo', true);
      wx.setStorageSync('needUpdateCalorie', true);
      console.log('用户信息已成功保存到本地存储');
    } catch (storageError) {
      console.error('本地存储用户信息失败:', storageError);
      wx.showToast({ title: '信息保存成功，但本地存储失败', icon: 'none' });
    }

    wx.showToast({ 
      title: `保存成功！目标: ${calorieGoal}kcal，消耗: ${tdee}kcal`, 
      icon: 'success', duration: 3000 
    });

    this.notifyMyPageDataUpdated();
    setTimeout(() => {
      if (this.data.fromMyPage) wx.navigateBack();
      else wx.switchTab({ url: '/pages/first/first' });
    }, 3000);
    this.setData({ isSubmitting: false });
  },

  checkNicknameUniqueness(nickname: string) {
    let nicknameError = '';
    const currentUser = wx.getStorageSync('currentUser') as IUser || {};
    if (nickname && nickname !== currentUser.nickname) {
      if (nickname.length < 2) nicknameError = '用户名长度不能少于 2 个字符';
      else if (nickname.length > 20) nicknameError = '用户名长度不能超过 20 个字符';
      else {
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        if (users.some(user => user.nickname === nickname)) nicknameError = '该用户名已被使用';
      }
    }
    this.setData({ nicknameError });
    return !nicknameError;
  },

  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) this.setData({ 'userInfo.avatarUrl': avatarUrl });
  },

  changeAvatar() {
    if (this.data.canIUseChooseAvatar) {
      this.selectComponent('#avatarButton')?.triggerEvent('tap');
    } else {
      wx.showActionSheet({
        itemList: ['从相册选择', '使用微信头像'],
        success: (res) => {
          if (res.tapIndex === 0) this.chooseImageFromAlbum();
          else this.getWechatAvatar();
        }
      });
    }
  },

  chooseImageFromAlbum() {
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['album'],
      success: (res) => this.setData({ 'userInfo.avatarUrl': res.tempFilePaths[0] })
    });
  },

  getWechatAvatar() {
    wx.getUserProfile({
      desc: '用于获取头像信息',
      success: (res) => {
        this.setData({
          'userInfo.avatarUrl': res.userInfo.avatarUrl,
          'userInfo.nickname': res.userInfo.nickName 
        });
        wx.showToast({ title: '微信头像已获取', icon: 'success' });
      }
    });
  },

  onNicknameInput(e: WechatMiniprogram.Input) {
    const nickname = e.detail.value.trim();
    this.checkNicknameUniqueness(nickname);
    this.setData({ 'userInfo.nickname': nickname });
  },

  onPhoneInput(e: WechatMiniprogram.Input) {
    this.setData({ 'userInfo.phone': e.detail.value.trim() });
  },

  onHeightInput(e: WechatMiniprogram.Input) {
    const heightStr = e.detail.value.trim();
    this.setData({ 'userInfo.height': heightStr });
    if (!heightStr) return;

    const heightNum = parseFloat(heightStr);
    if (isNaN(heightNum) || heightNum < 30 || heightNum > 300) {
      wx.showToast({ title: '身高应在 30 - 300 cm 之间', icon: 'none', duration: 1500 });
    } else {
      this.setData({ 'userInfo.height': heightNum.toFixed(1) });
    }
  },

  onHandLengthInput(e: WechatMiniprogram.Input) {
    const handLength = e.detail.value.trim();
    if (handLength) {
      const handLengthNum = parseFloat(handLength);
      if (isNaN(handLengthNum) || handLengthNum <= 0 || handLengthNum > 100) {
        wx.showToast({ title: '请输入0-100cm内的有效手长', icon: 'none' });
        return;
      }
      this.setData({ 'userInfo.handLength': handLengthNum.toString() });
    } else {
      this.setData({ 'userInfo.handLength': '' });
    }
  },

  onAgeInput(e: WechatMiniprogram.Input) {
    const age = e.detail.value.trim();
    if (age) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        wx.showToast({ title: '请输入0-120岁内的有效年龄', icon: 'none' });
        return;
      }
      this.setData({ 'userInfo.age': age });
    } else {
      this.setData({ 'userInfo.age': '' });
    }
  },

  onGenderChange(e: PickerChangeEvent) {
    const genderIndex = e.detail.value;
    const gender = this.data.genders[genderIndex];
    this.setData({ genderIndex, 'userInfo.gender': gender });
  },

  onBirthdayChange(e: BirthdayPickerChangeEvent) {
    const birthday = e.detail.value;
    this.setData({ 'userInfo.birthday': birthday });
    const age = this.calculateAge(birthday);
    this.setData({ 'userInfo.age': age?.toString() || '' });
  },

  onIntensityChange(e: PickerChangeEvent) {
    const intensityIndex = e.detail.value;
    const intensity = this.data.intensityOptions[intensityIndex] as "久坐不动"|"轻度活动"|"中度活动"|"重度活动"|"极重度活动";
    this.setData({
      intensityIndex,
      'userInfo.intensity': intensity
    });
    console.log('活动水平已更新:', intensity, '对应后端值:', this.mapIntensityToBackend(intensity));
  },

  onWeightChange(e: PickerChangeEvent) {
    const weightIndex = e.detail.value;
    const weight = this.data.weightOptions[weightIndex];
    this.setData({
      weightIndex,
      'userInfo.weight': weight
    });
  },

  onTargetWeightChange(e: PickerChangeEvent) {
    const targetWeightIndex = e.detail.value;
    const targetWeight = this.data.targetWeightOptions[targetWeightIndex];
    this.setData({
      targetWeightIndex,
      'userInfo.targetWeight': targetWeight
    });
  },

  calculateAge(birthday: string): number | undefined {
    if (!birthday) return undefined;
    try {
      const birthDate = new Date(birthday);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch (error) {
      return undefined;
    }
  },

  mapIntensityToBackend(intensity: string): 1|2|3|4|5 {
    const map: Record<string, 1|2|3|4|5> = { 
      '久坐不动': 1, 
      '轻度活动': 2, 
      '中度活动': 3, 
      '重度活动': 4, 
      '极重度活动': 5 
    };
    return map[intensity] || 1; // 默认返回1（久坐不动）
  },

  hideCalorieResult() {
    this.setData({ showCalorieResult: false });
  },

  notifyMyPageDataUpdated() {
    const pages = getCurrentPages();
    const myPage = pages.find(page => page.route === 'pages/mine/mine');
    if (myPage) (myPage as any).getUserInfo();
    else wx.setStorageSync('needUpdateMyPage', true);
  }
});