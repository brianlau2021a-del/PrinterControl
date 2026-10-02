import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LabelElement, LabelDesign, ElementType, ELEMENT_DEFAULTS } from '../models/element.model';

@Injectable({ providedIn: 'root' })
export class DesignService {
  private _labelWidth$ = new BehaviorSubject<number>(40);
  private _labelHeight$ = new BehaviorSubject<number>(30);
  private _elements$ = new BehaviorSubject<LabelElement[]>([]);
  private _selectedId$ = new BehaviorSubject<string | null>(null);
  private _zoom$ = new BehaviorSubject<number>(200);

  labelWidth$ = this._labelWidth$.asObservable();
  labelHeight$ = this._labelHeight$.asObservable();
  elements$ = this._elements$.asObservable();
  selectedId$ = this._selectedId$.asObservable();
  zoom$ = this._zoom$.asObservable();

  private past: string[] = [];
  private future: string[] = [];

  get labelWidth(): number { return this._labelWidth$.value; }
  get labelHeight(): number { return this._labelHeight$.value; }
  get elements(): LabelElement[] { return this._elements$.value; }
  get selectedId(): string | null { return this._selectedId$.value; }
  get zoom(): number { return this._zoom$.value; }

  private _printSettings$ = new BehaviorSubject<any>({});
  printSettings$ = this._printSettings$.asObservable()

  get printSettings(): any { return this._printSettings$.value; }
  setPrintSettings(settings: any): void {
    this._printSettings$.next({ ...this.printSettings, ...settings });
  }

  get selectedElement(): LabelElement | null {
    if (!this.selectedId) return null;
    return this.elements.find(e => e.id === this.selectedId) || null;
  }

  private nextId = 1;

  setLabelWidth(w: number): void {
    this._labelWidth$.next(w);
  }

  setLabelHeight(h: number): void {
    this._labelHeight$.next(h);
  }

  setZoom(z: number): void {
    this._zoom$.next(Math.max(25, Math.min(400, z)));
  }

