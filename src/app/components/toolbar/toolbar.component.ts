import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import { DesignService } from '../../services/design.service';
import { DtpwebService } from '../../services/dtpweb.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
})
export class ToolbarComponent implements OnInit, OnDestroy {
  labelWidth = 40;
  labelHeight = 30;
  orientation = 0;
  printerAvailable = false;

  private subs: Subscription[] = [];

  orientationOptions = [
    { value: 0, label: '0°' },
    { value: 90, label: '90°' },
    { value: 180, label: '180°' },
    { value: 270, label: '270°' },
  ];

  constructor(
    private design: DesignService,
    private dtpweb: DtpwebService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.design.labelWidth$.subscribe(v => this.labelWidth = v),
      this.design.labelHeight$.subscribe(v => this.labelHeight = v),
      this.design.orientation$.subscribe(v => this.orientation = v),
      this.dtpweb.printerAvailable$.subscribe(v => this.printerAvailable = v),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  onWidthChange(val: number): void {
    this.design.setLabelWidth(Math.max(5, val));
  }

  onHeightChange(val: number): void {
    this.design.setLabelHeight(Math.max(5, val));
  }

  onOrientationChange(val: number): void {
    this.design.setOrientation(val);
  }

  addElement(type: string): void {
    this.design.addElement(type as any);
  }

  saveDesign(): void {
    const json = this.design.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'label-design.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  loadDesign(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.design.importJSON(reader.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  clearAll(): void {
    if (confirm('Clear all elements?')) {
      this.design.clearAll();
    }
  }
}
