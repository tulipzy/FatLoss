Page({
  data: {
    previewImage: "", 
    showSearch: false,
    dietIntake: 1200,   // 饮食摄入
    sportConsume: 0,    // 运动消耗
    recommendCalorie: 1600, // 推荐摄入
    remainCalorie: 400, // 还可摄入（推荐 - 已摄入）
    progressCircleStyle: "", // 进度条样式
  },

  onLoad: function () {
    console.log('Food page loaded');
    this.calculateProgress();
  },

  onSearch: function (e:any) {
    const keyword = e.detail.value;
    console.log('搜索关键词:', keyword);
  },

  chooseFoodImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['camera', 'album'], 
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({ previewImage: tempFilePath }); 
        this.uploadImage(tempFilePath); 
      },
      fail: (err) => {
        console.log('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  uploadImage(filePath:string) { 
    console.log('文件路径:', filePath); 
    // 模拟识别结果 - 现在包含完整的营养数据
    const mockResults = [{
      dish: "红烧排骨", 
      density: 1.00,
      weight: 200,
      calorie: 450,
      nutrition: {
        protein: 20.5,
        carbs: 10.2,
        fat: 35.8,
        fiber: 1.5
      }
    }];
    
    const result = mockResults[0];
    
    wx.navigateTo({
      url: `/pages/result/result?dishName=${encodeURIComponent(result.dish)}&density=${result.density}&weight=${result.weight}&calorie=${result.calorie}&protein=${result.nutrition.protein}&carbs=${result.nutrition.carbs}&fat=${result.nutrition.fat}&fiber=${result.nutrition.fiber}&previewImage=${encodeURIComponent(this.data.previewImage)}`,
    });

    wx.showToast({
      title: '识别成功(模拟)',
      icon: 'success',
      duration: 2000
    });
  },

  calculateProgress() {
    const ratio = (this.data.dietIntake / this.data.recommendCalorie) * 100;
    this.setData({
      progressCircleStyle: `--progress-ratio: ${ratio}%`,
      remainCalorie: this.data.recommendCalorie - this.data.dietIntake
    });
  },

  gotoDietList() {
    wx.showToast({
      title: '进入饮食清单',
      icon: 'none',
      duration: 1500
    });
  },

  gotoDietReport() {
    wx.showToast({
      title: '进入饮食报告',
      icon: 'none',
      duration: 1500
    });
  }
})