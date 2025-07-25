import sys
from database import ExerciseDatabase
from recommender import ExerciseRecommender

def get_user_input():
    """获取用户输入信息"""
    print("欢迎使用运动推荐系统！请输入以下信息，我们将为您推荐合适的运动计划。")
    
    try:
        gender = input("请输入您的性别(男/女): ").strip()
        while gender not in ["男", "女"]:
            gender = input("请输入正确的性别(男/女): ").strip()
            
        age = int(input("请输入您的年龄: ").strip())
        while age <= 0 or age > 120:
            age = int(input("请输入合理的年龄: ").strip())
            
        height = int(input("请输入您的身高(厘米): ").strip())
        while height <= 50 or height > 250:
            height = int(input("请输入合理的身高(厘米): ").strip())
            
        current_weight = float(input("请输入您当前的体重(公斤): ").strip())
        while current_weight <= 10 or current_weight > 300:
            current_weight = float(input("请输入合理的体重(公斤): ").strip())
            
        target_weight = float(input("请输入您的预期体重(公斤): ").strip())
        while target_weight <= 10 or target_weight > 300 or target_weight >= current_weight * 1.5:
            target_weight = float(input("请输入合理的预期体重(公斤): ").strip())
            
        intensity = input("请输入您希望的训练强度(低/中/高): ").strip()
        while intensity not in ["低", "中", "高"]:
            intensity = input("请输入正确的训练强度(低/中/高): ").strip()
            
        # 根据训练强度计算推荐周期（周）
        intensity_weeks_map = {
            "低": 12,
            "中": 8,
            "高": 6
        }
        weeks = intensity_weeks_map[intensity]
            
        return {
            "gender": gender,
            "age": age,
            "height": height,
            "current_weight": current_weight,
            "target_weight": target_weight,
            "intensity": intensity,
            "weeks": weeks
        }
        
    except ValueError:
        print("输入格式错误，请重新运行程序并输入正确的数值。")
        sys.exit(1)

def print_table(title, data):
    """打印格式化的列表"""
    print(f"\n{title}运动推荐:")
    for i, item in enumerate(data, 1):
        print(f"{i}. 运动名称：{item['运动名称']}，组数：{item['组数']}，每组数量/时长：{item['每组数量/时长']}")

def main():
    # 数据库连接信息 - 请根据实际情况修改
    db_config = {
        "host": "localhost",
        "database": "exercise",
        "user": "root",
        "password": "123456"
    }
    
    # 初始化数据库连接
    db = ExerciseDatabase(** db_config)
    if not db.connect():
        print("无法连接到数据库，程序退出。")
        return
    
    # 获取用户输入
    user_info = get_user_input()
    
    # 初始化推荐器并获取推荐
    recommender = ExerciseRecommender(db)
    recommendations = recommender.recommend_exercises(user_info)
    formatted_recommendations = recommender.format_recommendations(recommendations)
    
    # 输出推荐结果
    for type_name, table_data in formatted_recommendations.items():
        print_table(type_name, table_data)
    
    # 显示推荐周期
    print(f"\n根据您选择的训练强度，推荐的减肥周期为: {user_info['weeks']}周")
    
    # 关闭数据库连接
    db.close()

if __name__ == "__main__":
    main()
    