from database import get_foods_by_criteria


def plan_single_meal(target_cal: int, categories: list) -> tuple:
    meals = []
    remaining = target_cal

    for cat in categories:
        if remaining <= 10:
            break

        foods = get_foods_by_criteria(10, remaining * 2, [cat])
        if not foods:
            continue

        for food in foods:
            cal_per_100 = food['calories_per_100g']
            if cal_per_100 == 0:
                continue

            # 计算合理重量（30-200g）
            weight = (remaining / cal_per_100) * 100
            weight = max(30.0, min(weight, 200.0))
            actual_cal = (weight / 100) * cal_per_100

            meals.append({
                'name': food['food_name'],
                'cal_100g': cal_per_100,
                'weight_g': round(weight, 1),
                'actual_cal': round(actual_cal, 1)
            })
            remaining -= actual_cal

            if remaining <= 10:
                break

    total = sum(f['actual_cal'] for f in meals)
    return meals, round(total, 1)


def plan_daily_meals(daily_cal: float, sex: str) -> dict:
    breakfast_cal = int(daily_cal * 0.3)
    lunch_cal = int(daily_cal * 0.4)
    dinner_cal = int(daily_cal * 0.3)

    
    breakfast_cats = [3, 2, 4]  # 谷物、水果、蛋白质
    lunch_cats = [4, 1, 3]  # 蛋白质、蔬菜、谷物
    dinner_cats = [4, 1, 5]  # 蛋白质、蔬菜、脂肪

    return {
        'breakfast': plan_single_meal(breakfast_cal, breakfast_cats),
        'lunch': plan_single_meal(lunch_cal, lunch_cats),
        'dinner': plan_single_meal(dinner_cal, dinner_cats)
    }