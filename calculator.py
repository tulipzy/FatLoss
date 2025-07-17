def calculate_bmr(sex: str, age: int, height: int, weight: float) -> float:
    """使用Mifflin-St Jeor公式计算基础代谢率"""
    if sex.lower() == 'male':
        return 10 * weight + 6.25 * height - 5 * age + 5
    else:
        return 10 * weight + 6.25 * height - 5 * age - 161


def calculate_daily_intake(bmr: float, activity_factor: float,
                           current_weight: float, target_weight: float, weeks: int, sex: str) -> float:
    """计算每日目标热量（含减脂缺口）"""
    tdee = bmr * activity_factor  


    weight_loss = current_weight - target_weight
    if weight_loss <= 0:
        return tdee

    total_deficit = weight_loss * 7700
    daily_deficit = total_deficit / (weeks * 7)
    daily_deficit = min(daily_deficit, 500)

    
    min_intake = 1500 if sex.lower() == 'male' else 1200
    daily_intake = tdee - daily_deficit
    return max(daily_intake, min_intake)