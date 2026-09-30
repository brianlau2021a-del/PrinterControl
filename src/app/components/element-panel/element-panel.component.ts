import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DesignService } from '../../services/design.service';
import { LabelElement, ELEMENT_TYPE_LABELS } from '../../models/element.model';

@Component({
  selector: 'app-element-panel',
  templateUrl: './element-panel.component.html',
})
export class ElementPanelComponent implements OnInit, OnDestroy {
  elements: LabelElement[] = [];
  selectedId: string | null = null;
  typeLabels = ELEMENT_TYPE_LABELS;

  private subs: Subscription[] = [];

  constructor(private design: DesignService) {}

  ngOnInit(): void {
    this.subs.push(
      this.design.elements$.subscribe(els => this.elements = els),
      this.design.selectedId$.subscribe(id => this.selectedId = id),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  selectElement(id: string): void {
    this.design.selectElement(id);
  }

  deleteElement(id: string, event: Event): void {
    event.stopPropagation();
    this.design.deleteElement(id);
  }

  moveUp(id: string, event: Event): void {
    event.stopPropagation();
    this.design.moveLayerUp(id);
  }

  moveDown(id: string, event: Event): void {
    event.stopPropagation();
    this.design.moveLayerDown(id);
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'text': return 'T';
      case 'qrcode': return 'QR';
      case 'barcode': return '|||';
      case 'image': return 'IMG';
      case 'rectangle': return 'R';
      case 'ellipse': return 'E';
      case 'circle': return 'C';
      case 'line': return '/';
      default: return '?';
    }
  }
}
