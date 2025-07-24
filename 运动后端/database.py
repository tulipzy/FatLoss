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
        """建立数据库连接"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                database=self.database,
                user=self.user,
                password=self.password
            )
            return self.connection.is_connected()
        except Error as e:
            print(f"数据库连接错误: {e}")
            return False
            
    def get_exercises_by_type(self, type_id):
        """根据运动类型获取运动列表，包含duration_type字段"""
        if not self.connection or not self.connection.is_connected():
            if not self.connect():
                return []
                
        try:
            cursor = self.connection.cursor(dictionary=True)
            query = """
            SELECT exercise_id, exercise_name, type, met, 
                   calories_burned_per_ten_minutes, duration_type
            FROM exercise_dict 
            WHERE type = %s
            """
            cursor.execute(query, (type_id,))
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
    