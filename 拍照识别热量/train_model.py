import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, random_split
import os

# 只定义变量和函数，不执行实际训练逻辑
DATA_DIR = r'C:\Users\86151\Downloads\food-101\food-101\images'
BATCH_SIZE = 32
NUM_EPOCHS = 20
NUM_CLASSES = 101
LR = 1e-43

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# 数据增强和预处理
train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.2, 0.2, 0.2),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])


# 训练和验证函数
def train_epoch(model, train_loader, criterion, optimizer, device):
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for images, labels in train_loader:
        images, labels = images.to(device), labels.to(device)

        outputs = model(images)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = outputs.max(1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)

    return running_loss / total, 100. * correct / total


def validate(model, val_loader, criterion, device):
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

    return running_loss / total, 100. * correct / total


# 主程序入口（关键修改）
if __name__ == '__main__':
    # 在 Windows 上使用多进程时需要的冻结支持
    import multiprocessing

    multiprocessing.freeze_support()

    # 加载完整数据集
    full_dataset = datasets.ImageFolder(DATA_DIR, transform=train_transform)

    # 分割训练集和验证集
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    # 为验证集设置单独的 transform
    val_dataset.dataset.transform = val_transform

    # 创建数据加载器（Windows 上 num_workers 不宜过大）
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=2,  # 减少 workers 数量，避免 Windows 资源问题
        pin_memory=DEVICE.type == 'cuda'  # 只有 GPU 时才启用 pin_memory
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=2,
        pin_memory=DEVICE.type == 'cuda'
    )

    # 打印数据集信息
    print(f"数据集总样本数: {len(full_dataset)}")
    print(f"训练集样本数: {len(train_dataset)}")
    print(f"验证集样本数: {len(val_dataset)}")
    print(f"类别数: {len(full_dataset.classes)}")
    print(f"使用设备: {DEVICE}")

    # MobileNetV3 模型
    model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V1)  # 修正 weights 参数
    model.classifier[3] = nn.Linear(model.classifier[3].in_features, NUM_CLASSES)
    model = model.to(DEVICE)

    # 定义损失函数和优化器
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS)

    # 创建保存模型的目录
    os.makedirs('checkpoints', exist_ok=True)

    # 训练循环
    best_val_acc = 0.0
    for epoch in range(NUM_EPOCHS):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        val_loss, val_acc = validate(model, val_loader, criterion, DEVICE)

        scheduler.step()

        # 保存最佳模型
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), 'checkpoints/mobilenetv3_food101_best.pth')
            print(f"💾 最佳模型已保存，验证准确率: {val_acc:.2f}%")

        print(f"📦 Epoch {epoch + 1}/{NUM_EPOCHS} | "
              f"训练损失: {train_loss:.4f} | 训练准确率: {train_acc:.2f}% | "
              f"验证损失: {val_loss:.4f} | 验证准确率: {val_acc:.2f}% | "
              f"学习率: {optimizer.param_groups[0]['lr']:.6f}")

    # 保存最终模型
    torch.save(model.state_dict(), 'checkpoints/mobilenetv3_food101_final.pth')
    print("✅ 最终模型已保存：checkpoints/mobilenetv3_food101_final.pth")
    print(f"🥇 最佳验证准确率: {best_val_acc:.2f}%")