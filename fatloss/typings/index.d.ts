/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
}
// 在类型声明文件中添加
declare namespace WechatMiniprogram {
  interface App {
    // Apple登录API类型声明
    appleLogin(option: AppleLoginOption): void;
  }
  
  interface AppleLoginOption {
    success?: (res: AppleLoginSuccess) => void;
    fail?: (err: any) => void;
    complete?: () => void;
  }
  
  interface AppleLoginSuccess {
    code: string;         // Apple登录凭证
    userIdentity?: string; // 用户标识
    // 其他可能的返回字段，根据实际API调整
  }
  
    interface WxRequestSuccessCallbackResult {
      data: {
        code: string;
        msg: string;
        // 其他你期望后端返回的字段结构
      } | string | Record<string, any> | ArrayBuffer;
    }
    interface Wx {
      /**
       * 监听本地存储变化事件
       * @param callback 存储变化时的回调函数
       */
      onStorageChange: (callback: (res: {
        key: string;
        oldValue: any;
        newValue: any;
        storage: string;
      }) => void) => void;
    }
  
}

