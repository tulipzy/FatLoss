class ExerciseRecommender:
    def __init__(self, db):
        self.db = db
        # 运动类型映射
        self.type_mapping = {
            1: "居家",
            2: "户外",
            3: "健身房"
        }
    
    def calculate_bmi(self, weight, height):
        """计算BMI指数"""
        height_m = height / 100  # 转换为米
        return weight / (height_m ** 2)
    
    def estimate_calorie_needs(self, gender, age, weight, height, activity_level):
        """估算每日卡路里需求"""
        # 使用Mifflin-St Jeor公式估算基础代谢率(BMR)
        if gender == "男":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:  # 女
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        
        # 根据活动水平调整
        activity_factors = {
            "低": 1.2,
            "中": 1.55,
            "高": 1.725
        }
        
        return bmr * activity_factors.get(activity_level, 1.55)
    
    def calculate_weight_loss_needs(self, current_weight, target_weight, weeks):
        """计算每周需要减少的体重(公斤)"""
        weight_diff = current_weight - target_weight
        if weight_diff <= 0:
            return 0  # 不需要减重
        return weight_diff / weeks
    
    def recommend_exercises(self, user_info):
        """根据用户信息推荐运动"""
        # 解析用户信息
        gender = user_info['gender']
        age = user_info['age']
        height = user_info['height']
        current_weight = user_info['current_weight']
        target_weight = user_info['target_weight']
        weeks = user_info['weeks']
        intensity = user_info['intensity']
        
        # 计算关键指标
        bmi = self.calculate_bmi(current_weight, height)
        weekly_weight_loss = self.calculate_weight_loss_needs(current_weight, target_weight, weeks)
        
        # 根据强度确定代谢当量筛选范围
        intensity_met_ranges = {
            "低": (2, 5),
            "中": (4, 8),
            "高": (7, 20)
        }
        
        min_met, max_met = intensity_met_ranges.get(intensity, (4, 8))
        
        # 为三类运动分别推荐
        recommendations = {}
        
        for type_id, type_name in self.type_mapping.items():
            # 获取该类型的所有运动
            exercises = self.db.get_exercises_by_type(type_id)
            
            # 根据MET值和强度筛选
            filtered = [e for e in exercises if min_met <= e['met'] <= max_met]
            
            # 进一步根据BMI和减重需求调整推荐
            if bmi > 28:  # 肥胖，优先低冲击运动
                filtered.sort(key=lambda x: x['met'] if x['type'] != 2 else x['met'] * 0.8)
            elif weekly_weight_loss > 0.5:  # 需要快速减重，优先高消耗运动
                filtered.sort(key=lambda x: x['calories_burned_per_ten_minutes'], reverse=True)
            else:  # 一般情况，平衡推荐
                filtered.sort(key=lambda x: x['met'], reverse=True)
            
            # 取前5-8个运动
            selected = filtered[:8]
            
            # 根据用户信息确定每组数量/时长和组数
            for exercise in selected:
                # 根据运动类型和强度确定每组时长或次数
                if exercise['type'] in [1, 3]:  # 居家和健身房运动通常按次数
                    if intensity == "低":
                        exercise['sets'] = 2
                        exercise['reps_per_set'] = 12 if age < 40 else 10
                    elif intensity == "中":
                        exercise['sets'] = 3
                        exercise['reps_per_set'] = 15 if age < 40 else 12
                    else:  # 高
                        exercise['sets'] = 4
                        exercise['reps_per_set'] = 18 if age < 40 else 15
                else:  # 户外运动通常按时间
                    if intensity == "低":
                        exercise['sets'] = 1
                        exercise['duration_per_set'] = 20  # 分钟
                    elif intensity == "中":
                        exercise['sets'] = 1
                        exercise['duration_per_set'] = 30  # 分钟
                    else:  # 高
                        exercise['sets'] = 2
                        exercise['duration_per_set'] = 25  # 分钟，中间可休息
                
                # 调整年龄较大用户的运动量
                if age > 50:
                    exercise['sets'] = max(1, exercise['sets'] - 1)
            
            # 确保至少有5个运动
            if len(selected) < 5 and len(filtered) >= 5:
                selected = filtered[:5]
            
            recommendations[type_name] = selected[:5]  # 确保最多5个
        
        return recommendations
    
    def format_recommendations(self, recommendations):
        """格式化推荐结果为表格形式"""
        formatted = {}
        
        for type_name, exercises in recommendations.items():
            table = []
            for ex in exercises:
                # 确定是次数还是时长
                if ex['type'] in [1, 3]:  # 居家和健身房
                    rep_info = f"{ex['reps_per_set']}次"
                else:  # 户外
                    rep_info = f"{ex['duration_per_set']}分钟"
                
                table.append({
                    "运动ID": ex['exercise_id'],
                    "运动名称": ex['exercise_name'],
                    "运动种类": self.type_mapping[ex['type']],
                    "组数": ex['sets'],
                    "每组数量/时长": rep_info
                })
            formatted[type_name] = table
        
        return formatted
