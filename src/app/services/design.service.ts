import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LabelElement, LabelDesign, ElementType, ELEMENT_DEFAULTS } from '../models/element.model';

@Injectable({ providedIn: 'root' })
export class DesignService {
  private _labelWidth$ = new BehaviorSubject<number>(40);
  private _labelHeight$ = new BehaviorSubject<number>(30);
  private _orientation$ = new BehaviorSubject<number>(0);
  private _elements$ = new BehaviorSubject<LabelElement[]>([]);
  private _selectedId$ = new BehaviorSubject<string | null>(null);
  private _zoom$ = new BehaviorSubject<number>(200);

  labelWidth$ = this._labelWidth$.asObservable();
  labelHeight$ = this._labelHeight$.asObservable();
  orientation$ = this._orientation$.asObservable();
  elements$ = this._elements$.asObservable();
  selectedId$ = this._selectedId$.asObservable();
  zoom$ = this._zoom$.asObservable();

  get labelWidth(): number { return this._labelWidth$.value; }
  get labelHeight(): number { return this._labelHeight$.value; }
  get orientation(): number { return this._orientation$.value; }
  get elements(): LabelElement[] { return this._elements$.value; }
  get selectedId(): string | null { return this._selectedId$.value; }
  get zoom(): number { return this._zoom$.value; }

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

  setOrientation(o: number): void {
    this._orientation$.next(o);
  }

  setZoom(z: number): void {
    this._zoom$.next(Math.max(25, Math.min(400, z)));
  }

  addElement(type: ElementType): void {
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

  updateElement(id: string, changes: Partial<LabelElement>): void {
    const updated = this.elements.map(e => e.id === id ? { ...e, ...changes } : e);
    this._elements$.next(updated);
  }

  selectElement(id: string | null): void {
    this._selectedId$.next(id);
  }

  deleteElement(id: string): void {
    this._elements$.next(this.elements.filter(e => e.id !== id));
    if (this.selectedId === id) {
      this._selectedId$.next(null);
    }
  }

  deleteSelected(): void {
    if (this.selectedId) {
      this.deleteElement(this.selectedId);
    }
  }

  moveElement(id: string, x: number, y: number): void {
    this.updateElement(id, { x, y });
  }

  resizeElement(id: string, w: number, h: number): void {
    this.updateElement(id, { width: Math.max(1, w), height: Math.max(1, h) });
  }

  moveLayerUp(id: string): void {
    const els = [...this.elements];
    const idx = els.findIndex(e => e.id === id);
    if (idx < els.length - 1) {
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      this._elements$.next(els);
    }
  }

  moveLayerDown(id: string): void {
    const els = [...this.elements];
    const idx = els.findIndex(e => e.id === id);
    if (idx > 0) {
      [els[idx], els[idx - 1]] = [els[idx - 1], els[idx]];
      this._elements$.next(els);
    }
  }

  clearAll(): void {
    this._elements$.next([]);
    this._selectedId$.next(null);
  }

  exportJSON(): string {
    const design: LabelDesign = {
      version: '1.0',
      labelWidth: this.labelWidth,
      labelHeight: this.labelHeight,
      orientation: this.orientation,
      elements: this.elements,
    };
    return JSON.stringify(design, null, 2);
  }

  importJSON(json: string): void {
    try {
      const design: LabelDesign = JSON.parse(json);
      if (design.labelWidth) this._labelWidth$.next(design.labelWidth);
      if (design.labelHeight) this._labelHeight$.next(design.labelHeight);
      if (design.orientation !== undefined) this._orientation$.next(design.orientation);
      if (design.elements) {
        this._elements$.next(design.elements);
        this.nextId = design.elements.reduce((max, e) => {
          const num = parseInt(e.id.replace('el_', ''), 10);
          return isNaN(num) ? max : Math.max(max, num + 1);
        }, this.nextId);
      }
      this._selectedId$.next(null);
    } catch (e) {
      console.error('Failed to import JSON:', e);
      alert('Failed to import design. Invalid JSON format.');
    }
  }
}
