from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import requests
import logging
import io
import cv2
import numpy as np
import re
import os
import base64
from datetime import datetime
from PIL import Image
import mediapipe as mp
from aip import AipImageClassify
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# ------------------ 配置 ------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("calorie_api")

# 创建图片保存目录
os.makedirs("hand_removed_images", exist_ok=True)
os.makedirs("original_images", exist_ok=True)
os.makedirs("baidu_api_input", exist_ok=True)
os.makedirs("food_masks", exist_ok=True)
os.makedirs("volume_overlays", exist_ok=True)

# ------------------ 数据库配置（适配现有数据库） ------------------
# 请替换为您的实际数据库连接地址
SQLALCHEMY_DATABASE_URL = "sqlite:///./food_nutrition.db"  # 示例：SQLite
# MySQL示例："mysql+pymysql://user:password@localhost:3306/dbname"
# PostgreSQL示例："postgresql://user:password@localhost:5432/dbname"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# 数据库模型（需与现有表结构完全一致）
class FoodNutrition(Base):
    __tablename__ = "food_nutrition"  # 表名必须匹配现有数据库

    id = Column(Integer, primary_key=True, index=True)
    food_name = Column(String, unique=True, index=True, nullable=False)  # 食品名称（唯一）
    density = Column(Float, nullable=False)  # 密度（g/cm³）
    kcal_per100g = Column(Float, nullable=False)  # 每100克卡路里


# 获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------ FastAPI 初始化 ------------------
app = FastAPI(title="Calorie API with Existing Database")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议改为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ 百度API配置 ------------------
APP_ID = "6980904"
API_KEY = "hMdroCFo4A4Wm2Yz1w0FtW2L"
SECRET_KEY = "5SckesBtVaCJfSdNOmxvYe9fkiYFUQcd"
BAIDU = AipImageClassify(APP_ID, API_KEY, SECRET_KEY)
BAIDU_PARAMS = {"top_num": 5, "filter_threshold": 0.5}

# ------------------ 体积服务地址（修正报错URL） ------------------
VOLUME_URL = "http://127.0.0.1:8000/predict"  # 若体积服务端口不同，请修改

# ------------------ Mediapipe 手部检测 ------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.5
)


# ------------------ 全局异常处理器 ------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": exc.status_code,
            "message": exc.detail,
        }
    )


# ------------------ 图片处理函数 ------------------
def process_images(image_bytes: bytes) -> tuple[bytes, bytes, str]:
    """处理图片：去除手部并保存"""
    try:
        # 保存原始图片
        original_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_save_path = f"original_images/{original_ts}.jpg"
        with open(original_save_path, "wb") as f:
            f.write(image_bytes)

        # 转换图片格式
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        h, w = img_bgr.shape[:2]

        # 手部检测与涂黑
        results = hands.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                key_pts = [
                    (int(lm.x * w), int(lm.y * h))
                    for i, lm in enumerate(hand_landmarks.landmark)
                    if i in [0, 5, 9, 13, 17]
                ]
                if len(key_pts) >= 3:
                    hull = cv2.convexHull(np.array(key_pts, dtype=np.int32))
                    if len(hull.shape) == 3:
                        hull = hull.squeeze()
                    kernel = np.ones((1, 1), np.uint8)
                    hull_expanded = cv2.dilate(hull.astype(np.uint8), kernel, iterations=1)
                    cv2.fillPoly(img_bgr, [hull_expanded.astype(np.int32)], (0, 0, 0))

        # 保存处理后的图片
        processed_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        baidu_save_path = f"hand_removed_images/baidu_{original_ts}.jpg"
        cv2.imwrite(baidu_save_path, cv2.cvtColor(processed_rgb, cv2.COLOR_RGB2BGR))
        logger.info(f"百度API输入图已保存：{baidu_save_path}")

        # 转换为字节流
        buffer = io.BytesIO()
        Image.fromarray(processed_rgb).save(buffer, format="JPEG", quality=100)
        baidu_img_bytes = buffer.getvalue()

        # 验证图片完整性
        try:
            Image.open(io.BytesIO(baidu_img_bytes)).verify()
        except:
            logger.error("处理后的图片损坏，使用原始图替代")
            baidu_img_bytes = image_bytes

        return baidu_img_bytes, image_bytes, baidu_save_path

    except Exception as e:
        logger.error(f"图片处理失败: {e}，使用原始图")
        return image_bytes, image_bytes, f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"


