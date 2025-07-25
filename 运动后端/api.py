from flask import Flask, request, jsonify
from flask_cors import CORS
from database import ExerciseDatabase
from recommender import ExerciseRecommender
import json

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 数据库配置
DB_CONFIG = {
    "host": "localhost",
    "database": "exercise",
    "user": "root",
    "password": "123456"
}

@app.route('/api/recommend', methods=['POST'])
def recommend_exercises():
    """接收用户数据，返回运动推荐结果"""
    try:
        # 获取JSON数据
        user_data = request.get_json()
        if not user_data:
            return jsonify({"error": "Invalid input data"}), 400

        # 验证用户输入
        required_fields = ["gender", "age", "height", "current_weight", "target_weight", "intensity"]
        for field in required_fields:
            if field not in user_data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # 验证性别
        if user_data["gender"] not in ["male", "female"]:
            return jsonify({"error": "Gender must be 'male' or 'female'"}), 400

        # 验证年龄
        try:
            age = int(user_data["age"])
            if age <= 0 or age > 120:
                return jsonify({"error": "Age must be between 1 and 120"}), 400
        except ValueError:
            return jsonify({"error": "Age must be an integer"}), 400

        # 验证身高
        try:
            height = int(user_data["height"])
            if height <= 50 or height > 250:
                return jsonify({"error": "Height must be between 50 and 250 cm"}), 400
        except ValueError:
            return jsonify({"error": "Height must be an integer"}), 400

        # 验证体重
        try:
            current_weight = float(user_data["current_weight"])
            if current_weight <= 10 or current_weight > 300:
                return jsonify({"error": "Current weight must be between 10 and 300 kg"}), 400
        except ValueError:
            return jsonify({"error": "Current weight must be a number"}), 400

        try:
            target_weight = float(user_data["target_weight"])
            if target_weight <= 10 or target_weight > 300 or target_weight >= current_weight * 1.5:
                return jsonify({"error": "Target weight must be between 10 and 300 kg and not more than 1.5x current weight"}), 400
        except ValueError:
            return jsonify({"error": "Target weight must be a number"}), 400

        # 验证训练强度
        if user_data["intensity"] not in ["low", "medium", "high"]:
            return jsonify({"error": "Intensity must be 'low', 'medium', or 'high'"}), 400

        # 根据训练强度计算推荐周期（周）
        intensity_weeks_map = {
            "low": 12,
            "medium": 8,
            "high": 6
        }
        user_data["weeks"] = intensity_weeks_map[user_data["intensity"]]

        # 初始化数据库连接
        db = ExerciseDatabase(**DB_CONFIG)
        if not db.connect():
            return jsonify({"error": "Database connection failed"}), 500

        # 初始化推荐器
        recommender = ExerciseRecommender(db)

        # 获取推荐结果
        recommendations = recommender.recommend_exercises(user_data)
        formatted_result = recommender.format_recommendations(recommendations)

        # 关闭数据库连接
        db.close()

        # 返回JSON结果
        return jsonify({
            "status": "success",
            "recommendations": formatted_result,
            "recommended_weeks": user_data.get("weeks", 0)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)