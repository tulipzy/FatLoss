// pages/register/register.ts
export interface IUser {
  id?: string;
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
  emailError: string;
  checkingUsername: boolean;
  checkingEmail: boolean;
}

// 后端API基地址
const API_BASE_URL = 'http://60.205.245.221:9090';

// 声明debounceTimer - 使用小程序兼容的方式
let debounceTimer: number | null = null;
let emailDebounceTimer: number | null = null;

Component({
  data: {
    nickname: '',
    email: '',
    password: '',
    loading: false,
    showPassword: false,
    nicknameError: '',
    emailError: '',
    checkingUsername: false,
    checkingEmail: false
  } as IRegisterData,

  lifetimes: {
    attached() {
      this.initNickname();
    }
  },

  methods: {
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
    onNicknameInput(e: any) {
      const nickname = e.detail.value.trim();
      this.setData({ nickname });
      
      // 延迟检查用户名，避免频繁请求
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        if (nickname.length >= 2) {
          this.checkNicknameUniqueness(nickname);
        } else {
          this.setData({ 
            nicknameError: nickname ? '用户名长度不能少于2个字符' : '',
            checkingUsername: false
          });
        }
        debounceTimer = null;
      }, 500) as unknown as number;
    },

    // 邮箱输入处理
    onEmailChange(e: any) {
      const email = e.detail.value.trim();
      this.setData({ email });
      
      // 延迟检查邮箱，避免频繁检查
      if (emailDebounceTimer !== null) {
        clearTimeout(emailDebounceTimer);
      }
      
      emailDebounceTimer = setTimeout(() => {
        if (email) {
          if (this.validateEmail(email)) {
            this.checkEmailUniqueness(email);
          } else {
            this.setData({ 
              emailError: '请输入有效的邮箱格式',
              checkingEmail: false
            });
          }
        } else {
          this.setData({ 
            emailError: '',
            checkingEmail: false
          });
        }
        emailDebounceTimer = null;
      }, 500) as unknown as number;
    },

    onPasswordChange(e: any) {
      this.setData({ password: e.detail.value.trim() });
    },

    togglePasswordVisibility() {
      this.setData({ showPassword: !this.data.showPassword });
    },

    // 检查用户名唯一性（调用后端API）
    async checkNicknameUniqueness(nickname: string): Promise<boolean> {
      this.setData({ checkingUsername: true });
      
      try {
        const res = await new Promise<any>((resolve, reject) => {
          wx.request({
            url: `${API_BASE_URL}/user/checkUsername`,
            method: 'GET',
            data: { username: nickname },
            success: resolve,
            fail: reject
          });
        });
        
        if (res.statusCode === 200) {
          // 用户名可用
          this.setData({ 
            nicknameError: '',
            checkingUsername: false
          });
          return true;
        } else {
          // 用户名已存在
          this.setData({ 
            nicknameError: '该用户名已被注册',
            checkingUsername: false
          });
          return false;
        }
      } catch (error) {
        console.error('检查用户名失败:', error);
        // 网络错误时使用本地存储作为备用方案
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        const isExists = users.some(user => user.nickname === nickname);
        
        if (isExists) {
          this.setData({ 
            nicknameError: '该用户名已被注册',
            checkingUsername: false
          });
          return false;
        } else {
          this.setData({ 
            nicknameError: '',
            checkingUsername: false
          });
          return true;
        }
      }
    },

    // 检查邮箱唯一性（前端本地检查）
    checkEmailUniqueness(email: string): boolean {
      this.setData({ checkingEmail: true });
      
      try {
        // 从本地存储获取已注册用户
        const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
        const isExists = users.some(user => user.email === email);
        
        if (isExists) {
          // 邮箱已存在
          this.setData({ 
            emailError: '该邮箱已被注册',
            checkingEmail: false
          });
          return false;
        } else {
          // 邮箱可用
          this.setData({ 
            emailError: '',
            checkingEmail: false
          });
          return true;
        }
      } catch (error) {
        console.error('检查邮箱失败:', error);
        // 如果检查失败，默认可用
        this.setData({ 
          emailError: '',
          checkingEmail: false
        });
        return true;
      }
    },

    // 表单验证
    validateForm(): boolean {
      const { nickname, email, password } = this.data;

      // 验证用户名
      if (!nickname) {
        wx.showToast({ title: '请输入用户名', icon: 'none' });
        return false;
      }
      
      if (nickname.length < 2) {
        wx.showToast({ title: '用户名长度不能少于2个字符', icon: 'none' });
        return false;
      }
      
      if (nickname.length > 20) {
        wx.showToast({ title: '用户名长度不能超过20个字符', icon: 'none' });
        return false;
      }
      
      if (this.data.nicknameError) {
        wx.showToast({ title: this.data.nicknameError, icon: 'none' });
        return false;
      }

      // 验证邮箱
      if (!email) {
        wx.showToast({ title: '请输入邮箱地址', icon: 'none' });
        return false;
      }
      
      if (!this.validateEmail(email)) {
        wx.showToast({ title: '请输入有效邮箱地址', icon: 'none' });
        return false;
      }
      
      if (this.data.emailError) {
        wx.showToast({ title: this.data.emailError, icon: 'none' });
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
    async onRegister() {
      if (!this.validateForm()) return;

      // 再次检查唯一性（防止并发问题）
      const isNicknameUnique = await this.checkNicknameUniqueness(this.data.nickname);
      if (!isNicknameUnique) return;
      
      const isEmailUnique = this.checkEmailUniqueness(this.data.email);
      if (!isEmailUnique) return;

      this.registerUser();
    },

    async registerUser() {
      this.setData({ loading: true });

      try {
        const res = await new Promise<any>((resolve, reject) => {
          wx.request({
            url: `${API_BASE_URL}/user/register`,
            method: 'POST',
            data: {
              username: this.data.nickname,
              email: this.data.email,
              passwd: this.data.password
            },
            header: {
              'content-type': 'application/json'
            },
            success: resolve,
            fail: reject
          });
        });
        
        if (res.statusCode === 200) {
          // 注册成功
          const responseData = res.data as any;
          if (responseData.code === "200") {
            // 存储用户ID到本地
            wx.setStorageSync('userId', responseData.data);
            
            // 同时保存用户信息到本地存储作为备用
            const newUser: IUser = {
              id: responseData.data,
              nickname: this.data.nickname,
              email: this.data.email,
              password: this.data.password
            };
            
            const users: IUser[] = wx.getStorageSync('registeredUsers') || [];
            wx.setStorageSync('registeredUsers', [...users, newUser]);
            
            this.showRegisterSuccess();
          } else {
            wx.showToast({ 
              title: responseData.msg || '注册失败', 
              icon: 'none' 
            });
            this.setData({ loading: false });
          }
        } else {
          throw new Error(`HTTP ${res.statusCode}`);
        }
      } catch (error) {
        console.error('注册失败:', error);
        wx.showToast({ 
          title: '网络错误，请稍后重试', 
          icon: 'none' 
        });
        this.setData({ loading: false });
      }
    },

    showRegisterSuccess() {
      wx.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        this.setData({ loading: false });
        // 返回登录页面，并传递新注册的用户名
        wx.navigateTo({
          url: `/pages/index/index?nickname=${encodeURIComponent(this.data.nickname)}`
        });
      }, 1500);
    },

    navigateToLogin() {
      wx.navigateBack();
    }
  }
})