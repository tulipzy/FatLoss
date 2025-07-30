from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
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

# ------------------ FastAPI 初始化 ------------------
app = FastAPI(title="Calorie API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# ------------------ 体积服务地址 ------------------
VOLUME_URL = "http://127.0.0.1:8000/predict"

# ------------------ Mediapipe 手部检测 ------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=True,
    max_num_hands=2,
    min_detection_confidence=0.4,
    min_tracking_confidence=0.5
)


# ------------------ 图片处理函数 ------------------
def process_images(image_bytes: bytes) -> tuple[bytes, bytes, str]:
    try:
        original_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_save_path = f"original_images/{original_ts}.jpg"
        with open(original_save_path, "wb") as f:
            f.write(image_bytes)

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(image)
        img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        h, w = img_bgr.shape[:2]

        results = hands.process(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                key_pts = [(int(lm.x * w), int(lm.y * h)) for i, lm in enumerate(hand_landmarks.landmark) if i in [0,5,9,13,17]]
                if len(key_pts) >= 3:
                    hull = cv2.convexHull(np.array(key_pts, dtype=np.int32))
                    if len(hull.shape) == 3:
                        hull = hull.squeeze()
                    kernel = np.ones((1,1), np.uint8)
                    hull_expanded = cv2.dilate(hull.astype(np.uint8), kernel, iterations=1)
                    cv2.fillPoly(img_bgr, [hull_expanded.astype(np.int32)], (0,0,0))

        processed_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        baidu_save_path = f"hand_removed_images/baidu_{original_ts}.jpg"
        cv2.imwrite(baidu_save_path, cv2.cvtColor(processed_rgb, cv2.COLOR_RGB2BGR))

        buffer = io.BytesIO()
        Image.fromarray(processed_rgb).save(buffer, format="JPEG", quality=100)
        baidu_img_bytes = buffer.getvalue()

        Image.open(io.BytesIO(baidu_img_bytes)).verify()
        return baidu_img_bytes, image_bytes, baidu_save_path
    except:
        return image_bytes, image_bytes, f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"


# ------------------ 工具函数 ------------------
def estimate_density(name: str) -> float:
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
    if not s:
        return None
    match = re.search(r'[-+]?\d*\.\d+|\d+', s)
    return float(match.group()) if match else None


def baidu_dishname_calorie(img_bytes: bytes):
    try:
        with open("baidu_api_input/latest_api_input.jpg", "wb") as f:
            f.write(img_bytes)
        res = BAIDU.dishDetect(img_bytes, BAIDU_PARAMS)
        if not res or not res.get("result"):
            return None, None
        for item in res["result"]:
            dish_name = item.get("name", "")
            kcal_100g = safe_float_convert(str(item.get("calorie", "")))
            if kcal_100g and dish_name:
                return dish_name, kcal_100g
        return None, None
    except:
        return None, None


def call_volume_service(img_bytes: bytes, hand_length_cm: float) -> tuple:
    try:
        files = {"file": ("dish_original.jpg", img_bytes, "image/jpeg")}
        data = {"hand_length_cm": str(hand_length_cm)}
        resp = requests.post(VOLUME_URL, files=files, data=data, timeout=60)
        resp.raise_for_status()
        js = resp.json()
        volume_cm3 = float(js["volume_cm3"])

        food_mask_path = None
        if "food_mask_base64" in js:
            try:
                mask_data = base64.b64decode(js["food_mask_base64"])
                food_mask_path = f"food_masks/{datetime.now().strftime('%Y%m%d_%H%M%S')}_mask.png"
                with open(food_mask_path, "wb") as f:
                    f.write(mask_data)
            except:
                pass

        volume_overlay_path = None
        if "overlay_base64" in js:
            try:
                overlay_data = base64.b64decode(js["overlay_base64"])
                volume_overlay_path = f"volume_overlays/{datetime.now().strftime('%Y%m%d_%H%M%S')}_overlay.jpg"
                with open(volume_overlay_path, "wb") as f:
                    f.write(overlay_data)
            except:
                pass

        return volume_cm3, food_mask_path, volume_overlay_path
    except requests.exceptions.RequestException:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="体积服务调用失败")
    except:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="处理体积服务响应失败")


# ------------------ 主接口（200成功响应示例） ------------------
@app.post("/api/predict", responses={
    200: {
        "description": "成功响应",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "code": 200,
                    "message": "卡路里计算成功",
                    "data": {
                        "items": [
                            {
                                "name": "宫保鸡丁",
                                "intro": "体积：350.0 cm³，密度：1.00 g/cm³，重量：350.0 g，总卡路里：700.0 kcal",
                                "volume_cm3": 350.0,
                                "density": 1.00,
                                "weight_g": 350.0,
                                "kcal_per100g": 200.0,
                                "total_kcal": 700.0,
                                "hand_removed_image_path": "hand_removed_images/baidu_20240520_123456.jpg",
                                "food_mask_path": "food_masks/20240520_123456_mask.png",
                                "volume_overlay_path": "volume_overlays/20240520_123456_overlay.jpg"
                            }
                        ]
                    }
                }
            }
        }
    }
})
async def calorie_predict(
        file: UploadFile = File(...),
        hand_length_cm: float = Form(..., description="手掌长度（15-25cm）")
):
    # 参数校验
    img_bytes = await file.read()
    if not img_bytes:
        raise HTTPException(status_code=400, detail="文件为空")
    if not (15.0 <= hand_length_cm <= 25.0):
        raise HTTPException(status_code=400, detail="手掌长度必须在15-25cm之间")

    # 处理图片
    baidu_img, volume_img, black_hand_path = process_images(img_bytes)

    # 识别菜品
    dish_name, kcal_100g = baidu_dishname_calorie(baidu_img)
    if not dish_name or kcal_100g is None:
        raise HTTPException(status_code=404, detail="未识别到有效菜品")

    # 计算体积
    volume_cm3, food_mask_path, volume_overlay_path = call_volume_service(volume_img, hand_length_cm)

    # 计算结果
    density = estimate_density(dish_name)
    weight_g = volume_cm3 * density
    total_kcal = round(weight_g / 100 * kcal_100g, 1)

    # 200成功响应（核心部分）
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "success": True,  # 标识成功状态
            "code": 200,      # 状态码明确为200
            "message": "卡路里计算成功",  # 成功描述
            "data": {         # 业务数据
                "items": [
                    {
                        "name": dish_name,
                        "intro": f"体积：{round(volume_cm3,1)} cm³，密度：{round(density,2)} g/cm³，重量：{round(weight_g,1)} g，总卡路里：{total_kcal} kcal",
                        "volume_cm3": round(volume_cm3, 1),
                        "density": round(density, 2),
                        "weight_g": round(weight_g, 1),
                        "kcal_per100g": round(kcal_100g, 1),
                        "total_kcal": total_kcal,
                        "hand_removed_image_path": black_hand_path,
                        **({"food_mask_path": food_mask_path} if food_mask_path else {}),
                        **({"volume_overlay_path": volume_overlay_path} if volume_overlay_path else {})
                    }
                ]
            }
        }
    )


# ------------------ 图片访问接口（200成功响应） ------------------
@app.get("/images/{image_type}/{filename}")
async def get_image(image_type: str, filename: str):
    valid_types = ["original_images", "hand_removed_images", "food_masks", "volume_overlays"]
    if image_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"无效图片类型，支持：{valid_types}")

    image_path = f"{image_type}/{filename}"
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="图片不存在")


    return FileResponse(image_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")