import sys
from calculator import calculate_bmr, calculate_daily_intake
from meal_planner import plan_daily_meals


def get_valid_input(prompt: str, type_func, validator=lambda x: True):
    while True:
        try:
            value = type_func(input(prompt))
            if validator(value):
                return value
            print("输入格式错误，请重新输入")
        except ValueError:
            print("输入格式错误，请重新输入")


def main():
    print("\n=== 减脂餐智能规划系统 ===")

    sex = get_valid_input("性别(male/female): ", str.lower,
                          lambda x: x in ['male', 'female'])
    age = get_valid_input("年龄: ", int, lambda x: x > 0)
    height = get_valid_input("身高(cm): ", int, lambda x: x > 0)
    weight = get_valid_input("当前体重(kg): ", float, lambda x: x > 0)
    target_weight = get_valid_input("目标体重(kg): ", float,
                                    lambda x: 0 < x < weight)
    weeks = get_valid_input("预期减肥周数: ", int, lambda x: x > 0)


# 下面是强度参数
    activity_map = {
        'sedentary': 1.2, 'light': 1.375,
        'moderate': 1.55, 'very': 1.725,
        'extra': 1.9
    }
    activity = get_valid_input(
        "活动水平(sedentary/light/moderate/very/extra): ",
        str.lower, lambda x: x in activity_map
    )
    activity_factor = activity_map[activity]

    bmr = calculate_bmr(sex, age, height, weight)
    daily_cal = calculate_daily_intake(bmr, activity_factor, weight, target_weight, weeks, sex)

    print(f"\n基础代谢(BMR): {bmr:.1f} 大卡")
    print(f"每日目标热量: {daily_cal:.1f} 大卡")

    meal_plan = plan_daily_meals(daily_cal, sex)

    print("\n=== 今日推荐餐单 ===")
    for meal, (items, total) in meal_plan.items():
        print(
            f"\n▶️ {meal.capitalize()}（目标{int(daily_cal * (0.4 if meal == 'lunch' else 0.3))}大卡 | 实际{total}大卡）")
        if not items:
            print("⚠️ 无匹配食物，请检查数据库数据")
            continue
        for item in items:
            print(f"- {item['name']}: {item['weight_g']}g（{item['actual_cal']}大卡，{item['cal_100g']}大卡/100g）")


if __name__ == "__main__":
    main()