# ------------------ 工具函数 ------------------
def estimate_density(name: str) -> float:
    """当数据库无数据时，通过规则估算密度"""
    soup = ["汤", "羹", "煲", "粥"]
    high = ["红烧", "炖", "卤", "炸", "烤"]
    tofu = ["豆腐", "豆干", "腐竹"]
    vege = ["炒", "青椒", "土豆", "黄瓜", "西兰花", "菠菜"]
    main = ["饭", "面", "粥", "粉"]
    juice = ["果汁", "饮料", "奶茶", "奶"]
    water = ["水", "矿泉水", "纯净水"]

    if any(k in name for k in soup):  return 0.60
    if any(k in name for k in water): return 1.00
    if any(k in name for k in juice): return 0.95
    if any(k in name for k in high):  return 1.00
    if any(k in name for k in tofu):  return 0.90
    if any(k in name for k in vege):  return 0.85 if "茄子" in name else 0.80
    if any(k in name for k in main):  return 0.83
    return 0.85


def safe_float_convert(s: str) -> float or None:
    """安全转换字符串为浮点数"""
    if not s:
        return None
    match = re.search(r'[-+]?\d*\.\d+|\d+', s)
    return float(match.group()) if match else None


def baidu_dishname_calorie(img_bytes: bytes):
    """调用百度API识别菜品和热量"""
    try:
        with open("baidu_api_input/latest_api_input.jpg", "wb") as f:
            f.write(img_bytes)
        res = BAIDU.dishDetect(img_bytes, BAIDU_PARAMS)
        logger.info(f"百度API响应：{res}")

        if not res or not res.get("result"):
            return None, None

        for item in res["result"]:
            dish_name = item.get("name", "")
            calorie_str = str(item.get("calorie", ""))
            kcal_100g = safe_float_convert(calorie_str)
            if kcal_100g and dish_name:
                return dish_name, kcal_100g

        return None, None
    except Exception as e:
        logger.error(f"百度API调用失败: {e}")
        return None, None


