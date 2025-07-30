from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import uvicorn, cv2, numpy as np, torch, mediapipe as mp, os, datetime, warnings
from transformers import DPTImageProcessor, DPTForDepthEstimation

warnings.filterwarnings("ignore", category=UserWarning)

# ---------- FastAPI ----------
app = FastAPI(title="FoodVolumeAutoPerspective")
MASK_DIR = "food_masks"
os.makedirs(MASK_DIR, exist_ok=True)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DPT_CACHE_DIR = "./dpt_cache"

# ---------- MediaPipe ----------
mp_hands = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=1)

# ---------- DPT ----------
dpt_processor = DPTImageProcessor.from_pretrained(
    "Intel/dpt-large", cache_dir=DPT_CACHE_DIR)
dpt_model = DPTForDepthEstimation.from_pretrained(
    "Intel/dpt-large", cache_dir=DPT_CACHE_DIR).to(DEVICE).eval()


# ---------- GrabCut ----------
def segment_food_grabcut(img: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    margin_x, margin_y = int(w * 0.1), int(h * 0.1)
    rect = (margin_x, margin_y, w - 2 * margin_x, h - 2 * margin_y)
    mask = np.zeros((h, w), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype("uint8")
    return mask2 * 255


# ---------- 手掌像素长度 ----------
def palm_pixel_length(rgb: np.ndarray) -> float:
    res = mp_hands.process(rgb)
    if not res.multi_hand_landmarks:
        return 0.0
    lm = res.multi_hand_landmarks[0].landmark
    wrist = np.array([lm[0].x * rgb.shape[1], lm[0].y * rgb.shape[0]])
    mid_tip = np.array([lm[12].x * rgb.shape[1], lm[12].y * rgb.shape[0]])
    return float(np.linalg.norm(mid_tip - wrist))


# ---------- 厚度估计 ----------
@torch.no_grad()
def estimate_thickness(rgb: np.ndarray, food_mask: np.ndarray, depth: np.ndarray) -> float:
    """使用提供的深度图估计厚度，添加距离修正"""
    COS_45 = 0.70710678
    depth_norm = (depth - depth.min()) / (depth.max() - depth.min()) * 20.0

    if not food_mask.any():
        return 1.0

    # 获取食物区域的平均深度（距离）
    food_depth_mean = float(np.mean(depth_norm[food_mask > 0]))

    # 距离越近（深度值越小），厚度修正系数越小
    # 当食物比平均场景更近时，缩小厚度估计
    distance_factor = min(1.0, food_depth_mean / depth_norm.mean())

    # 应用距离因子修正厚度
    thickness = float(np.median(depth_norm[food_mask > 0])) * COS_45 * distance_factor
    return max(thickness, 0.1)  # 确保厚度不为负


# ---------- 主路由 ----------
@app.post("/predict")
async def predict(
        file: UploadFile = File(...),
        hand_length_cm: float = Form(..., ge=15, le=25),  # 手掌实际长度范围15-25cm
        bowl_factor: float = Form(0.55, ge=0.3, le=1.0),
        dish_type: str = Form("bowl")
):
    img = cv2.imdecode(np.frombuffer(await file.read(), np.uint8), cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 检测手掌像素长度
    palm_px = palm_pixel_length(rgb)
    if palm_px == 0:
        raise HTTPException(400, "未检测到手掌")

    # 计算比例尺 (cm/px)
    scale_cm_per_px = hand_length_cm / palm_px

    # 食物分割
    food_mask = segment_food_grabcut(img)

    # 手掌掩膜
    hand_mask = np.zeros_like(food_mask, dtype=np.uint8)
    res = mp_hands.process(rgb)
    if res.multi_hand_landmarks:
        pts = [[int(lm.x * rgb.shape[1]), int(lm.y * rgb.shape[0])]
               for lm in res.multi_hand_landmarks[0].landmark]
        cv2.fillPoly(hand_mask, [cv2.convexHull(np.array(pts))], 255)

    # 移除手掌区域
    food_only = food_mask & (~hand_mask.astype(bool))
    food_px = int(np.count_nonzero(food_only))
    hand_px = int(np.count_nonzero(hand_mask))
    if hand_px == 0:
        raise HTTPException(400, "手掌掩膜像素为 0")

    # 深度图估计
    inputs = dpt_processor(images=rgb, return_tensors="pt").to(DEVICE)
    depth = dpt_model(**inputs).predicted_depth.detach()
    depth = torch.nn.functional.interpolate(
        depth.unsqueeze(1),
        size=(rgb.shape[0], rgb.shape[1]),
        mode="bicubic",
        align_corners=False
    ).squeeze().cpu().numpy()

    # 归一化深度图（值越小表示离镜头越近）
    depth_norm = (depth - depth.min()) / (depth.max() - depth.min()) * 20.0

    # 计算手掌和食物的平均深度
    hand_depth = float(np.mean(depth_norm[hand_mask > 0]))
    food_depth = float(np.mean(depth_norm[food_only > 0]))

    # 深度比例计算 - 添加透视修正
    # 当食物离镜头更近（food_depth < hand_depth）时，缩小面积
    if hand_depth > 0:
        depth_ratio = food_depth / hand_depth
        # 应用非线性修正，增强近距缩小效果
        perspective_factor = 1.0
        if food_depth < hand_depth:
            # 食物越近，缩小因子越大
            perspective_factor = (food_depth / hand_depth) ** 1.5
        depth_ratio *= perspective_factor
    else:
        depth_ratio = 1.0

    # 透视修正后的食物面积 (cm²)
    food_px_corrected = food_px * depth_ratio
    food_area_cm2 = food_px_corrected * (scale_cm_per_px ** 2)

    # 厚度估计（传入深度图用于距离修正）
    thickness_cm = estimate_thickness(rgb, food_only, depth)

    # 体积计算 (考虑容器类型)
    if dish_type == "bowl":
        volume_cm3 = food_area_cm2 * thickness_cm * 2.0 / 3.0 * bowl_factor
    else:
        volume_cm3 = food_area_cm2 * thickness_cm * bowl_factor

    # 可视化结果保存
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    cv2.imwrite(os.path.join(MASK_DIR, f"{ts}_food_mask.png"),
                (food_only * 255).astype(np.uint8))
    overlay = img.copy()
    overlay[food_only] = [0, 255, 0]
    overlay[hand_mask > 0] = [255, 0, 0]
    vis = cv2.addWeighted(img, 0.6, overlay, 0.4, 0)
    cv2.imwrite(os.path.join(MASK_DIR, f"{ts}_overlay.jpg"), vis)

    return JSONResponse({
        "food_area_cm2": float(round(food_area_cm2, 2)),
        "thickness_cm": float(round(thickness_cm, 2)),
        "volume_cm3": float(round(volume_cm3, 2)),
        "depth_ratio": float(round(depth_ratio, 3)),
        "perspective_factor": float(round(perspective_factor, 3)) if 'perspective_factor' in locals() else 1.0,
        "scale_cm_per_px": float(round(scale_cm_per_px, 4)),
        "hand_pixel_length": float(round(palm_px, 2)),
        "dish_type": dish_type,
        "message": f"基于手掌长度的体积估算（{dish_type}，双向透视修正）"
    })


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
