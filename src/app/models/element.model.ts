export type ElementType = 'text' | 'qrcode' | 'barcode' | 'image' | 'rectangle' | 'ellipse' | 'circle' | 'line';

export interface LabelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: number;
  name: string;
  text?: string;
  fontName?: string;
  fontHeight?: number;
  fontStyle?: number;
  horizontalAlignment?: number;
  verticalAlignment?: number;
  autoReturn?: number;
  charSpace?: number;
  lineSpace?: number;
  eccLevel?: number;
  qrcPixels?: number;
  barcodeType?: number;
  textHeight?: number;
  barPixels?: number;
  imageFile?: string;
  threshold?: number;
  lineWidth?: number;
  fill?: boolean;
  cornerWidth?: number;
  cornerHeight?: number;
  radius?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  dashLens?: number[];
}

export interface LabelDesign {
  version: string;
  labelWidth: number;
  labelHeight: number;
  orientation: number;
  elements: LabelElement[];
}

export const ELEMENT_DEFAULTS: Record<ElementType, Partial<LabelElement>> = {
  text: {
    text: 'Text',
    fontName: 'Arial',
    fontHeight: 4,
    fontStyle: 0,
    horizontalAlignment: 0,
    verticalAlignment: 0,
    autoReturn: 1,
    charSpace: 0,
    lineSpace: 1,
    width: 30,
    height: 8,
  },
  qrcode: {
    text: 'https://example.com',
    eccLevel: 0,
    qrcPixels: 2,
    width: 20,
    height: 20,
  },
  barcode: {
    text: '1234567890',
    barcodeType: 0,
    textHeight: 5,
    barPixels: 2,
    width: 35,
    height: 15,
  },
  image: {
    imageFile: '',
    threshold: 192,
    width: 20,
    height: 20,
  },
  rectangle: {
    lineWidth: 0.4,
    fill: false,
    cornerWidth: 0,
    cornerHeight: 0,
    width: 20,
    height: 15,
  },
  ellipse: {
    lineWidth: 0.4,
    fill: false,
    width: 20,
    height: 15,
  },
  circle: {
    lineWidth: 0.4,
    fill: false,
    radius: 8,
    width: 16,
    height: 16,
  },
  line: {
    lineWidth: 0.4,
    x1: 0,
    y1: 0,
    x2: 30,
    y2: 0,
    width: 30,
    height: 0,
  },
};

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  text: 'Text',
  qrcode: 'QR Code',
  barcode: 'Barcode',
  image: 'Image',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  circle: 'Circle',
  line: 'Line',
};

export const ELEMENT_TYPE_ICONS: Record<ElementType, string> = {
  text: 'T',
  qrcode: 'QR',
  barcode: '|||',
  image: '\u{1F5BC}',
  rectangle: '\u25AD',
  ellipse: '\u25EF',
  circle: '\u25CB',
  line: '\u2500',
};