# ------------------ 体积服务调用 ------------------
def call_volume_service(img_bytes: bytes, hand_length_cm: float) -> tuple:
    """调用体积服务获取体积数据"""
    try:
        files = {"file": ("dish_original.jpg", img_bytes, "image/jpeg")}
        data = {"hand_length_cm": str(hand_length_cm)}
        resp = requests.post(VOLUME_URL, files=files, data=data, timeout=60)
        resp.raise_for_status()
        js = resp.json()

        volume_cm3 = float(js["volume_cm3"])
        food_mask_path = None
        volume_overlay_path = None

        # 处理食物mask
        if "food_mask_base64" in js:
            try:
                mask_data = base64.b64decode(js["food_mask_base64"])
                food_mask_path = f"food_masks/{datetime.now().strftime('%Y%m%d_%H%M%S')}_mask.png"
                with open(food_mask_path, "wb") as f:
                    f.write(mask_data)
            except Exception as e:
                logger.error(f"保存mask失败: {e}")

        # 处理体积覆盖图
        if "overlay_base64" in js:
            try:
                overlay_data = base64.b64decode(js["overlay_base64"])
                volume_overlay_path = f"volume_overlays/{datetime.now().strftime('%Y%m%d_%H%M%S')}_overlay.jpg"
                with open(volume_overlay_path, "wb") as f:
                    f.write(overlay_data)
            except Exception as e:
                logger.error(f"保存覆盖图失败: {e}")

        return volume_cm3, food_mask_path, volume_overlay_path

    except requests.exceptions.RequestException as e:
        logger.error(f"体积服务调用失败: {e}")
        raise HTTPException(status_code=500, detail=f"体积服务错误: {str(e)}")
    except Exception as e:
        logger.error(f"体积服务响应处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"体积计算失败: {str(e)}")


# ------------------ 主接口 ------------------
@app.post("/api/predict")
async def calorie_predict(
        file: UploadFile = File(...),
        hand_length_cm: float = Form(..., ge=15.0, le=25.0),
        manual_food_name: str = Form(None),  # 手动指定食品名称（识别失败时用）
        db: Session = Depends(get_db)
):
    """主接口：支持自动识别+数据库查询，或手动输入+数据库查询"""
    try:
        img_bytes = await file.read()
        if not img_bytes:
            raise HTTPException(status_code=400, detail="文件为空")

        # 1. 图片处理
        baidu_img, volume_img, black_hand_path = process_images(img_bytes)

        # 2. 识别逻辑：优先使用手动输入，否则调用百度API
        if manual_food_name:
            dish_name = manual_food_name
            # 从数据库查询热量
            db_data = db.query(FoodNutrition).filter(FoodNutrition.food_name == dish_name).first()
            if not db_data:
                raise HTTPException(status_code=404, detail=f"数据库中未找到「{dish_name}」的营养数据")
            kcal_100g = db_data.kcal_per100g
            recognition_status = "使用手动输入的食品名称"
        else:
            # 自动识别
            dish_name, kcal_100g = baidu_dishname_calorie(baidu_img)
            if not dish_name or kcal_100g is None:
                raise HTTPException(status_code=400,
                                    detail=f"菜品识别失败，请检查图片或手动指定食品名称：{black_hand_path}")
            recognition_status = "自动识别成功"

        # 3. 体积计算
        volume_cm3, food_mask_path, volume_overlay_path = call_volume_service(volume_img, hand_length_cm)

        # 4. 密度获取：优先用数据库，否则估算
        db_data = db.query(FoodNutrition).filter(FoodNutrition.food_name == dish_name).first()
        density = db_data.density if db_data else estimate_density(dish_name)

        # 5. 计算结果
        weight_g = volume_cm3 * density
        total_kcal = round(weight_g / 100 * kcal_100g, 1)

        # 响应数据
        response_data = {
            "success": True,
            "code": 20000,
            "message": "成功",
            "data": {
                "items": [
                    {
                        "name": dish_name,
                        "intro": f"体积：{volume_cm3} cm³，密度：{density} g/cm³，重量：{weight_g} g，总卡路里：{total_kcal} kcal",
                        "volume_cm3": round(volume_cm3, 1),
                        "density": round(density, 2),
                        "weight_g": round(weight_g, 1),
                        "kcal_per100g": round(kcal_100g, 1),
                        "total_kcal": total_kcal,
                        "hand_removed_image_path": black_hand_path,
                        "recognition_status": recognition_status,
                        "food_mask_path": food_mask_path,
                        "volume_overlay_path": volume_overlay_path
                    }
                ]
            }
        }

        return response_data

    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={
            "success": False,
            "code": e.status_code,
            "message": e.detail
        })
    except Exception as e:
        logger.error(f"接口异常: {e}")
        return JSONResponse(status_code=500, content={
            "success": False,
            "code": 500,
            "message": f"服务器内部错误：{str(e)}"
        })


# ------------------ 图片访问接口 ------------------
@app.get("/images/{image_type}/{filename}")
async def get_image(image_type: str, filename: str):
    """访问保存的图片（如去除手部后的图片、mask等）"""
    valid_types = ["original_images", "hand_removed_images", "food_masks", "volume_overlays"]
    if image_type not in valid_types:
        raise HTTPException(status_code=400, detail="无效的图片类型")

    image_path = f"{image_type}/{filename}"
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="图片不存在")

    return FileResponse(image_path)


# ------------------ 启动服务 ------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")