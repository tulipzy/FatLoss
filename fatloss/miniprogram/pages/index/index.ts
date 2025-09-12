// 定义后端返回的用户数据结构
interface LoginResponseData {
  id: string;
  username: string;
  passwd: null | string;
  gender: number;
  birth: string;
  email: string;
  phone: string;
  height: number;
  weight: number;
  level: number;
  experience: number;
  nickname: string;
  hand_length: number;
  exp_threshold: number;
  target_weight: number;
  activity_level: number;
}

// 定义后端响应结构
interface BackendResponse {
  code: string;
  msg: string;
  data: LoginResponseData | null;
}

// 用户ID验证响应结构
interface CheckUserIdResponse {
  code: string;
  msg: string;
  data: boolean | null;
}

// 登录请求参数
interface LoginRequest {
  username: string;
  passwd: string;
}

export interface IUser {
  nickname: string;
  email?: string;
  password?: string;
}

interface IPageData {
  nickname: string;
  password: string;
  loading: boolean;
  showPassword: boolean;
  canLogin: boolean;
  nicknameError: string;
  checkingAutoLogin: boolean; // 新增：检查自动登录中的状态
}

Page({
  data: {
    nickname: '',
    password: '',
    loading: false,
    showPassword: false,
    canLogin: false,
    nicknameError: '',
    checkingAutoLogin: true // 初始为true，表示正在检查自动登录
  } as IPageData,

  // 页面加载时检查自动登录
  onLoad() {
    this.checkAutoLogin();
  },

  // 检查是否可以自动登录
  async checkAutoLogin() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ checkingAutoLogin: false }); // 没有用户ID，停止检查
      return;
    }

    try {
      // 向后端验证用户ID有效性
      const isValid = await this.validateUserId(userId);
      
      if (isValid) {
        const hasCompletedInfo = wx.getStorageSync('hasCompletedInfo');
        if (hasCompletedInfo) {
          wx.switchTab({ url: '/pages/first/first' });
        } else {
          wx.navigateTo({ 
            url: `/pages/information/information?userId=${userId}&from=autoLogin` 
          });
        }
        // 跳转后不需要设置 checkingAutoLogin=false，因为页面会被卸载
      } else {
        // 用户ID无效，清除缓存
        wx.removeStorageSync('userId');
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('currentUser');
        wx.removeStorageSync('hasCompletedInfo');
        this.setData({ checkingAutoLogin: false });
      }
    } catch (error) {
      console.error('验证用户ID失败:', error);
      // 网络错误等情况，停止检查，让用户手动登录
      this.setData({ checkingAutoLogin: false });
    }
  },

  // 向后端验证用户ID是否有效
  validateUserId(userId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      wx.request<CheckUserIdResponse>({
        url: `http://60.205.245.221:9090/user/checkUserId?id=${userId}`,
        method: 'POST',
        success: (res) => {
          const response = res.data as CheckUserIdResponse;
          if (response.code === '200' ) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  onNicknameInput(e: WechatMiniprogram.Input) {
    const nickname = e.detail.value.trim();
    let nicknameError = '';
    
    if (nickname && nickname.length < 2) {
      nicknameError = '用户名长度不能少于2个字符';
    } else if (nickname && nickname.length > 20) {
      nicknameError = '用户名长度不能超过20个字符';
    }
    
    this.setData({
      nickname,
      nicknameError,
      canLogin: nickname.length > 0 && this.data.password.length > 0 && !nicknameError
    });
  },

  onPasswordChange(e: WechatMiniprogram.Input) {
    const password = e.detail.value;
    this.setData({
      password,
      canLogin: this.data.nickname.length > 0 && password.length > 0 && !this.data.nicknameError
    });
  },

  togglePasswordVisibility() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  validateForm() {
    const { nickname, password, nicknameError } = this.data;

    if (!nickname.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' });
      return false;
    }

    if (nicknameError) {
      wx.showToast({ title: nicknameError, icon: 'none' });
      return false;
    }

    if (!password.trim()) {
      wx.showToast({ title: '请输入密码', icon: 'none' });
      return false;
    }

    return true;
  },

  onLogin() {
    if (!this.validateForm()) return;

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中...' });

    const loginData: LoginRequest = {
      username: this.data.nickname,
      passwd: this.data.password
    };

    wx.request<BackendResponse>({
      url: 'http://60.205.245.221:9090/user/login',
      method: 'POST',
      data: loginData,
      success: (res) => {
        const response = res.data as BackendResponse;
        
        if (response.code === '200' && response.data) {
          const userData = response.data;
          
          // 存储用户信息到缓存
          wx.setStorageSync('userInfo', userData);
          wx.setStorageSync('currentUser', {
            nickname: userData.nickname,
            email: userData.email
          });
          wx.setStorageSync('userId', userData.id); // 存储用户ID
          
          const hasCompletedInfo = !!userData.gender && 
                                 !!userData.birth && 
                                 !!userData.phone;
          wx.setStorageSync('hasCompletedInfo', hasCompletedInfo);
          
          wx.showToast({ 
            title: '登录成功', 
            icon: 'success' 
          });
          
          setTimeout(() => {
            if (hasCompletedInfo) {
              wx.switchTab({ url: '/pages/first/first' });
            } else {
              wx.navigateTo({ 
                url: `/pages/information/information?userId=${userData.id}&from=login` 
              });
            }
          }, 1500);
        } else {
          let errorMsg = response.msg || '登录失败，请重试';
          if (!response.data) {
            errorMsg = '获取用户数据失败，请重试';
          }
          wx.showToast({
            title: errorMsg,
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({ 
          title: '网络异常，登录失败', 
          icon: 'none' 
        });
      },
      complete: () => {
        this.setData({ loading: false });
        wx.hideLoading();
      }
    });
  },

  navigateToRegister() {
    wx.navigateTo({
      url: `/pages/register/register?nickname=${encodeURIComponent(this.data.nickname)}`
    });
  },

  navigateToForgotPassword() {
    wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
  }
});