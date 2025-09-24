// ==============================================
// 1. 统一类型定义（避免跨文件类型冲突，与sport.ts保持一致）
// ==============================================
/** 单条运动记录格式（前端展示用） */
interface ExerciseRecord {
  time: string;        // 运动时间（HH:MM）
  exerciseName: string;// 运动名称
  calorie: number;     // 消耗卡路里（整数）
  type: string;        // 运动类型（如：有氧运动、力量训练）
  date: string;        // 运动日期（YYYY年 MM月 DD日）
}

/** 按日期分组后的运动记录格式 */
interface GroupedExercise {
  date: string;                // 分组日期（YYYY年 MM月 DD日）
  records: ExerciseRecord[];   // 该日期下的所有运动记录
  totalCalorie: number;        // 该日期总消耗卡路里（累加计算）
}

/** 后端返回的单条运动数据格式（接口适配用，兼容不同字段命名） */
interface ExerciseItem {
  exerciseId?: string;   // 运动ID（可选）
  exerciseName?: string; // 运动名称（后端字段1）
  exercise_name?: string;// 运动名称（后端字段2，兼容sport.ts）
  calories?: number;     // 消耗卡路里（后端返回值，可能为小数）
  duration?: number;     // 运动时长（分钟，可选）
  type?: string;         // 运动类型（可选，默认填充“有氧运动”）
  exerciseTime?: string; // 运动时间（后端字段1，如：2024-05-20T18:30:00）
  created_at?: string;   // 运动时间（后端字段2，兼容sport.ts）
  spent_time?: number;   // 运动时长（分钟，兼容sport.ts的“spent_time”字段）
}

/** 统一API响应格式（泛型适配不同数据类型，避免重复定义） */
interface ApiResponse<T> {
  status: string;        // 接口状态（success/error）
  data: T;               // 接口返回数据（泛型，适配不同结构）
  message?: string;      // 接口提示信息（可选，如错误描述）
}

// ==============================================
// 2. 工具函数（全局可调用，此处保留罗马数字转换示例）
// ==============================================
/**
 * 数字转罗马数字（工具函数，如需使用可直接调用）
 * @param num 需转换的正整数
 * @returns 罗马数字字符串
 */
function numberToRoman(num: number): string {
  const romanMap: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400,
    C: 100, XC: 90, L: 50, XL: 40,
    X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let result = "";
  // 遍历罗马数字映射表，逐步累加结果
  for (const key in romanMap) {
    while (num >= romanMap[key]) {
      result += key;
      num -= romanMap[key];
    }
  }
  return result;
}

