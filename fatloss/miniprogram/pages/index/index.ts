// index.ts
// 获取应用实例
const app = getApp<IAppOption>()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Component({
  data: {
    motto: '欢迎使用膳行派',
    userInfo: {
      avatarUrl: defaultAvatarUrl,
      nickName: '',
    },
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    canIUseNicknameComp: wx.canIUse('input.type.nickname'),
  },
  methods: {
    // 原有事件处理函数
    bindViewTap() {
      wx.navigateTo({
        url: '../logs/logs',
      })
    },
    // 选择头像后更新状态，若已完善信息则跳转
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      const { nickName } = this.data.userInfo
      // 更新头像并判断是否已完善信息（头像+昵称）
      const hasUserInfo = nickName && avatarUrl && avatarUrl !== defaultAvatarUrl
      this.setData({
        "userInfo.avatarUrl": avatarUrl,
        hasUserInfo
      })
      // 若已完善信息，自动跳转个人信息页
      if (hasUserInfo) {
        this.navigateToPersonalInfo()
      }
    },
    // 输入昵称后更新状态，若已完善信息则跳转
    onInputChange(e: any) {
      const nickName = e.detail.value.trim();
      if (!nickName) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      const { avatarUrl } = this.data.userInfo;
      const hasUserInfo = nickName && avatarUrl && avatarUrl !== defaultAvatarUrl;
      this.setData({ "userInfo.nickName": nickName, hasUserInfo });
      if (hasUserInfo) this.navigateToPersonalInfo();
    },   
    // 原有 getUserProfile 授权逻辑（兼容旧版授权）
    getUserProfile() {
      wx.getUserProfile({
        desc: '展示用户信息',
        success: (res) => {
          console.log(res)
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
          // 授权成功后跳转个人信息页
          wx.setStorageSync('userInfo', res.userInfo); 
          this.navigateToPersonalInfo()
        }
      })
    },
    // 新增：跳转至个人信息页（封装复用）
    navigateToPersonalInfo() {
      wx.setStorageSync('userInfo', this.data.userInfo);
      wx.navigateTo({
        url: '/pages/information/information',
        fail: (err) => {
          console.error('跳转失败：', err);
          wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
        }
      });
    }

  }
  
})