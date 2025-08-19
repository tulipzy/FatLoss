export interface IUser {
  nickname: string;
  email?: string;
  password?: string;
}

interface IComponentData {
  nickname: string;
  password: string;
  loading: boolean;
  showPassword: boolean;
  canLogin: boolean;
  nicknameError: string; // 用于显示昵称错误信息
}

Component({
  data: {
    nickname: '',
    password: '',
    loading: false,
    showPassword: false,
    canLogin: false,
    nicknameError: ''
  } as IComponentData,

  methods: {
    // 昵称输入 - 检查格式有效性（不检查是否已注册）
    onNicknameInput(e: WechatMiniprogram.Input) {
      const nickname = e.detail.value.trim();
      let nicknameError = '';
      
      // 只验证格式，不验证是否已注册
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

      setTimeout(() => {
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        const user = users.find(
          (u: IUser) => u.nickname === this.data.nickname && u.password === this.data.password
        );

        if (user) {
          wx.setStorageSync('currentUser', user);
          
          // 登录成功后跳转，不传递 nickName 参数
          wx.navigateTo({
            url: `/pages/information/information`
          });
        } else {
          // 登录时才提示用户名是否存在
          const nicknameExists = users.some((u: IUser) => u.nickname === this.data.nickname);
          wx.showToast({
            title: nicknameExists ? '密码错误' : '用户名不存在',
            icon: 'none'
          });
        }

        this.setData({ loading: false });
      }, 1000);
    },

    navigateToRegister() {
      wx.navigateTo({
        url: `/pages/register/register?nickname=${encodeURIComponent(this.data.nickname)}`
      });
    },

    navigateToForgotPassword() {
      wx.navigateTo({ url: '/pages/forgot-password/forgot-password' });
    }
  }
})