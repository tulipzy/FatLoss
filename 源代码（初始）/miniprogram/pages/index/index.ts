const app = getApp<IAppOption>()
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

interface IComponentData {
  motto: string;
  userInfo: {
    avatarUrl: string;
    nickName: string;
  };
  hasUserInfo: boolean;
  canIUseGetUserProfile: boolean;
  canIUseNicknameComp: boolean;
  canLogin: boolean;
}

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
    canLogin: false,
  } as IComponentData,

  methods: {
    bindViewTap() {
      wx.navigateTo({
        url: '../logs/logs',
      })
    },
    
    onLogin() {
      if (!this.checkFormComplete()) {
        wx.showToast({ title: '请完善所有信息', icon: 'none' });
        return;
      }
      
      this.navigateToPersonalInfo();
    },
    
    checkFormComplete() {
      const { nickName, avatarUrl } = this.data.userInfo;
      return !!(nickName && avatarUrl && avatarUrl !== defaultAvatarUrl);
    },
    
    checkLoginStatus() {
      const canLogin = this.checkFormComplete();
      this.setData({ canLogin });
    },
    
    onChooseAvatar(e: any) {
      const { avatarUrl } = e.detail
      this.setData({
        "userInfo.avatarUrl": avatarUrl
      });
      this.checkLoginStatus();
    },
    
    onInputChange(e: any) {
      const nickName = e.detail.value.trim();
      if (!nickName) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      this.setData({ 
        "userInfo.nickName": nickName
      });
      this.checkLoginStatus();
    },
    
    getUserProfile() {
      wx.getUserProfile({
        desc: '展示用户信息',
        success: (res) => {
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
          wx.setStorageSync('userInfo', this.data.userInfo); 
          this.navigateToPersonalInfo()
        }
      })
    },
    
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