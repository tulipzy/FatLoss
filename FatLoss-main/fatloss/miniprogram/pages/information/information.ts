declare namespace WechatMiniprogram {
  interface Wx {
    chooseAvatar(options: {
      success?: (res: { detail: { avatarUrl: string } }) => void;
      fail?: (err: any) => void;
      complete?: () => void;
    }): void;
  }
}

Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      gender: '',
      birthday: '',
      height: '',
      weight: 0 ,// 改为number类型，与体重选项匹配
      targetWeight: 0 // 新增目标体重字段
    },
    genders: ['男', '女', '保密'],
    genderIndex: 0,
    weightOptions: [] as number[],
    weightIndex: 0,
    targetWeightOptions: [] as number[], // 新增目标体重选项
    targetWeightIndex: 0 // 新增目标体重索引
  },

  onLoad() {
    // 初始化体重选项
    const weightList: number[] = [];
    for (let i = 30; i <= 150; i++) {
      weightList.push(i);
    }
     // 初始化目标体重选项（范围可以比体重更大或更小）
     const targetWeightList: number[] = [];
     for (let i = 30; i <= 150; i++) {
       targetWeightList.push(i);
     }
     this.setData({ 
      weightOptions: weightList,
      targetWeightOptions: targetWeightList
    });
    

    // 加载已有信息（若有）
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ 
        userInfo,
        genderIndex: this.data.genders.indexOf(userInfo.gender),
        weightIndex: this.data.weightOptions.indexOf(Number(userInfo.weight)),
        targetWeightIndex: this.data.targetWeightOptions.indexOf(Number(userInfo.targetWeight )) // 默认60kg
      });
    }
  },

  // 更换头像
  chooseAvatar() {
    wx.chooseAvatar({
      success: (res) => {
        // 成功选择头像的处理逻辑
        this.setData({
          'userInfo.avatarUrl': res.tempFilePath
        });
      },
      // 添加取消和错误处理
      fail: (err) => {
        // 检查是否是用户取消
        if (err.errMsg === 'chooseAvatar:fail cancel') {
          console.log('用户取消了头像选择');
          return;
        }
        // 其他错误处理
        wx.showToast({
          title: '选择头像失败',
          icon: 'error'
        });
        console.error('头像选择错误:', err);
      }
    });
  },

  // 更新昵称
  updateNickname(e: any) {
    this.setData({ 'userInfo.nickName': e.detail.value });
  },

  // 选择性别
  onGenderChange(e: any) {
    const genderIndex = e.detail.value;
    this.setData({ 
      genderIndex,
      'userInfo.gender': this.data.genders[genderIndex] 
    });
  },

  // 选择生日
  onBirthdayChange(e: any) {
    this.setData({ 'userInfo.birthday': e.detail.value });
  },

  // 选择体重
  onWeightChange(e: any) {
    const weightIndex = e.detail.value;
    this.setData({
      weightIndex,
      'userInfo.weight': this.data.weightOptions[weightIndex]
    });
  },
 // 新增目标体重选择方法
 onTargetWeightChange(e: any) {
  const targetWeightIndex = e.detail.value;
  this.setData({
    targetWeightIndex,
    'userInfo.targetWeight': this.data.targetWeightOptions[targetWeightIndex]
  });
},
  // 保存信息（关键：确保标记被写入）
  saveInfo() {
    
    // 1. 保存用户信息
    wx.setStorageSync('userInfo', this.data.userInfo);
    
    // 2. 写入“已完善”标记（核心步骤）
    wx.setStorageSync('hasCompletedInfo', true); 
    console.log('信息保存成功 - 标记已写入：', wx.getStorageSync('hasCompletedInfo')); // 调试用
    
    wx.showToast({ title: '保存成功', icon: 'success' });
    
    // 3. 跳首页
    // This is correct - using switchTab for tabBar page
    wx.switchTab({ 
      url: '/pages/first/first',
      fail: (err) => console.error('跳首页失败：', err)
    });
  }
});