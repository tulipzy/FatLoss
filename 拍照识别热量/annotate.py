import cv2
import mediapipe as mp
import numpy as np

# 1. 读图
img_path = 'sample/1.png'  # ← 换成你的图片
img_bgr = cv2.imread(img_path)
rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

# 2. 初始化
mp_hands = mp.solutions.hands.Hands(
    static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5)

# 3. 关键点检测
results = mp_hands.process(rgb)
if not results.multi_hand_landmarks:
    print("未检测到手")
    exit()

lm = results.multi_hand_landmarks[0].landmark
h, w = img_bgr.shape[:2]
pts = [(int(l.x * w), int(l.y * h)) for l in lm]

# 4. 计算宽度和长度
# 宽度：最左-最右
xs = [p[0] for p in pts]
hand_w = max(xs) - min(xs)
left_pt  = (min(xs), pts[0][1])      # 任意取同一行
right_pt = (max(xs), pts[0][1])

# 长度：中指指尖 -> 手腕
tip_idx   = mp.solutions.hands.HandLandmark.MIDDLE_FINGER_TIP
wrist_idx = mp.solutions.hands.HandLandmark.WRIST
tip   = pts[tip_idx]
wrist = pts[wrist_idx]

# 5. 画线
cv2.arrowedLine(img_bgr, left_pt, right_pt, (0, 0, 255), 3, tipLength=0.05)  # 红：宽
cv2.arrowedLine(img_bgr, tip, wrist, (0, 255, 0), 3, tipLength=0.05)         # 绿：长

# 6. 写文字
cv2.putText(img_bgr, f"width: {hand_w}px", (left_pt[0], left_pt[1]-20),
            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,0,255), 2)
cv2.putText(img_bgr, f"length: {int(np.linalg.norm(np.array(tip)-np.array(wrist)))}px",
            (tip[0], tip[1]-20), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

# 7. 保存
cv2.imwrite('annotated.jpg', img_bgr)
print("已保存 annotated.jpg")