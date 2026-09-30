import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DesignService } from '../../services/design.service';
import { CanvasRendererService, SnapLine } from '../../services/canvas-renderer.service';
import { LabelElement } from '../../models/element.model';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
})
export class CanvasComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvasEl', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  labelWidth = 40;
  labelHeight = 30;
  zoom = 100;
  elements: LabelElement[] = [];
  selectedId: string | null = null;

  private ctx!: CanvasRenderingContext2D;
  private subs: Subscription[] = [];
  private isDragging = false;
  private isResizing = false;
  private resizeHandle = -1;
  private dragStartX = 0;
  private dragStartY = 0;
  private elStartX = 0;
  private elStartY = 0;
  private elStartW = 0;
  private elStartH = 0;
  private currentSnapLines: SnapLine[] = [];

  constructor(
    private design: DesignService,
    private renderer: CanvasRendererService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.design.labelWidth$.subscribe(v => { this.labelWidth = v; this.render(); }),
      this.design.labelHeight$.subscribe(v => { this.labelHeight = v; this.render(); }),
      this.design.elements$.subscribe(els => { this.elements = els; this.render(); }),
      this.design.selectedId$.subscribe(id => { this.selectedId = id; this.render(); }),
      this.design.zoom$.subscribe(z => { this.zoom = z; this.render(); }),
    );
  }

  ngAfterViewInit(): void {
    this.ctx = this.canvasRef.nativeElement.getContext('2d')!;
    this.render();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private render(): void {
    if (!this.ctx) return;
    this.renderer.render(
      this.ctx,
      this.canvasRef.nativeElement,
      this.labelWidth,
      this.labelHeight,
      this.zoom,
      this.elements,
      this.selectedId,
      this.currentSnapLines
    );
  }

  onMouseDown(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const scale = this.renderer.getScale(this.zoom);
    const pad = this.renderer.getPad();

    if (this.selectedId) {
      const sel = this.elements.find(e => e.id === this.selectedId);
      if (sel) {
        const handleIdx = this.renderer.hitTestHandle(mx, my, sel, scale, pad);
        if (handleIdx >= 0) {
          this.isResizing = true;
          this.resizeHandle = handleIdx;
          this.dragStartX = mx;
          this.dragStartY = my;
          this.elStartX = sel.x;
          this.elStartY = sel.y;
          this.elStartW = sel.width;
          this.elStartH = sel.height;
          return;
        }
      }
    }

    const hit = this.renderer.hitTestElement(mx, my, this.elements, scale, pad);
    if (hit) {
      this.design.selectElement(hit.id);
      this.isDragging = true;
      this.dragStartX = mx;
      this.dragStartY = my;
      this.elStartX = hit.x;
      this.elStartY = hit.y;
    } else {
      this.design.selectElement(null);
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging && !this.isResizing) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    const scale = this.renderer.getScale(this.zoom);

    const dx = (mx - this.dragStartX) / scale;
    const dy = (my - this.dragStartY) / scale;

    if (this.isDragging && this.selectedId) {
      const el = this.elements.find(e => e.id === this.selectedId);
      if (!el) return;

      let newX = this.elStartX + dx;
      let newY = this.elStartY + dy;

      const tempEl = { ...el, x: newX, y: newY };
      const snapResult = this.renderer.calculateSnapLines(
        tempEl,
        this.elements,
        this.labelWidth,
        this.labelHeight,
        2
      );

      this.currentSnapLines = snapResult.lines;
      newX = snapResult.snappedX;
      newY = snapResult.snappedY;

      newX = Math.max(0, Math.min(this.labelWidth - el.width, newX));
      newY = Math.max(0, Math.min(this.labelHeight - el.height, newY));

      this.design.moveElement(this.selectedId, newX, newY);
    }

    if (this.isResizing && this.selectedId) {
      let newX = this.elStartX;
      let newY = this.elStartY;
      let newW = this.elStartW;
      let newH = this.elStartH;

      switch (this.resizeHandle) {
        case 0: newX += dx; newY += dy; newW -= dx; newH -= dy; break;
        case 1: newY += dy; newH -= dy; break;
        case 2: newY += dy; newW += dx; newH -= dy; break;
        case 3: newW += dx; break;
        case 4: newW += dx; newH += dy; break;
        case 5: newH += dy; break;
        case 6: newX += dx; newW -= dx; newH += dy; break;
        case 7: newX += dx; newW -= dx; break;
      }

      newW = Math.max(2, newW);
      newH = Math.max(2, newH);
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      this.design.updateElement(this.selectedId, { x: newX, y: newY, width: newW, height: newH });
    }
  }

  onMouseUp(): void {
    this.isDragging = false;
    this.isResizing = false;
    this.resizeHandle = -1;
    this.currentSnapLines = [];
    this.render();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -10 : 10;
    this.design.setZoom(this.zoom + delta);
  }

  setZoom(val: number): void {
    this.design.setZoom(val);
  }
}
