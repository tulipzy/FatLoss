# midas_model.py
import torch
import torch.nn as nn
import torch.nn.functional as F
import timm

class Resize(nn.Module):
    def __init__(self, size, interpolation='bicubic'):
        super().__init__()
        self.size = size
        self.interpolation = interpolation

    def forward(self, x):
        return F.interpolate(x, size=self.size, mode=self.interpolation, align_corners=False)

class MidasSmall(nn.Module):
    def __init__(self):
        super().__init__()
        self.backbone = timm.create_model("tf_efficientnet_lite3", features_only=True, pretrained=False)
        self.scratch = nn.Module()
        self.scratch.layer1_rn = nn.Conv2d(40, 32, kernel_size=3, padding=1)
        self.scratch.layer2_rn = nn.Conv2d(48, 32, kernel_size=3, padding=1)
        self.scratch.layer3_rn = nn.Conv2d(136, 32, kernel_size=3, padding=1)
        self.scratch.layer4_rn = nn.Conv2d(232, 32, kernel_size=3, padding=1)
        self.output = nn.Conv2d(32, 1, kernel_size=1)

    def forward(self, x):
        layer_1, layer_2, layer_3, layer_4 = self.backbone(x)
        x = self.scratch.layer4_rn(layer_4)
        x = F.interpolate(x, size=layer_3.shape[2:], mode='bilinear', align_corners=False)
        x = x + self.scratch.layer3_rn(layer_3)
        x = F.interpolate(x, size=layer_2.shape[2:], mode='bilinear', align_corners=False)
        x = x + self.scratch.layer2_rn(layer_2)
        x = F.interpolate(x, size=layer_1.shape[2:], mode='bilinear', align_corners=False)
        x = x + self.scratch.layer1_rn(layer_1)
        x = self.output(x)
        return x
