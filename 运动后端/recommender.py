class ExerciseRecommender:
    def __init__(self, db):
        self.db = db
        
    def calculate_bmi(self, height, weight):
        """计算BMI指数"""
        height_m = height / 100  # 转换为米
        return weight / (height_m ** 2)
        
    def calculate_calorie_needs(self, user_info):
        """估算每日卡路里需求"""
        gender = user_info["gender"]
        age = user_info["age"]
        weight = user_info["current_weight"]
        height = user_info["height"]
        
        # 使用Mifflin-St Jeor公式估算基础代谢率(BMR)
        if gender == "男":
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:  # 女
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
            
        # 根据活动水平调整，这里使用中等活动水平系数
        activity_factor = 1.55
        return bmr * activity_factor
        
    def calculate_weight_loss_goal(self, user_info):
        """计算每周需要减少的体重"""
        current = user_info["current_weight"]
        target = user_info["target_weight"]
        weeks = user_info["weeks"]
        
        if current <= target:
            return 0  # 不需要减重
        return (current - target) / weeks
        
    def get_intensity_multiplier(self, intensity):
        """根据训练强度返回相应的乘数"""
        multipliers = {
            "low": 0.7,
            "medium": 1.0,
            "high": 1.3
        }
        return multipliers.get(intensity, 1.0)
        
    def get_age_adjustment(self, age):
        """根据年龄调整运动强度"""
        if age < 30:
            return 1.2  # 年轻人可以承受更大强度
        elif age < 50:
            return 1.0  # 中年人正常强度
        else:
            return 0.8  # 老年人降低强度
            
    def recommend_exercises(self, user_info):
        """
        基于用户信息推荐运动
        返回包含三类运动(居家、户外、健身房)的推荐结果
        """
        # 计算推荐依据的关键指标
        bmi = self.calculate_bmi(user_info["height"], user_info["current_weight"])
        calorie_needs = self.calculate_calorie_needs(user_info)
        weekly_weight_loss = self.calculate_weight_loss_goal(user_info)
        intensity_multiplier = self.get_intensity_multiplier(user_info["intensity"])
        age_adjustment = self.get_age_adjustment(user_info["age"])
        
        # 综合调整因子
        adjustment_factor = intensity_multiplier * age_adjustment
        
        # 为三类运动分别推荐
        recommendations = {
            "居家": self.recommend_for_type(1, adjustment_factor, bmi),
            "户外": self.recommend_for_type(2, adjustment_factor, bmi),
            "健身房": self.recommend_for_type(3, adjustment_factor, bmi)
        }
        
        return recommendations
        
    def recommend_for_type(self, type_id, adjustment_factor, bmi):
        """为特定类型的运动生成推荐"""
        # 从数据库获取该类型的所有运动
        exercises = self.db.get_exercises_by_type(type_id)
        if not exercises:
            return []
            
        # 根据MET值排序，选择最适合的运动
        # MET值越高，单位时间消耗的卡路里越多
        exercises_sorted = sorted(exercises, key=lambda x: x["met"], reverse=True)
        
        # 选择前5-8个运动，然后根据调整因子设置每组数量/时长和组数
        recommended = []
        for exercise in exercises_sorted[:8]:  # 取前8个，确保有足够选择
            # 根据持续类型设置每组数量或时长
            if exercise["duration_type"] == 1:  # 按次数计算
                # 基础次数，根据调整因子调整
                base_reps = 12 if bmi < 25 else 10  # BMI较低的人可以做更多次数
                reps_per_set = int(base_reps * adjustment_factor)
                reps_per_set = max(5, min(20, reps_per_set))  # 限制在5-20次之间
                
                # 设置组数
                sets = 3 if adjustment_factor < 1.0 else 4
                
                recommended.append({
                    "exercise_id": exercise["exercise_id"],
                    "exercise_name": exercise["exercise_name"],
                    "type": exercise["type"],
                    "sets": sets,
                    "reps_or_duration": reps_per_set,
                    "duration_type": 1
                })
            else:  # 按时间计算 (duration_type == 2)
                # 基础时间(分钟)，根据调整因子调整
                base_minutes = 10 if bmi < 25 else 8  # BMI较低的人可以做更长时间
                minutes_per_set = int(base_minutes * adjustment_factor)
                minutes_per_set = max(5, min(20, minutes_per_set))  # 限制在5-20分钟之间
                
                # 设置组数
                sets = 2 if adjustment_factor < 1.0 else 3
                
                recommended.append({
                    "exercise_id": exercise["exercise_id"],
                    "exercise_name": exercise["exercise_name"],
                    "type": exercise["type"],
                    "sets": sets,
                    "reps_or_duration": minutes_per_set,
                    "duration_type": 2
                })
                
            # 确保我们最终有至少5个推荐
            if len(recommended) >= 5:
                break
                
        return recommended
        
    def format_recommendations(self, recommendations):
        """格式化推荐结果以便展示"""
        formatted = {}
        
        for category, exercises in recommendations.items():
            formatted_exercises = []
            for ex in exercises:
                # 根据持续类型显示不同的单位
                if ex["duration_type"] == 1:
                    reps_or_duration = f"{ex['reps_or_duration']} reps"
                else:
                    reps_or_duration = f"{ex['reps_or_duration']} minutes"
                
                formatted_exercises.append({
                    "exercise_id": ex["exercise_id"],
                    "exercise_name": ex["exercise_name"],
                    "category": category,
                    "sets": ex["sets"],
                    "reps_or_duration": reps_or_duration
                })
            formatted[category] = formatted_exercises
            
        return formatted
    