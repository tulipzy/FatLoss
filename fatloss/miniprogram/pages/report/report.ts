// 定义饮食记录类型（仅用于数据计算，不展示）
interface DietRecord {
  dishName: string;
  weight: number;
  calorie: number;
  nutrition: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  time: string;
  mealType?: string; // 餐次类型（breakfast/lunch/dinner/snack）
}

// 定义用户信息接口（扩展维度用于精准分析）
interface UserInfo {
  id?: string;
  nickname: string;
  avatarUrl: string;
  gender: number; // 1-男, 2-女
  birth: string;
  age: number;
 
 
 
}

// 定义营养分析结果类型
interface NutritionAnalysis {
  calories: string;
  nutrientBalance: string;
  mealDistribution: string;
  calorieSource: string;
  suggestions: string[];
}

Page({
  data: {
    date: '',
    analysis: {} as NutritionAnalysis,
    // 推荐摄入量（基于用户信息动态计算）
    recommended: {
      calories: 2000,
      protein: 60,    // 克
      carbs: 300,     // 克
      fat: 65,        // 克
      fiber: 25       // 克（膳食纤维）
    },
    // 实际摄入量
    actual: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      mealCalories: { // 各餐次热量分布
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0
      }
    },
    // 摄入比例（用于进度条展示）
    ratios: {
      calorie: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    target: 'maintain' // 默认目标
  },

  onLoad(options: { date?: string }) {
    // 1. 处理日期参数（默认今日）
    const date = options.date || this.formatDate(new Date());
    this.setData({ date });

    // 2. 加载用户信息（动态计算推荐值）
    this.loadUserInfo();

    // 3. 加载饮食数据（仅用于计算）
    this.loadDietData(date);
  },

  /** 日期格式化工具：统一输出 YYYY-MM-DD */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /** 加载用户信息，动态计算推荐营养摄入量 */
  loadUserInfo() {
    const userInfo: UserInfo = wx.getStorageSync('userInfo') || {};
    const defaultUser = {
      gender: 1,
      age: 30,
      weight: 60,
      height: 170,
      activityLevel: 2,
      target: 'maintain'
    };
    const finalUser = { ...defaultUser, ...userInfo };

    // 1. 计算基础代谢率（Mifflin-St Jeor公式）
    let bmr: number;
    if (finalUser.gender === 1) {
      bmr = 10 * finalUser.weight + 6.25 * finalUser.height - 5 * finalUser.age + 5;
    } else {
      bmr = 10 * finalUser.weight + 6.25 * finalUser.height - 5 * finalUser.age - 161;
    }

    // 2. 根据活动量计算总消耗（TDEE）
    const activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
    const tdee = bmr * activityMultipliers[finalUser.activityLevel - 1];

    // 3. 根据目标调整推荐热量
    let calorieGoal: number;
    if (finalUser.target === 'lose') {
      calorieGoal = tdee - 300; // 减重：每日少摄入300大卡
    } else if (finalUser.target === 'gain') {
      calorieGoal = tdee + 300; // 增重：每日多摄入300大卡
    } else {
      calorieGoal = tdee; // 维持：等于总消耗
    }

    // 4. 计算推荐营养比例（符合《中国居民膳食指南》）
    const proteinGoal = finalUser.weight * 1.2; // 每公斤体重1.2克蛋白质
    const carbsGoal = Math.round((calorieGoal * 0.55) / 4); // 碳水占55%热量（每克4大卡）
    const fatGoal = Math.round((calorieGoal * 0.25) / 9); // 脂肪占25%热量（每克9大卡）
    const fiberGoal = finalUser.gender === 1 ? 30 : 25; // 男性30g/天，女性25g/天

    // 更新推荐值
    this.setData({
      'recommended.calories': Math.round(calorieGoal),
      'recommended.protein': Math.round(proteinGoal),
      'recommended.carbs': Math.round(carbsGoal),
      'recommended.fat': Math.round(fatGoal),
      'recommended.fiber': fiberGoal,
      target: finalUser.target
    });
  },

  /** 加载饮食数据，计算实际摄入量 */
  loadDietData(date: string) {
    // 1. 优先从按日期存储的键读取
    let records: DietRecord[] = wx.getStorageSync(`dietRecords_${date}`) || [];

    // 2. 若没有，从全局历史中筛选
    if (records.length === 0) {
      const allRecords = wx.getStorageSync('dietHistory') as DietRecord[] || [];
      records = allRecords.filter(record => {
        try {
          const recordDate = this.formatDate(new Date(record.time));
          return recordDate === date;
        } catch (error) {
          return false;
        }
      });
    }

    // 3. 计算实际摄入量（含餐次分布）
    const actualData = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      mealCalories: {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0
      }
    };

    records.forEach(record => {
      // 累加总营养
      actualData.calories += record.calorie || 0;
      actualData.protein += record.nutrition?.protein || 0;
      actualData.carbs += record.nutrition?.carbs || 0;
      actualData.fat += record.nutrition?.fat || 0;
      actualData.fiber += record.nutrition?.fiber || 0;

      // 按时间分配餐次
      const hour = new Date(record.time).getHours();
      if (hour >= 6 && hour < 10) {
        actualData.mealCalories.breakfast += record.calorie || 0;
      } else if (hour >= 11 && hour < 14) {
        actualData.mealCalories.lunch += record.calorie || 0;
      } else if (hour >= 17 && hour < 21) {
        actualData.mealCalories.dinner += record.calorie || 0;
      } else {
        actualData.mealCalories.snack += record.calorie || 0;
      }
    });

    // 4. 计算摄入比例（进度条用）
    const ratios = {
      calorie: Math.min(100, (actualData.calories / this.data.recommended.calories) * 100),
      protein: Math.min(100, (actualData.protein / this.data.recommended.protein) * 100),
      carbs: Math.min(100, (actualData.carbs / this.data.recommended.carbs) * 100),
      fat: Math.min(100, (actualData.fat / this.data.recommended.fat) * 100),
      fiber: Math.min(100, (actualData.fiber / this.data.recommended.fiber) * 100)
    };

    // 5. 更新数据并生成分析
    this.setData({ actual: actualData, ratios }, () => {
      this.generateDetailedAnalysis();
    });
  },

  /** 生成详细饮食分析（多维度） */
  generateDetailedAnalysis() {
    const { actual, ratios, target } = this.data;
    const analysis: NutritionAnalysis = {
      calories: '',
      nutrientBalance: '',
      mealDistribution: '',
      calorieSource: '',
      suggestions: []
    };

    // -------------------------- 1. 热量摄入分析 --------------------------
    if (actual.calories === 0) {
      analysis.calories = '今日暂无饮食记录，无法评估热量摄入。建议尽快记录饮食（含零食和饮料），以便获取个性化分析。';
      analysis.suggestions.push('打开饮食记录页，添加今日吃过的食物，记录越详细（如重量、烹饪方式），分析越精准。');
    } else if (ratios.calorie < 80) {
      analysis.calories = `今日热量摄入偏低（${actual.calories.toFixed(0)}大卡），仅为推荐值的${ratios.calorie.toFixed(0)}%。长期热量不足可能导致：①基础代谢下降；②精力不足、易疲劳；③肌肉流失（尤其${target === 'lose' ? '减重' : '日常'}人群）。`;
      analysis.suggestions.push(`优先增加复合碳水化合物（如糙米饭、燕麦、红薯），每100克糙米饭可提供约130大卡热量，且能持续供能。`);
      analysis.suggestions.push(`两餐之间添加健康加餐（如1把杏仁+1个苹果，约200大卡），避免过度饥饿导致下一餐暴饮暴食。`);
    } else if (ratios.calorie <= 120) {
      analysis.calories = `今日热量摄入适中（${actual.calories.toFixed(0)}大卡），为推荐值的${ratios.calorie.toFixed(0)}%，符合当前${target === 'lose' ? '减重' : target === 'gain' ? '增重' : '体重维持'}目标需求。热量摄入与消耗基本平衡，有助于维持身体代谢稳定。`;
      analysis.suggestions.push(`保持当前热量总量，重点优化食物结构（如增加蔬菜占比至每餐的1/2），进一步提升营养质量。`);
      analysis.suggestions.push(`根据每日活动量微调：若当天运动量大（如跑步1小时），可额外补充150-200大卡（如1杯牛奶+1片全麦面包）。`);
    } else {
      analysis.calories = `今日热量摄入偏高（${actual.calories.toFixed(0)}大卡），达到推荐值的${ratios.calorie.toFixed(0)}%。长期过量摄入易导致：①脂肪堆积；②血糖波动较大；③增加消化系统负担。`;
      analysis.suggestions.push(`减少高油高糖食物（如1份炸鸡约500大卡，相当于3碗米饭，可替换为烤鸡胸肉）。`);
      analysis.suggestions.push(`控制烹饪方式：多用蒸、煮、烤，少用炸、红烧（如100克炸肉比煮肉多200大卡热量）。`);
    }

    // -------------------------- 3. 餐次分布分析 --------------------------
    const totalMealCalorie = Object.values(actual.mealCalories).reduce((sum, val) => sum + val, 0);
    if (totalMealCalorie === 0) {
      analysis.mealDistribution = '暂无餐次数据，无法分析餐次分布。';
    } else {
      const breakfastRatio = (actual.mealCalories.breakfast / totalMealCalorie) * 100;
      const lunchRatio = (actual.mealCalories.lunch / totalMealCalorie) * 100;
      const dinnerRatio = (actual.mealCalories.dinner / totalMealCalorie) * 100;

      if (breakfastRatio < 20) {
        analysis.mealDistribution = `餐次分布不合理：早餐占比过低（仅${breakfastRatio.toFixed(0)}%，推荐25%-30%），易导致上午精力不足；午餐占比${lunchRatio.toFixed(0)}%，晚餐占比${dinnerRatio.toFixed(0)}%。`;
        analysis.suggestions.push(`早餐需包含"蛋白+碳水+蔬果"（如1杯牛奶+1个鸡蛋+1片全麦面包+1小把蓝莓），保证上午供能。`);
      } else if (dinnerRatio > 40) {
        analysis.mealDistribution = `餐次分布不合理：晚餐占比过高（达${dinnerRatio.toFixed(0)}%，推荐25%-30%），易导致夜间消化负担重、影响睡眠；早餐占比${breakfastRatio.toFixed(0)}%，午餐占比${lunchRatio.toFixed(0)}%。`;
        analysis.suggestions.push(`晚餐尽量在睡前3小时完成，且以清淡为主（如清蒸鱼+炒时蔬+小半碗杂粮饭），避免过量。`);
      } else {
        analysis.mealDistribution = `餐次分布合理：早餐占比${breakfastRatio.toFixed(0)}%，午餐占比${lunchRatio.toFixed(0)}%，晚餐占比${dinnerRatio.toFixed(0)}%，符合"早吃好、午吃饱、晚吃少"的健康饮食原则。`;
        analysis.suggestions.push(`保持当前餐次分配比例，可适当在两餐间添加少量健康零食（如酸奶、水果），避免过度饥饿。`);
      }
    }

   
    // 去重建议列表
    analysis.suggestions = [...new Set(analysis.suggestions)];

    // 更新分析结果到页面
    this.setData({ analysis });
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack();
  }
});
    