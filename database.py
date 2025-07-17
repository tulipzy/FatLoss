import mysql.connector
from config import DB_CONFIG


def get_db_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except mysql.connector.Error as e:
        print(f"数据库连接失败: {e}")
        return None


def get_foods_by_criteria(min_cal, max_cal, categories=None):
    conn = get_db_connection()
    if not conn:
        return []

    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT food_name, category_id, calories_per_100g, 
           protein_per_100g, fat_per_100g, carbohydrate_per_100g 
    FROM foods 
    WHERE calories_per_100g BETWEEN %s AND %s
    """
    params = [min_cal, max_cal]

    if categories:
        query += " AND category_id IN (%s)" % ",".join(["%s"] * len(categories))
        params.extend(categories)

    try:
        cursor.execute(query, params)
        return cursor.fetchall()
    except mysql.connector.Error as e:
        print(f"数据库查询失败: {e}")
        return []
    finally:
        cursor.close()
        conn.close()