from flask import Flask, request, jsonify
from flask_cors import CORS
import main  

app = Flask(__name__)
CORS(app) 

# 数据验证函数，确保前端传入的数据符合要求
def validate_data(data):
    errors = []
    required_fields = ["sex", "age", "height", "weight", "target_weight", "weeks", "activity"]
    
    # 检查必填字段
    for field in required_fields:
        if field not in data:
            errors.append(f"缺少必要参数: {field}")
    
    # 验证数据格式和范围
    if "sex" in data and data["sex"].lower() not in ["male", "female"]:
        errors.append("性别必须是 'male' 或 'female'")
    
    if "age" in data:
        try:
            if int(data["age"]) <= 0:
                errors.append("年龄必须大于0")
        except (ValueError, TypeError):
            errors.append("年龄必须是有效的整数")
    
    # 其他字段验证...
    return errors

@app.route('/api/get_meal_plan', methods=['POST'])
def get_meal_plan():
    # 获取前端发送的JSON数据
    frontend_data = request.get_json()
    
    if not frontend_data:
        return jsonify({"error": "请提供JSON格式的数据"}), 400
    
    # 验证数据
    errors = validate_data(frontend_data)
    if errors:
        return jsonify({"errors": errors}), 400
    
    try:
        # 转换数据类型并调用main文件中的核心函数
        result = main.process_user_data(
            sex=frontend_data["sex"].lower(),
            age=int(frontend_data["age"]),
            height=int(frontend_data["height"]),
            weight=float(frontend_data["weight"]),
            target_weight=float(frontend_data["target_weight"]),
            weeks=int(frontend_data["weeks"]),
            activity=frontend_data["activity"].lower()
        )
        
        # 返回处理结果给前端
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": f"处理失败: {str(e)}"}), 500

if __name__ == '__main__':
    # 启动服务，默认端口5000
    app.run(debug=True, host='0.0.0.0')
