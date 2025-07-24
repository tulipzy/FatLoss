import mysql.connector
from mysql.connector import Error

class ExerciseDatabase:
    def __init__(self, host, database, user, password):
        self.host = host
        self.database = database
        self.user = user
        self.password = password
        self.connection = None
        
    def connect(self):
        """连接到MySQL数据库"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password,
                charset='utf8mb4'
            )
            if self.connection.is_connected():
                return True
        except Error as e:
            print(f"数据库连接错误: {e}")
            return False
    
    def get_exercises_by_type(self, exercise_type):
        """根据运动类型获取运动列表"""
        if not self.connection or not self.connection.is_connected():
            if not self.connect():
                return []
                
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
            SELECT exercise_id, exercise_name, type, calories_burned_per_ten_minutes, met 
            FROM exercise_dict 
            WHERE type = %s
            """
            cursor.execute(query, (exercise_type,))
            return cursor.fetchall()
        except Error as e:
            print(f"查询错误: {e}")
            return []
        finally:
            if 'cursor' in locals():
                cursor.close()
    
    def close(self):
        """关闭数据库连接"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
