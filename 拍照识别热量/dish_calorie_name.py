from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import requests
import logging
import io
import cv2
import numpy as np
import os
from datetime import datetime
from PIL import Image
import mediapipe as mp
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# 模糊查询依赖
from fuzzywuzzy import fuzz
import jieba

# ------------------ 日志配置 ------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("calorie-api")

# ------------------ 目录准备 ------------------
os.makedirs("original_images", exist_ok=True)
os.makedirs("hand_removed_images", exist_ok=True)

# ------------------ 数据库配置 ------------------
MYSQL_CONFIG = {
    "user": "root",
    "password": "123456",
    "host": "localhost",
    "port": 3307,
    "database": "calorie"
}
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{MYSQL_CONFIG['user']}:{MYSQL_CONFIG['password']}@{MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}/{MYSQL_CONFIG['database']}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_size=10, max_overflow=20, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ------------------ 表模型 ------------------
class FoodNutrition(Base):
    __tablename__ = "dish_calorie_simple"
    id = Column(Integer, primary_key=True, index=True)
    dish_name = Column(String(255), unique=True, index=True, nullable=False)
    kcal_per100g = Column(Float, nullable=False)


# 初始化表结构（仅在表不存在时创建，不删除已有表）
Base.metadata.create_all(bind=engine)

# ------------------ FastAPI 初始化 ------------------
app = FastAPI(title="卡路里计算 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ 获取数据库会话 ------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------ 模糊匹配函数 ------------------
def normalize_dish_name(name: str) -> str:
    name = name.lower().strip()
    replacements = {
        "番茄": "西红柿", "鸡蛋": "蛋", "炒鸡蛋": "炒蛋",
        "·": "", " ": "", "_": "", "-": "", "，": "", "。": ""
    }
    for k, v in replacements.items():
        name = name.replace(k, v)
    return name


def segment_words(text: str) -> str:
    return ' '.join(jieba.cut(text))


def get_nutrition_data(dish_name: str, db: Session):
    norm_input = normalize_dish_name(dish_name)
    input_seg = segment_words(norm_input)

    all_dishes = db.query(FoodNutrition).all()
    best_match = None
    highest_score = 0

    for item in all_dishes:
        db_name_norm = normalize_dish_name(item.dish_name)
        db_name_seg = segment_words(db_name_norm)
        score = fuzz.token_set_ratio(input_seg, db_name_seg)

        if score > highest_score:
            highest_score = score
            best_match = item

        if db_name_norm == norm_input:
            return item

    if highest_score >= 70:
        return best_match
    return None


# ------------------ Mediapipe 手部检测 ------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.5
)


# ------------------ 工具函数 ------------------
def process_image(image_bytes: bytes) -> tuple[bytes, str]:
    try:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_path = f"original_images/original_{ts}.jpg"
        with open(original_path, "wb") as f:
            f.write(image_bytes)

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        h, w = img_bgr.shape[:2]

        results = hands.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                key_pts = [(int(lm.x * w), int(lm.y * h)) for lm in hand_landmarks.landmark]
                if len(key_pts) >= 3:
                    hull = cv2.convexHull(np.array(key_pts, dtype=np.int32))
                    hull = hull.squeeze() if len(hull.shape) == 3 else hull
                    kernel = np.ones((1, 1), np.uint8)
                    hull_expanded = cv2.dilate(hull.astype(np.uint8), kernel, iterations=1)
                    cv2.fillPoly(img_bgr, [hull_expanded.astype(np.int32)], (0, 0, 0))

        processed_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        processed_path = f"hand_removed_images/processed_{ts}.jpg"
        cv2.imwrite(processed_path, cv2.cvtColor(processed_rgb, cv2.COLOR_RGB2BGR))

        buffer = io.BytesIO()
        Image.fromarray(processed_rgb).save(buffer, format="JPEG", quality=100)
        processed_bytes = buffer.getvalue()

        try:
            Image.open(io.BytesIO(processed_bytes)).verify()
        except:
            logger.error("处理后的图片损坏，使用原始图替代")
            processed_bytes = image_bytes

        return processed_bytes, processed_path

    except Exception as e:
        logger.error(f"图片处理失败: {e}，使用原始图")
        return image_bytes, f"error_{ts}.jpg"


def estimate_density(dish_name: str, dish_type: str) -> float:
    if dish_type in ["汤", "粥"]:
        return 1.0
    elif dish_type in ["肉类", "主食"]:
        return 0.9
    else:
        return 0.85


def estimate_kcal(dish_name: str, db: Session) -> float:
    db_data = get_nutrition_data(dish_name, db)
    if db_data:
        return db_data.kcal_per100g
    return 100.0


def call_volume_service(img_bytes: bytes, hand_length_cm: float) -> float:
    try:
        files = {"file": ("dish.jpg", img_bytes, "image/jpeg")}
        data = {"hand_length_cm": str(hand_length_cm)}
        resp = requests.post("http://127.0.0.1:8000/predict", files=files, data=data, timeout=60)
        resp.raise_for_status()
        return float(resp.json()["volume_cm3"])
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"体积服务调用失败: {str(e)}")