// ==============================================
// 3. 页面核心逻辑（Page实例，包含所有生命周期和业务方法）
// ==============================================
Page({
  // 页面数据（明确类型，避免TypeScript报错）
  data: {
    exerciseHistoryList: [] as GroupedExercise[], // 分组后的运动记录列表
    searchKeyword: "",                            // 搜索关键词（默认空）
    originalExerciseList: [] as GroupedExercise[],// 原始未过滤数据（用于重置搜索）
    isLoading: true,                              // 加载状态（默认true，显示加载中）
    apiBaseUrl: "http://60.205.245.221:5050",     // API基础地址（与sport.ts一致）
    defaultUserId: "a631c63702a5453c86fce9a42008e54a" // 缓存缺失时的默认用户ID
  },

  /**
   * 页面加载生命周期（onLoad）
   * - 初始化全局事件总线（同步sport.ts的运动记录更新）
   * - 优先加载缓存数据（提升首屏速度）
   * - 拉取后端最新数据（确保数据实时性）
   */
  onLoad() {
    // 显示加载提示
    wx.showLoading({ title: "加载运动记录中...", mask: true });

    // 1. 初始化全局事件总线（确保唯一实例，避免重复创建）
    if (!(wx as any).eventBus) {
      (wx as any).eventBus = {
        listeners: {} as Record<string, Function[]>, // 事件监听器存储
        on: function (event: string, callback: Function) {
          // 注册事件：若事件不存在则初始化数组，再添加回调
          this.listeners[event] = this.listeners[event] || [];
          this.listeners[event].push(callback);
        },
        emit: function (event: string, ...args: any[]) {
          // 触发事件：遍历该事件的所有回调并执行
          (this.listeners[event] || []).forEach((cb: Function) => cb(...args));
        },
        off: function (event: string, callback?: Function) {
          // 移除事件监听：若传回调则移除指定回调，否则清空该事件所有回调
          if (!this.listeners[event]) return;
          this.listeners[event] = callback 
            ? this.listeners[event].filter((cb: Function) => cb !== callback) 
            : [];
        }
      };
    }

    // 2. 监听“运动数据变化”事件（sport.ts新增记录后同步更新）
    (wx as any).eventBus.on("exerciseDataChanged", this.loadExerciseHistoryRecords.bind(this));

    // 3. 加载缓存数据（5分钟内有效，避免频繁请求后端）
    const cachedData = wx.getStorageSync("lastExerciseHistory");
    if (cachedData && Date.now() - cachedData.time < 300000) { // 300000ms = 5分钟
      this.setData({
        exerciseHistoryList: cachedData.data,
        originalExerciseList: cachedData.data,
        isLoading: false
      });
      wx.hideLoading(); // 隐藏加载提示
    }

    // 4. 拉取后端最新数据（覆盖缓存，确保数据最新）
    this.loadExerciseHistoryRecords();
  },

  /**
   * 页面卸载生命周期（onUnload）
   * - 移除事件监听，避免内存泄漏
   */
  onUnload() {
    if ((wx as any).eventBus) {
      (wx as any).eventBus.off("exerciseDataChanged", this.loadExerciseHistoryRecords);
    }
  },

  /**
   * 页面显示生命周期（onShow）
   * - 每次进入页面都刷新数据（如从sport.ts返回时）
   */
  onShow() {
    this.loadExerciseHistoryRecords();
  },

  /**
   * 下拉刷新生命周期（onPullDownRefresh）
   * - 用户下拉时触发，强制刷新数据
   */
  onPullDownRefresh() {
    this.loadExerciseHistoryRecords(() => {
      wx.stopPullDownRefresh(); // 数据加载完成后，停止下拉刷新动画
    });
  },

  /**
   * 页面隐藏生命周期（onHide）
   * - 保存当前数据到缓存，避免下次加载空白
   */
  onHide() {
    wx.setStorageSync("lastExerciseHistory", {
      time: Date.now(),       // 缓存时间戳（用于判断有效期）
      data: this.data.exerciseHistoryList // 缓存的运动记录数据
    });
  },

  /**
   * 分享功能（onShareAppMessage）
   * - 返回运动记录页面的分享配置
   */
  onShareAppMessage(): WechatMiniprogram.Page.ICustomShareContent {
    return {
      title: "我的运动记录",                  // 分享标题
      path: "/pages/exerciseHistory/exerciseHistory", // 分享页面路径
      imageUrl: "/images/运动记录.jpg"        // 分享封面图（需确保项目中存在该图片）
    };
  },

  /**
   * 核心方法：加载运动历史记录（从后端API获取并处理）
   * @param callback 加载完成后的回调函数（如停止下拉刷新）
   */
  loadExerciseHistoryRecords(callback?: () => void) {
    try {
      // 1. 获取用户ID（优先用缓存中的用户ID，无则用默认值）
      const userId = wx.getStorageSync("userId") || this.data.defaultUserId;
      if (!wx.getStorageSync("userId")) {
        console.warn("缓存中未找到用户ID，使用默认ID:", this.data.defaultUserId);
      }

      // 2. 调用后端API获取运动数据
      wx.request({
        url: `${this.data.apiBaseUrl}/api/recent_exercises?id=${userId}`, // API请求地址
        method: "GET",                                                    // 请求方法
        timeout: 10000,                                                   // 10秒超时（避免长时间等待）
        header: { "content-type": "application/json" },                   // 请求头
        success: (res: any) => { // 使用any类型，然后在内部进行类型断言
          console.log("后端运动数据返回:", JSON.stringify(res.data, null, 2)); // 打印调试信息
          const backendData = res.data as ApiResponse<ExerciseItem[]>; // 类型断言

          // 3. 处理接口成功响应（有数据时）
          if (backendData.status === "success" && backendData.data?.length) {
            // 添加调试信息
            console.log('运动历史原始数据:', backendData.data);
            
            // 3.1 转换后端数据为前端所需格式（统一字段名、计算逻辑）
            const allRecords: ExerciseRecord[] = backendData.data.map(exerciseItem => {
              // 统一卡路里计算（与sport.ts保持一致：优先用后端值，无则按“时长×10”估算）
              const calorie = exerciseItem.calories 
                ? Math.round(exerciseItem.calories) // 后端返回值取整
                : Math.round((exerciseItem.spent_time || 0) * 10); // 无后端值时估算

              // 统一时间格式处理（兼容后端不同字段名，输出“YYYY年 MM月 DD日”和“HH:MM”）
              const timeSource = exerciseItem.created_at || exerciseItem.exerciseTime || "";
              console.log('运动历史时间源:', timeSource);
              let displayTime = "";  // 最终显示的时间（HH:MM）
              let formattedDate = "";// 最终显示的日期（YYYY年 MM月 DD日）

              if (timeSource) {
                const date = new Date(timeSource);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0"); // 补零（如9月→09）
                const day = String(date.getDate()).padStart(2, "0");        // 补零（如5日→05）
                const hours = String(date.getHours()).padStart(2, "0");    // 补零（如9时→09）
                const minutes = String(date.getMinutes()).padStart(2, "0");// 补零（如5分→05）

                formattedDate = `${year}年 ${month}月 ${day}日`;
                displayTime = `${hours}:${minutes}`;
                console.log('运动历史转换后的时间:', displayTime);
              }

              // 返回前端统一格式的运动记录
              return {
                time: displayTime,
                exerciseName: exerciseItem.exerciseName || exerciseItem.exercise_name || "未知运动",
                calorie: calorie,
                type: exerciseItem.type || "有氧运动",
                date: formattedDate
              };
            });

            // 3.2 按日期分组，并计算每日总卡路里
            const groupedRecords: Record<string, GroupedExercise> = {};
            allRecords.forEach(record => {
              const { date } = record;
              // 若该日期未创建分组，则初始化分组
              if (!groupedRecords[date]) {
                groupedRecords[date] = {
                  date: date,
                  records: [],
                  totalCalorie: 0
                };
              }
              // 将当前记录加入对应分组，并累加总卡路里
              groupedRecords[date].records.push(record);
              groupedRecords[date].totalCalorie += record.calorie;
            });

            // 3.3 转换分组对象为数组，并按日期倒序排序（最新日期在前）
            const exerciseHistoryList = Object.values(groupedRecords).sort((a, b) => {
              // 将日期字符串转为时间戳用于比较（如“2024年 05月 20日”→2024-05-20）
              const dateA = new Date(a.date.replace(/[年月]/g, "-").replace("日", ""));
              const dateB = new Date(b.date.replace(/[年月]/g, "-").replace("日", ""));
              return dateB.getTime() - dateA.getTime(); // 倒序排序
            });

            // 3.4 更新页面数据（同步到视图）
            this.setData({
              exerciseHistoryList: exerciseHistoryList,
              originalExerciseList: exerciseHistoryList, // 保存原始数据用于搜索重置
              isLoading: false
            });

            // 3.5 保存最新数据到缓存（下次加载优先使用）
            wx.setStorageSync("lastExerciseHistory", {
              time: Date.now(),
              data: exerciseHistoryList
            });
          } else {
            // 4. 处理接口成功但无数据的场景
            this.setData({
              exerciseHistoryList: [],
              originalExerciseList: [],
              isLoading: false
            });
            wx.showToast({ title: "暂无运动记录", icon: "none", duration: 1500 });
          }
        },
        fail: (err) => {
          // 5. 处理接口请求失败（网络错误、超时等）
          console.error("获取运动数据失败:", err);
          this.setData({ isLoading: false });
          // 根据错误类型提示不同信息
          const errMsg = err.errMsg.includes("timeout") 
            ? "请求超时，请检查网络" 
            : "加载运动记录失败";
          wx.showToast({ title: errMsg, icon: "none", duration: 2000 });
        },
        complete: () => {
          // 6. 无论成功/失败，都执行回调（如停止下拉刷新）
          wx.hideLoading();
          if (callback) callback();
        }
      });
    } catch (error) {
      // 7. 捕获代码执行错误（如日期转换异常、数据处理异常）
      console.error("加载运动记录代码执行错误:", error);
      this.setData({ isLoading: false });
      wx.showToast({ title: "加载运动记录失败", icon: "none", duration: 2000 });
    }
  },

  /**
   * 搜索功能：根据关键词过滤运动记录
   * @param e 输入框事件对象（包含搜索关键词）
   */
  onSearch(e: any) {
    // 获取并处理搜索关键词（去空格、转小写，统一匹配规则）
    const keyword = (e.detail.value || "").trim().toLowerCase();
    this.setData({ searchKeyword: keyword });

    // 若关键词为空，恢复显示原始未过滤数据
    if (!keyword) {
      this.setData({ exerciseHistoryList: this.data.originalExerciseList });
      return;
    }

    // 按关键词过滤：匹配“日期”“运动名称”“运动类型”三个维度
    const filteredList = this.data.originalExerciseList.filter(group => {
      // 条件1：日期包含关键词（如“2024”“05月”“20日”）
      const isDateMatch = group.date.toLowerCase().includes(keyword);
      // 条件2：该日期下的任意运动记录匹配“名称”或“类型”（如“跑步”“有氧运动”）
      const isRecordMatch = group.records.some(record => 
        record.exerciseName.toLowerCase().includes(keyword) || 
        record.type.toLowerCase().includes(keyword)
      );
      // 满足任一条件即保留该分组
      return isDateMatch || isRecordMatch;
    });

    // 更新过滤后的数据到视图
    this.setData({ exerciseHistoryList: filteredList });
  }
});