  addElement(type: ElementType): void {
    this.saveHistory();

    const defaults = ELEMENT_DEFAULTS[type] || {};
    const id = `el_${this.nextId++}`;

    const el: LabelElement = {
      id,
      type,
      x: Math.max(0, (this.labelWidth - (defaults.width || 20)) / 2),
      y: Math.max(0, (this.labelHeight - (defaults.height || 15)) / 2),
      width: defaults.width || 20,
      height: defaults.height || 15,
      orientation: 0,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.nextId - 1}`,
      ...defaults,
    };

    this._elements$.next([...this.elements, el]);
    this._selectedId$.next(id);
  }

  deleteElement(id: string): void {
    this.saveHistory(); // 加入這行
    this._elements$.next(this.elements.filter(e => e.id !== id));
    if (this.selectedId === id) {
      this._selectedId$.next(null);
    }
  }

  updateElement(id: string, changes: Partial<LabelElement>): void {
    const updated = this.elements.map(e => e.id === id ? { ...e, ...changes } : e);
    this._elements$.next(updated);
  }

  saveHistory(): void {
    const currentState = JSON.stringify(this.elements);
    // 避免連續儲存完全一樣的狀態
    if (this.past.length === 0 || this.past[this.past.length - 1] !== currentState) {
      this.past.push(currentState);
      this.future = []; // 有新動作就清空重做堆疊
    }
  }

  selectElement(id: string | null): void {
    this._selectedId$.next(id);
  }


  deleteSelected(): void {
    if (this.selectedId) {
      this.deleteElement(this.selectedId);
    }
  }

  undo(): void {
    if (this.past.length > 0) {
      this.future.push(JSON.stringify(this.elements));
      const previous = JSON.parse(this.past.pop()!);
      this._elements$.next(previous);
    }
  }

  redo(): void {
    if (this.future.length > 0) {
      this.past.push(JSON.stringify(this.elements));
      const next = JSON.parse(this.future.pop()!);
      this._elements$.next(next);
    }
  }

  moveElement(id: string, x: number, y: number): void {
    this.updateElement(id, { x, y });
  }

  resizeElement(id: string, w: number, h: number): void {
    this.updateElement(id, { width: Math.max(1, w), height: Math.max(1, h) });
  }

  moveLayerUp(id: string): void {
    this.saveHistory();
    const els = [...this.elements];
    const idx = els.findIndex(e => e.id === id);
    if (idx < els.length - 1) {
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      this._elements$.next(els);
    }
  }

  moveLayerDown(id: string): void {
    this.saveHistory();
    const els = [...this.elements];
    const idx = els.findIndex(e => e.id === id);
    if (idx > 0) {
      [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
      this._elements$.next(els);
    }
  }

  clearAll(): void {
    this.saveHistory();
    this._elements$.next([]);
    this._selectedId$.next(null);
  }

  exportJSON(): string {
    const design: LabelDesign = {
      version: '1.0',
      labelWidth: this.labelWidth,
      labelHeight: this.labelHeight,
      orientation: 0,
      elements: this.elements,
      printSettings: this.printSettings
    };
    return JSON.stringify(design, null, 2);
  }

  importJSON(json: string): void {
    try {
      const design: LabelDesign = JSON.parse(json);
      if (design.labelWidth) this._labelWidth$.next(design.labelWidth);
      if (design.labelHeight) this._labelHeight$.next(design.labelHeight);

      if (design.printSettings) {
        this.setPrintSettings(design.printSettings);
      }

      if (design.elements) {
        this._elements$.next(design.elements);
        this.nextId = design.elements.reduce((max, e) => {
          const num = parseInt(e.id.replace('el_', ''), 10);
          return isNaN(num) ? max : Math.max(max, num + 1);
        }, this.nextId);
      }
      this._selectedId$.next(null);
      this.past = [];
      this.future = [];
    } catch (e) {
      console.error('Failed to import JSON:', e);
      alert('Failed to import design. Invalid JSON format.');
    }
  }

  rotateDesign(direction: 'left' | 'right'): void {
    this.saveHistory();
    const oldW = this.labelWidth;
    const oldH = this.labelHeight;

    // 1. 對調畫布長寬
    this._labelWidth$.next(oldH);
    this._labelHeight$.next(oldW);

    const updated = this.elements.map(el => {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;

      let newCx: number, newCy: number;
      let angleDelta = direction === 'right' ? 90 : 270;

      if (direction === 'right') {
        newCx = oldH - cy;
        newCy = cx;
      } else { // left
        newCx = cy;
        newCy = oldW - cx;
      }

      const newEl = {
        ...el,
        x: newCx - el.width / 2,
        y: newCy - el.height / 2,
        orientation: ((el.orientation || 0) + angleDelta) % 360
      };

      if (el.type === 'line') {
        const x1 = el.x1 ?? el.x;
        const y1 = el.y1 ?? el.y;
        const x2 = el.x2 ?? el.x + el.width;
        const y2 = el.y2 ?? el.y;

        if (direction === 'right') {
          newEl.x1 = oldH - y1;
          newEl.y1 = x1;
          newEl.x2 = oldH - y2;
          newEl.y2 = x2;
        } else { // left
          newEl.x1 = y1;
          newEl.y1 = oldW - x1;
          newEl.x2 = y2;
          newEl.y2 = oldW - x2;
        }

        newEl.x = Math.min(newEl.x1, newEl.x2);
        newEl.y = Math.min(newEl.y1, newEl.y2);
        newEl.width = Math.abs(newEl.x2 - newEl.x1);
        newEl.height = Math.abs(newEl.y2 - newEl.y1);
        newEl.orientation = 0;
      }

      return newEl;
    });

    this._elements$.next(updated);
  }
}
