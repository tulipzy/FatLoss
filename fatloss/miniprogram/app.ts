// app.ts
App<IAppOption>({
  globalData: {},
  
  onLaunch() {
    // 初始化事件总线（全局唯一）
    if (!(wx as any).eventBus) {
      (wx as any).eventBus = {
        events: {} as Record<string, Function[]>,
        on(event: string, callback: Function) {
          if (!this.events[event]) this.events[event] = [];
          this.events[event].push(callback);
        },
        off(event: string, callback: Function) {
          if (this.events[event]) {
            this.events[event] = this.events[event].filter((cb:any) => cb !== callback);
          }
        },
        emit(event: string, data?: any) {
          if (this.events[event]) {
            this.events[event].forEach((callback:any) => callback(data));
          }
        }
      };
    }

    // 原有本地存储能力展示
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);
   
    // 原有登录逻辑
    wx.login({
      success: res => {
        console.log(res.code);
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    });
  },
});
