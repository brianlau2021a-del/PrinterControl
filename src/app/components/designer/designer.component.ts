import { Component, OnInit, HostListener } from '@angular/core';
import { DesignService } from '../../services/design.service';
import { DtpwebService } from '../../services/dtpweb.service';

@Component({
  selector: 'app-designer',
  templateUrl: './designer.component.html',
})
export class DesignerComponent implements OnInit {
  leftPanelWidth = 240;
  rightPanelWidth = 320;
  bottomPanelHeight = 200;
  
  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  constructor(
    private design: DesignService,
    private dtpweb: DtpwebService
  ) {}

  ngOnInit(): void {
    this.dtpweb.init();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const tag = (event.target as HTMLElement).tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        this.design.deleteSelected();
      }
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) return;

    const dy = event.clientY - this.startY;
    this.bottomPanelHeight = Math.max(80, Math.min(400, this.startHeight - dy));
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  startResizeBottom(event: MouseEvent): void {
    event.preventDefault();
    this.isResizing = true;
    this.startY = event.clientY;
    this.startHeight = this.bottomPanelHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }
}