# ------------------ 主接口：计算卡路里 ------------------
@app.post("/api/calculate")
async def calorie_predict(
        file: UploadFile = File(...),
        hand_length_cm: float = Form(...),
        dish_type: str = Form(...),
        dish_name: str = Form(...),
        db: Session = Depends(get_db)
):
    try:
        # 1. 严格参数校验
        img_bytes = await file.read()
        if not img_bytes:
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": "参数错误：上传的图片文件为空，请重新上传",
                "data": None
            })
        if hand_length_cm <= 0:
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": f"参数错误：手掌长度（{hand_length_cm}cm）必须为正数",
                "data": None
            })
        if not dish_type.strip():
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": "参数错误：食物类型不能为空",
                "data": None
            })
        if not dish_name.strip():
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": "参数错误：食物名称不能为空",
                "data": None
            })

        # 2. 图片处理
        processed_img_bytes, processed_path = process_image(img_bytes)

        # 3. 检查食物是否存在
        nutrition_data = get_nutrition_data(dish_name, db)
        if not nutrition_data:
            return JSONResponse({
                "success": False,
                "code": 404,
                "message": f"未找到 '{dish_name}' 的信息，请重新输入或通过 /api/add_dish 接口添加",
                "data": None
            })

        # 4. 计算卡路里
        volume_cm3 = call_volume_service(processed_img_bytes, hand_length_cm)
        density = estimate_density(dish_name, dish_type)
        kcal_per100g = nutrition_data.kcal_per100g

        weight_g = round(volume_cm3 * density, 1)
        total_kcal = round((weight_g / 100) * kcal_per100g, 1)

        return JSONResponse({
            "success": True,
            "code": 200,
            "message": "卡路里计算成功",
            "data": {
                "dish_name": dish_name,
                "dish_type": dish_type,
                "hand_length_cm": hand_length_cm,
                "volume_cm3": round(volume_cm3, 1),
                "density_g_cm3": round(density, 2),
                "weight_g": weight_g,
                "kcal_per100g": round(kcal_per100g, 1),
                "total_kcal": total_kcal,
                "processed_image_path": processed_path
            }
        })
    except HTTPException as e:
        return JSONResponse({
            "success": False,
            "code": e.status_code,
            "message": e.detail
        })
    except Exception as e:
        logger.error(f"计算接口异常: {e}")
        return JSONResponse({
            "success": False,
            "code": 500,
            "message": f"服务器内部错误：{str(e)}"
        })


# ------------------ 查询接口：查询食物卡路里 ------------------
@app.post("/api/query_dish")
async def query_dish(
        dish_name: str = Form(...),
        db: Session = Depends(get_db)
):
    try:
        if not dish_name.strip():
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": "参数错误：食物名称不能为空",
                "data": None
            })

        nutrition_data = get_nutrition_data(dish_name, db)
        if nutrition_data:
            return JSONResponse({
                "success": True,
                "code": 200,
                "message": f"找到 '{nutrition_data.dish_name}' 的信息",
                "data": {
                    "dish_name": nutrition_data.dish_name,
                    "kcal_per100g": nutrition_data.kcal_per100g
                }
            })
        else:
            return JSONResponse({
                "success": False,
                "code": 404,
                "message": f"未找到 '{dish_name}' 的信息，请重新输入或通过 /api/add_dish 接口添加",
                "data": None
            })
    except Exception as e:
        logger.error(f"查询接口异常: {e}")
        return JSONResponse({
            "success": False,
            "code": 500,
            "message": f"查询失败：{str(e)}"
        })


# ------------------ 新增接口：添加食物信息 ------------------
@app.post("/api/add_dish")
async def add_dish(
        dish_name: str = Form(..., description="食物名称"),
        kcal_per100g: float = Form(..., description="每100克卡路里（正数）"),
        db: Session = Depends(get_db)
):
    try:
        normalized_name = normalize_dish_name(dish_name)
        if not normalized_name:
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": "参数错误：食物名称不能为空（去除特殊字符后为空）",
                "data": None
            })
        if kcal_per100g <= 0:
            return JSONResponse({
                "success": False,
                "code": 400,
                "message": f"参数错误：每100克卡路里（{kcal_per100g}）必须为正数",
                "data": None
            })

        all_dishes = db.query(FoodNutrition).all()
        existing = None
        for dish in all_dishes:
            if normalize_dish_name(dish.dish_name) == normalized_name:
                existing = dish
                break

        if existing:
            return JSONResponse({
                "success": False,
                "code": 409,
                "message": f"资源冲突：食物 '{dish_name}' 已存在（当前记录：{existing.dish_name}，{existing.kcal_per100g}kcal/100g）",
                "data": None
            })

        new_dish = FoodNutrition(
            dish_name=dish_name.strip(),
            kcal_per100g=round(kcal_per100g, 1)
        )
        db.add(new_dish)
        db.commit()
        db.refresh(new_dish)

        return JSONResponse({
            "success": True,
            "code": 200,
            "message": f"食物 '{dish_name}' 已成功添加",
            "data": {
                "dish_name": new_dish.dish_name,
                "kcal_per100g": new_dish.kcal_per100g
            }
        })
    except Exception as e:
        logger.error(f"添加接口异常: {e}")
        return JSONResponse({
            "success": False,
            "code": 500,
            "message": f"添加失败：{str(e)}"
        })


# ------------------ 启动事件：仅初始化表结构（不删除已有表） ------------------
@app.on_event("startup")
def startup_event():
    # 仅创建不存在的表，不删除已有表和数据
    Base.metadata.create_all(bind=engine)
    logger.info("数据库表结构已初始化（保留已有数据）")


# ------------------ 启动服务 ------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")