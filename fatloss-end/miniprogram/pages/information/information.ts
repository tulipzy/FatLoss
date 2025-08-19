interface IUser {
  nickname: string;
  email: string;
  password: string;
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

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      gender: '',
      age: '',
      birthday: '',
      height: '',
      weight: 0,
      targetWeight: 0,
      handLength: '',
      intensity: ''
    },
    genders: ['男', '女', '保密'] as const,
    genderIndex: 0,
    weightOptions: Array.from({ length: 121 }, (_, i) => i + 30),
    targetWeightOptions: Array.from({ length: 121 }, (_, i) => i + 30),
    intensityOptions: ['低', '中', '高'] as const,
    intensityIndex: 0,
    isSubmitting: false,
    currentDate: new Date().toISOString().split('T')[0],
    nicknameError: '',
    showPassword: false,
    canLogin: false,
    canIUseChooseAvatar: wx.canIUse('button.open-type.chooseAvatar')
  },

  onLoad() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const storedUserInfo = wx.getStorageSync('userInfo') || {};
    if (storedUserInfo.nickName === '微信用户') { 
      storedUserInfo.nickName = ''; 
    }

    const genderIndex = this.safeIndexOf(
      this.data.genders, 
      storedUserInfo.gender || ''
    );
    const intensityIndex = this.safeIndexOf(
      this.data.intensityOptions, 
      storedUserInfo.intensity || ''
    );

    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...storedUserInfo
      },
      genderIndex,
      intensityIndex
    });
  },

  safeIndexOf<T>(arr: readonly T[], target: T): number {
    const index = arr.indexOf(target);
    return index === -1 ? 0 : index;
  },

  // 处理获取用户信息事件
  onGetUserInfo(e: WechatMiniprogram.ButtonGetUserInfo) {
    if (e.detail.userInfo) {
      this.setData({
        'userInfo.avatarUrl': e.detail.userInfo.avatarUrl,
        'userInfo.nickName': e.detail.userInfo.nickName
      }, () => {
        wx.showToast({
          title: '微信信息已获取',
          icon: 'success'
        });
      });
    } else {
      wx.showToast({
        title: '获取信息失败，请授权',
        icon: 'none'
      });
    }
  },

  changeAvatar() {
    if (this.data.canIUseChooseAvatar) {
      this.selectComponent('#avatarButton')?.triggerEvent('tap');
    } else {
      wx.showActionSheet({
        itemList: ['从相册选择', '使用微信头像'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.chooseImageFromAlbum();
          } else {
            this.getWechatAvatar();
          }
        }
      });
    }
  },

  onChooseAvatar(e: any) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      this.setData({ 'userInfo.avatarUrl': avatarUrl });
    } else {
      wx.showToast({ title: '获取头像失败', icon: 'none' });
    }
  },

  chooseImageFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({ 'userInfo.avatarUrl': res.tempFilePaths[0] });
      },
      fail: () => {
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  getWechatAvatar() {
    wx.getUserProfile({
      desc: '用于获取头像信息',
      success: (res) => {
        this.setData({
          'userInfo.avatarUrl': res.userInfo.avatarUrl
        });
        wx.showToast({
          title: '微信头像已获取',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({ title: '获取头像失败', icon: 'none' });
      }
    });
  },

  onNicknameInput(e: WechatMiniprogram.Input) {
    const nickName = e.detail.value.trim();
    this.checkNicknameUniqueness(nickName);
    this.setData({ 'userInfo.nickName': nickName });
  },

  onHeightInput(e: WechatMiniprogram.Input) {
    const height = e.detail.value.trim();
    this.setData({ 'userInfo.height': height });
  },

  onHandLengthInput(e: WechatMiniprogram.Input) {
    const handLength = e.detail.value.trim();
    this.setData({ 'userInfo.handLength': handLength });
  },

  onAgeInput(e: WechatMiniprogram.Input) {
    const age = e.detail.value.trim();
    this.setData({ 'userInfo.age': age });
  },

  checkNicknameUniqueness(nickname: string) {
    let nicknameError = '';
    const currentUser = wx.getStorageSync('currentUser') as IUser || {};

    if (nickname && nickname !== currentUser.nickname) {
      if (nickname.length < 2) {
        nicknameError = '用户名长度不能少于 2 个字符';
      } else if (nickname.length > 20) {
        nicknameError = '用户名长度不能超过 20 个字符';
      } else {
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        const isExists = users.some(user => user.nickname === nickname);
        if (isExists) {
          nicknameError = '该用户名已被使用';
        }
      }
    }

    this.setData({ nicknameError });
    return !nicknameError;
  },

  onGenderChange(e: PickerChangeEvent) {
    const genderIndex = e.detail.value;
    this.setData({
      genderIndex,
      'userInfo.gender': this.data.genders[genderIndex]
    });
  },

  onBirthdayChange(e: BirthdayPickerChangeEvent) {
    const birthday = e.detail.value;
    this.setData({ 'userInfo.birthday': birthday });
    this.calculateAge(birthday);
  },

  calculateAge(birthday: string) {
    const birthDate = new Date(birthday);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    this.setData({ 'userInfo.age': calculatedAge.toString() });
  },

  onIntensityChange(e: PickerChangeEvent) {
    const intensityIndex = e.detail.value;
    this.setData({
      intensityIndex,
      'userInfo.intensity': this.data.intensityOptions[intensityIndex]
    });
  },

  onWeightChange(e: PickerChangeEvent) {
    const weightIndex = e.detail.value;
    this.setData({
      'userInfo.weight': this.data.weightOptions[weightIndex]
    });
  },

  onTargetWeightChange(e: PickerChangeEvent) {
    const targetWeightIndex = e.detail.value;
    this.setData({
      'userInfo.targetWeight': this.data.targetWeightOptions[targetWeightIndex]
    });
  },

  saveInfo() {
    const { userInfo } = this.data;

    if (!this.checkNicknameUniqueness(userInfo.nickName)) {
      return;
    }

    const requiredFields: string[] = [];
    if (!userInfo.nickName.trim()) requiredFields.push('昵称');
    if (!userInfo.gender) requiredFields.push('性别');
    if (!userInfo.age.trim()) requiredFields.push('年龄');
    if (!userInfo.birthday) requiredFields.push('生日');
    if (!userInfo.height.trim()) requiredFields.push('身高');
    if (userInfo.weight === 0) requiredFields.push('当前体重');
    if (userInfo.targetWeight === 0) requiredFields.push('目标体重');
    if (!userInfo.handLength.trim()) requiredFields.push('手长');
    if (!userInfo.intensity) requiredFields.push('训练强度');

    if (requiredFields.length > 0) {
      wx.showToast({ title: `请填写${requiredFields.join('、')}`, icon: 'none' });
      return;
    }

    if (userInfo.targetWeight >= userInfo.weight) {
      wx.showToast({ title: '目标体重应小于当前体重', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    const savedInfo = {
      ...userInfo,
      weight: Number(userInfo.weight),
      targetWeight: Number(userInfo.targetWeight),
      updatedAt: new Date().toISOString()
    };

    wx.setStorageSync('userInfo', savedInfo);

    const currentUser = wx.getStorageSync('currentUser') as IUser || {};
    if (userInfo.nickName && userInfo.nickName !== currentUser.nickname) {
      currentUser.nickname = userInfo.nickName;
      wx.setStorageSync('currentUser', currentUser);

      const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
      const updatedUsers = users.map(user => 
        user.nickname === currentUser.nickname ? currentUser : user
      );
      wx.setStorageSync('registeredUsers', updatedUsers);
    }

    wx.setStorageSync('hasCompletedInfo', true);

    wx.showToast({ 
      title: '保存成功', 
      icon: 'success',
      complete: () => {
        setTimeout(() => {
          wx.switchTab({ url: '/pages/first/first' });
        }, 1500);
      }
    });
  }
});