declare module 'wx-charts' {
  interface WxChartsOptions {
    canvasId: string;
    type: 'line' | 'column' | 'pie' | 'ring' | 'radar' | 'doughnut';
    categories: string[];
    series: Array<{
      name: string;
      data: number[];
      format?: (val: number) => string;
    }>;
    yAxis?: {
      title?: string;
      min?: number;
      gridColor?: string;
    };
    xAxis?: {
      gridColor?: string;
      fontColor?: string;
    };
    width: number;
    height: number;
    lineWidth?: number;
    pointRadius?: number;
    pointColor?: string;
    pointStrokeColor?: string;
    backgroundColor?: string; // 添加背景色属性定义
  }

  class WxCharts {
    constructor(options: WxChartsOptions);
    updateData(series: WxChartsOptions['series']): void;
  }

  export default WxCharts;
}