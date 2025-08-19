export interface IUser {
  nickname: string;
  email?: string;
  password?: string;
}

interface IRegisterData {
  nickname: string;
  email: string;
  password: string;
  loading: boolean;
  showPassword: boolean;
  nicknameError: string;
}

Component({
  data: {
    nickname: '',
    email: '',
    password: '',
    loading: false,
    showPassword: false,
    nicknameError: ''
  } as IRegisterData,

  lifetimes: {
    attached() {
      this.initNickname();
      // 模拟已存在的用户数据（实际项目中从存储中获取）
      this.mockExistingUsers();
    }
  },

  methods: {
    // 模拟已存在的用户数据
    mockExistingUsers() {
      const mockUsers: IUser[] = [
        { nickname: 'testuser', email: 'test@example.com', password: '123456' },
        { nickname: 'admin', email: 'admin@example.com', password: 'admin123' },
        { nickname: 'user123', email: 'user@example.com', password: 'userpass' }
      ];
      // 存储到本地
      wx.setStorageSync('registeredUsers', mockUsers);
    },

    // 初始化昵称（从登录页传递的参数）
    initNickname() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const options = currentPage.options || {};
      
      if (options.nickname) {
        const nickname = decodeURIComponent(options.nickname);
        this.setData({ nickname });
        this.checkNicknameUniqueness(nickname);
      }
    },

    // 昵称输入处理
    onNicknameInput(e: WechatMiniprogram.Input) {
      const nickname = e.detail.value.trim();
      this.setData({ nickname });
      this.checkNicknameUniqueness(nickname);
    },

    onEmailChange(e: WechatMiniprogram.Input) {
      this.setData({ email: e.detail.value.trim() });
    },

    onPasswordChange(e: WechatMiniprogram.Input) {
      this.setData({ password: e.detail.value.trim() });
    },

    togglePasswordVisibility() {
      this.setData({ showPassword: !this.data.showPassword });
    },

    // 检查用户名唯一性（核心方法）
    checkNicknameUniqueness(nickname: string): boolean {
      // 清空之前的错误
      let nicknameError = '';
      
      // 格式验证
      if (nickname.length < 2) {
        nicknameError = '用户名长度不能少于2个字符';
      } else if (nickname.length > 20) {
        nicknameError = '用户名长度不能超过20个字符';
      } else {
        // 唯一性验证
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        const isExists = users.some(user => user.nickname === nickname);
        if (isExists) {
          nicknameError = '该用户名已被注册';
        }
      }
      
      this.setData({ nicknameError });
      return !nicknameError;
    },

    // 表单验证
    validateForm(): boolean {
      const { nickname, email, password } = this.data;

      // 验证用户名
      if (!nickname) {
        wx.showToast({ title: '请输入用户名', icon: 'none' });
        return false;
      }
      
      if (this.data.nicknameError) {
        wx.showToast({ title: this.data.nicknameError, icon: 'none' });
        return false;
      }

      // 验证邮箱
      if (!this.validateEmail(email)) {
        wx.showToast({ title: '请输入有效邮箱地址', icon: 'none' });
        return false;
      }

      // 验证密码
      if (!this.validatePassword(password)) {
        wx.showToast({ title: '密码需6-20位字符', icon: 'none' });
        return false;
      }

      return true;
    },

    validateEmail(email: string): boolean {
      return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    validatePassword(password: string): boolean {
      return !!password && password.length >= 6 && password.length <= 20;
    },

    // 注册处理
    onRegister() {
      if (!this.validateForm()) return;

      // 再次检查唯一性（防止并发问题）
      if (!this.checkNicknameUniqueness(this.data.nickname)) return;

      this.registerUser();
    },

    registerUser() {
      this.setData({ loading: true });

      setTimeout(() => {
        const newUser: IUser = {
          nickname: this.data.nickname,
          email: this.data.email,
          password: this.data.password
        };

        // 获取现有用户并添加新用户
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        wx.setStorageSync('registeredUsers', [...users, newUser]);
        
        this.showRegisterSuccess();
      }, 1000);
    },

    showRegisterSuccess() {
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        this.setData({ loading: false });
        wx.navigateBack();
      }, 1500);
    },

    navigateToLogin() {
      wx.navigateBack();
    }
  }
})