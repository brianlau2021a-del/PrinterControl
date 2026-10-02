export interface PrinterInfo {
  name: string;
  deviceName?: string;
  ip?: string;
  hostname?: string;
  port?: number;
  type?: number;
}

export interface PrintSettings {
  gapType: number;
  printSpeed: number;
  printDarkness: number;
  printMode: number;
  printerDpi: number;
  printerWidth: number;
  copies: number;
  jobName?: string;
}

export const GAP_TYPE_OPTIONS = [
  { value: 255, label: '随打印机' },
  { value: 0, label: '连续纸' },
  { value: 1, label: '定位孔' },
  { value: 2, label: '间隙纸' },
];

export const PRINT_SPEED_OPTIONS = [
  { value: 255, label: '随打印机' },
  { value: 0, label: '1(特慢)' },
  { value: 1, label: '2(慢)' },
  { value: 2, label: '3(正常)' },
  { value: 3, label: '4(快)' },
  { value: 4, label: '5(特快)' },
];

export const PRINT_DARKNESS_OPTIONS = [
  { value: 255, label: '随打印机' },
  { value: 5, label: '6(正常)' },
  { value: 6, label: '7' },
  { value: 7, label: '8' },
  { value: 8, label: '9' },
  { value: 9, label: '10(较浓)' },
  { value: 10, label: '11' },
  { value: 11, label: '12' },
  { value: 12, label: '13' },
  { value: 13, label: '14' },
  { value: 14, label: '15(特浓)' },
];

export const PRINT_MODE_OPTIONS = [
  { value: 0, label: '打印' },
  { value: 1, label: '获取白色底色预览图片' },
  { value: 2, label: '获取透明底色预览图片' },
  { value: 3, label: '生成打印数据' },
];

export const DPI_OPTIONS = [
  { value: 203, label: '200点打印机' },
  { value: 300, label: '300点打印机' },
];
