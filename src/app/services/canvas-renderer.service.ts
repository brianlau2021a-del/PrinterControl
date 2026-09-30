import { Injectable } from '@angular/core';
import { LabelElement } from '../models/element.model';
import qrcodeGenerator from 'qrcode-generator';

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

@Injectable({ providedIn: 'root' })
export class CanvasRendererService {
  private readonly GRID_SIZE = 5;
  private readonly HANDLE_SIZE = 6;
  private readonly PX_PER_MM = 12;
  private imageCache = new Map<string, HTMLImageElement>();

  render(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    labelWidth: number,
    labelHeight: number,
    zoom: number,
    elements: LabelElement[],
    selectedId: string | null,
    snapLines?: SnapLine[],
    onImageLoad?: () => void
  ): void {
    const scale = (zoom / 100) * this.PX_PER_MM;
    const lw = labelWidth * scale;
    const lh = labelHeight * scale;
    const pad = 40;

    canvas.width = lw + pad * 2;
    canvas.height = lh + pad * 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.drawGrid(ctx, canvas.width, canvas.height, scale);

    ctx.save();
    ctx.translate(pad, pad);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lw, lh);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, lw, lh);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, lw, lh);
    ctx.clip();

    for (const el of elements) {
      this.drawElement(ctx, el, scale, false, onImageLoad);
    }
    ctx.restore();

    for (const el of elements) {
      if (el.x < 0 || el.y < 0 || el.x + el.width > labelWidth || el.y + el.height > labelHeight) {
        this.drawOverflowWarning(ctx, el, scale);
      }
    }

    if (selectedId) {
      const sel = elements.find(e => e.id === selectedId);
      if (sel) {
        this.drawSelection(ctx, sel, scale);
      }
    }

    if (snapLines && snapLines.length > 0) {
      this.drawSnapLines(ctx, snapLines, scale);
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
    const step = this.GRID_SIZE * scale;
    ctx.fillStyle = '#334155';
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  private drawElement(ctx: CanvasRenderingContext2D, el: LabelElement, scale: number, _isPreview: boolean, onImageLoad?: () => void): void {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;

    ctx.save();

    if (el.orientation) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.orientation * Math.PI) / 180);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    switch (el.type) {
      case 'text':
        this.drawText(ctx, el, x, y, w, h, scale);
        break;
      case 'qrcode':
        this.drawQRCode(ctx, el, x, y, w, h);
        break;
      case 'barcode':
        this.drawBarcode(ctx, el, x, y, w, h);
        break;
      case 'image':
        this.drawImage(ctx, el, x, y, w, h, onImageLoad);
        break;
      case 'rectangle':
        this.drawRect(ctx, el, x, y, w, h);
        break;
      case 'ellipse':
        this.drawEllipse(ctx, el, x, y, w, h);
        break;
      case 'circle':
        this.drawCircle(ctx, el, x, y, w, h);
        break;
      case 'line':
        this.drawLine(ctx, el, x, y, w, h, scale);
        break;
    }

    ctx.restore();
  }

  private drawText(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number, scale: number): void {
    const fontSize = (el.fontHeight || 4) * scale;
    ctx.fillStyle = '#1e293b';
    ctx.font = `${fontSize}px ${el.fontName || 'Arial'}`;
    ctx.textBaseline = 'top';

    const text = el.text || 'Text';
    const lines = this.wrapText(ctx, text, w, el.autoReturn || 1);
    const lineH = fontSize * 1.2;

    let textY = y;
    if (el.verticalAlignment === 1) {
      textY = y + (h - lines.length * lineH) / 2;
    } else if (el.verticalAlignment === 2) {
      textY = y + h - lines.length * lineH;
    }

    for (let i = 0; i < lines.length; i++) {
      let textX = x;
      const lw = ctx.measureText(lines[i]).width;
      if (el.horizontalAlignment === 1) {
        textX = x + (w - lw) / 2;
      } else if (el.horizontalAlignment === 2) {
        textX = x + w - lw;
      }
      ctx.fillText(lines[i], textX, textY + i * lineH);
    }
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, autoReturn: number): string[] {
    if (maxWidth <= 0 || autoReturn === 0) return [text];

    const lines: string[] = [];
    const chars = text.split('');
    let line = '';

    for (const ch of chars) {
      const test = line + ch;
      const testWidth = ctx.measureText(test).width;

      if (testWidth > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  private drawQRCode(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number): void {
    const text = el.text || '';
    if (!text) return;

    const size = Math.min(w, h);
    const offsetX = x + (w - size) / 2;
    const offsetY = y + (h - size) / 2;

    try {
      const qr = qrcodeGenerator(0, 'M');
      qr.addData(text);
      qr.make();

      const moduleCount = qr.getModuleCount();
      const moduleSize = size / moduleCount;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX - 2, offsetY - 2, size + 4, size + 4);

      ctx.fillStyle = '#1e293b';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(
              offsetX + col * moduleSize,
              offsetY + row * moduleSize,
              moduleSize + 0.5,
              moduleSize + 0.5
            );
          }
        }
      }
    } catch (e) {
      console.error('QR generation error:', e);
      ctx.fillStyle = '#ef4444';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Error', x + w / 2, y + h / 2);
    }
  }

  private drawBarcode(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number): void {
    const text = el.text || '1234567890';
    const textH = (el.textHeight || 5) * this.PX_PER_MM * (this.zoom / 100);
    const barH = h - textH;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#1e293b';
    let cx = x;
    const barW = w / (text.length * 7);
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      for (let b = 0; b < 7; b++) {
        if ((code >> b) & 1) {
          ctx.fillRect(cx, y, barW, barH);
        }
        cx += barW;
      }
    }

    const fontSize = Math.max(8, textH * 0.6);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + w / 2, y + barH + 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawImage(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number, onImageLoad?: () => void): void {
    if (el.imageFile) {
      // 如果圖片已經載入過，直接畫出來
      if (this.imageCache.has(el.imageFile)) {
        const img = this.imageCache.get(el.imageFile)!;
        ctx.drawImage(img, x, y, w, h);
      } else {
        // 如果還沒載入，先畫 Placeholder，並開始非同步載入圖片
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(el.imageFile!, img);
          if (onImageLoad) onImageLoad(); // 圖片載入完成！通知 Canvas 重新渲染
        };
        img.src = el.imageFile;
        this.drawPlaceholder(ctx, 'Loading...', x, y, w, h);
      }
    } else {
      this.drawPlaceholder(ctx, 'No Image', x, y, w, h);
    }
  }

  private drawPlaceholder(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number): void {
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  private drawRect(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number): void {
    const lw = (el.lineWidth || 0.4) * this.PX_PER_MM * (this.zoom / 100);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = lw;

    if (el.cornerWidth && el.cornerWidth > 0) {
      const cr = el.cornerWidth * this.PX_PER_MM * (this.zoom / 100);
      this.roundRect(ctx, x, y, w, h, cr);
      if (el.fill) {
        ctx.fillStyle = '#1e293b';
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else {
      if (el.fill) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, w, h);
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private drawEllipse(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number): void {
    const lw = (el.lineWidth || 0.4) * this.PX_PER_MM * (this.zoom / 100);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (el.fill) {
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  private drawCircle(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, w: number, h: number): void {
    const lw = (el.lineWidth || 0.4) * this.PX_PER_MM * (this.zoom / 100);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = lw;
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
    if (el.fill) {
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  private drawLine(ctx: CanvasRenderingContext2D, el: LabelElement, x: number, y: number, _w: number, _h: number, scale: number): void {
    const lw = (el.lineWidth || 0.4) * this.PX_PER_MM * (this.zoom / 100);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo((el.x1 ?? el.x) * scale, (el.y1 ?? el.y) * scale);
    ctx.lineTo((el.x2 ?? el.x + el.width) * scale, (el.y2 ?? el.y) * scale);
    if (el.dashLens && el.dashLens.length) {
      ctx.setLineDash(el.dashLens.map(d => d * scale));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawOverflowWarning(ctx: CanvasRenderingContext2D, el: LabelElement, scale: number): void {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  private drawSelection(ctx: CanvasRenderingContext2D, el: LabelElement, scale: number): void {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#6366f1';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    const hs = this.HANDLE_SIZE;
    const handles = this.getHandlePositions(x, y, w, h);
    for (const hp of handles) {
      ctx.fillRect(hp.x - hs / 2, hp.y - hs / 2, hs, hs);
      ctx.strokeRect(hp.x - hs / 2, hp.y - hs / 2, hs, hs);
    }
  }

  getHandlePositions(x: number, y: number, w: number, h: number): { x: number; y: number; cursor: string }[] {
    return [
      { x, y, cursor: 'nw-resize' },
      { x: x + w / 2, y, cursor: 'n-resize' },
      { x: x + w, y, cursor: 'ne-resize' },
      { x: x + w, y: y + h / 2, cursor: 'e-resize' },
      { x: x + w, y: y + h, cursor: 'se-resize' },
      { x: x + w / 2, y: y + h, cursor: 's-resize' },
      { x, y: y + h, cursor: 'sw-resize' },
      { x, y: y + h / 2, cursor: 'w-resize' },
    ];
  }

  hitTestHandle(
    mx: number, my: number,
    el: LabelElement, scale: number, pad: number
  ): number {
    const x = el.x * scale + pad;
    const y = el.y * scale + pad;
    const w = el.width * scale;
    const h = el.height * scale;
    const handles = this.getHandlePositions(x, y, w, h);
    const hs = this.HANDLE_SIZE + 4;
    for (let i = 0; i < handles.length; i++) {
      if (Math.abs(mx - handles[i].x) <= hs && Math.abs(my - handles[i].y) <= hs) {
        return i;
      }
    }
    return -1;
  }

  hitTestElement(
    mx: number, my: number,
    elements: LabelElement[], scale: number, pad: number
  ): LabelElement | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const x = el.x * scale + pad;
      const y = el.y * scale + pad;
      const w = el.width * scale;
      const h = el.height * scale;
      if (mx >= x && mx <= x + w && my >= y && my <= y + h) {
        return el;
      }
    }
    return null;
  }

  getScale(zoom: number): number {
    return (zoom / 100) * this.PX_PER_MM;
  }

  getPad(): number {
    return 40;
  }

  calculateSnapLines(
    movingElement: LabelElement,
    allElements: LabelElement[],
    labelWidth: number,
    labelHeight: number,
    threshold: number = 2
  ): { lines: SnapLine[], snappedX: number, snappedY: number } {
    const lines: SnapLine[] = [];
    let snappedX = movingElement.x;
    let snappedY = movingElement.y;

    const movingCenterX = movingElement.x + movingElement.width / 2;
    const movingCenterY = movingElement.y + movingElement.height / 2;
    const movingLeft = movingElement.x;
    const movingRight = movingElement.x + movingElement.width;
    const movingTop = movingElement.y;
    const movingBottom = movingElement.y + movingElement.height;

    const labelCenterX = labelWidth / 2;
    const labelCenterY = labelHeight / 2;

    const verticalLines: { pos: number, start: number, end: number }[] = [];
    const horizontalLines: { pos: number, start: number, end: number }[] = [];

    if (Math.abs(movingCenterX - labelCenterX) < threshold) {
      snappedX = labelCenterX - movingElement.width / 2;
      verticalLines.push({
        pos: labelCenterX,
        start: Math.min(0, movingTop),
        end: Math.max(labelHeight, movingBottom)
      });
    }

    if (Math.abs(movingCenterY - labelCenterY) < threshold) {
      snappedY = labelCenterY - movingElement.height / 2;
      horizontalLines.push({
        pos: labelCenterY,
        start: Math.min(0, movingLeft),
        end: Math.max(labelWidth, movingRight)
      });
    }

    if (Math.abs(movingLeft - 0) < threshold) {
      snappedX = 0;
      verticalLines.push({ pos: 0, start: movingTop, end: movingBottom });
    }
    if (Math.abs(movingRight - labelWidth) < threshold) {
      snappedX = labelWidth - movingElement.width;
      verticalLines.push({ pos: labelWidth, start: movingTop, end: movingBottom });
    }
    if (Math.abs(movingTop - 0) < threshold) {
      snappedY = 0;
      horizontalLines.push({ pos: 0, start: movingLeft, end: movingRight });
    }
    if (Math.abs(movingBottom - labelHeight) < threshold) {
      snappedY = labelHeight - movingElement.height;
      horizontalLines.push({ pos: labelHeight, start: movingLeft, end: movingRight });
    }

    for (const other of allElements) {
      if (other.id === movingElement.id) continue;

      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      const otherLeft = other.x;
      const otherRight = other.x + other.width;
      const otherTop = other.y;
      const otherBottom = other.y + other.height;

      if (Math.abs(movingCenterX - otherCenterX) < threshold) {
        snappedX = otherCenterX - movingElement.width / 2;
        verticalLines.push({
          pos: otherCenterX,
          start: Math.min(movingTop, otherTop),
          end: Math.max(movingBottom, otherBottom)
        });
      }

      if (Math.abs(movingLeft - otherLeft) < threshold) {
        snappedX = otherLeft;
        verticalLines.push({
          pos: otherLeft,
          start: Math.min(movingTop, otherTop),
          end: Math.max(movingBottom, otherBottom)
        });
      }

      if (Math.abs(movingRight - otherRight) < threshold) {
        snappedX = otherRight - movingElement.width;
        verticalLines.push({
          pos: otherRight,
          start: Math.min(movingTop, otherTop),
          end: Math.max(movingBottom, otherBottom)
        });
      }

      if (Math.abs(movingLeft - otherRight) < threshold) {
        snappedX = otherRight;
        verticalLines.push({
          pos: otherRight,
          start: Math.min(movingTop, otherTop),
          end: Math.max(movingBottom, otherBottom)
        });
      }

      if (Math.abs(movingRight - otherLeft) < threshold) {
        snappedX = otherLeft - movingElement.width;
        verticalLines.push({
          pos: otherLeft,
          start: Math.min(movingTop, otherTop),
          end: Math.max(movingBottom, otherBottom)
        });
      }

      if (Math.abs(movingCenterY - otherCenterY) < threshold) {
        snappedY = otherCenterY - movingElement.height / 2;
        horizontalLines.push({
          pos: otherCenterY,
          start: Math.min(movingLeft, otherLeft),
          end: Math.max(movingRight, otherRight)
        });
      }

      if (Math.abs(movingTop - otherTop) < threshold) {
        snappedY = otherTop;
        horizontalLines.push({
          pos: otherTop,
          start: Math.min(movingLeft, otherLeft),
          end: Math.max(movingRight, otherRight)
        });
      }

      if (Math.abs(movingBottom - otherBottom) < threshold) {
        snappedY = otherBottom - movingElement.height;
        horizontalLines.push({
          pos: otherBottom,
          start: Math.min(movingLeft, otherLeft),
          end: Math.max(movingRight, otherRight)
        });
      }

      if (Math.abs(movingTop - otherBottom) < threshold) {
        snappedY = otherBottom;
        horizontalLines.push({
          pos: otherBottom,
          start: Math.min(movingLeft, otherLeft),
          end: Math.max(movingRight, otherRight)
        });
      }

      if (Math.abs(movingBottom - otherTop) < threshold) {
        snappedY = otherTop - movingElement.height;
        horizontalLines.push({
          pos: otherTop,
          start: Math.min(movingLeft, otherLeft),
          end: Math.max(movingRight, otherRight)
        });
      }
    }

    for (const line of verticalLines) {
      lines.push({
        type: 'vertical',
        position: line.pos,
        start: line.start,
        end: line.end
      });
    }

    for (const line of horizontalLines) {
      lines.push({
        type: 'horizontal',
        position: line.pos,
        start: line.start,
        end: line.end
      });
    }

    return { lines, snappedX, snappedY };
  }

  private drawSnapLines(ctx: CanvasRenderingContext2D, snapLines: SnapLine[], scale: number): void {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (const line of snapLines) {
      ctx.beginPath();
      if (line.type === 'vertical') {
        const x = line.position * scale;
        ctx.moveTo(x, line.start * scale);
        ctx.lineTo(x, line.end * scale);
      } else {
        const y = line.position * scale;
        ctx.moveTo(line.start * scale, y);
        ctx.lineTo(line.end * scale, y);
      }
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private zoom = 100;
}
