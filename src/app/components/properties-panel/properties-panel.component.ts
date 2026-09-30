import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DesignService } from '../../services/design.service';
import { LabelElement, ElementType } from '../../models/element.model';

@Component({
  selector: 'app-properties-panel',
  templateUrl: './properties-panel.component.html',
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {
  selectedElement: LabelElement | null = null;

  private subs: Subscription[] = [];

  constructor(private design: DesignService) {}

  ngOnInit(): void {
    this.subs.push(
      this.design.selectedId$.subscribe(() => this.refreshSelected()),
      this.design.elements$.subscribe(() => this.refreshSelected()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private refreshSelected(): void {
    this.selectedElement = this.design.selectedElement;
  }

  updateProp(key: string, value: any): void {
    if (!this.selectedElement) return;
    this.design.updateElement(this.selectedElement.id, { [key]: value });
  }

  updateNumberProp(key: string, event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      this.updateProp(key, val);
    }
  }

  updateFill(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateProp('fill', checked);
  }

  deleteSelected(): void {
    this.design.deleteSelected();
  }

  getX1(): number {
    return this.selectedElement?.x1 ?? this.selectedElement?.x ?? 0;
  }

  getY1(): number {
    return this.selectedElement?.y1 ?? this.selectedElement?.y ?? 0;
  }

  getX2(): number {
    return this.selectedElement?.x2 ?? ((this.selectedElement?.x ?? 0) + (this.selectedElement?.width ?? 0));
  }

  getY2(): number {
    return this.selectedElement?.y2 ?? this.selectedElement?.y ?? 0;
  }

  get isText(): boolean { return this.selectedElement?.type === 'text'; }
  get isQRCode(): boolean { return this.selectedElement?.type === 'qrcode'; }
  get isBarcode(): boolean { return this.selectedElement?.type === 'barcode'; }
  get isImage(): boolean { return this.selectedElement?.type === 'image'; }
  get isRectangle(): boolean { return this.selectedElement?.type === 'rectangle'; }
  get isEllipse(): boolean { return this.selectedElement?.type === 'ellipse'; }
  get isCircle(): boolean { return this.selectedElement?.type === 'circle'; }
  get isLine(): boolean { return this.selectedElement?.type === 'line'; }
  get isShape(): boolean { return this.isRectangle || this.isEllipse || this.isCircle; }
}
