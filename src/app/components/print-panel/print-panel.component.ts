import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { DesignService } from '../../services/design.service';
import { DtpwebService } from '../../services/dtpweb.service';
import {
  PrinterInfo,
  PrintSettings,
  GAP_TYPE_OPTIONS,
  PRINT_SPEED_OPTIONS,
  PRINT_DARKNESS_OPTIONS,
  PRINT_MODE_OPTIONS,
  DPI_OPTIONS,
} from '../../models/printer.model';

@Component({
  selector: 'app-print-panel',
  templateUrl: './print-panel.component.html',
})
export class PrintPanelComponent implements OnInit, OnDestroy {
  printerAvailable = false;
  printers: PrinterInfo[] = [];
  selectedPrinter = '';
  logMessages: string[] = [];
  previewImages: string[] = [];
  expanded = true;

  labelWidth = 40;
  labelHeight = 30;
  elements: any[] = [];

  settings: PrintSettings = {
    gapType: 255,
    printSpeed: 255,
    printDarkness: 255,
    printMode: 1,
    printerDpi: 203,
    printerWidth: 384,
    copies: 1,
    jobName: 'Label Designer'
  };

  gapTypeOptions = GAP_TYPE_OPTIONS;
  printSpeedOptions = PRINT_SPEED_OPTIONS;
  printDarknessOptions = PRINT_DARKNESS_OPTIONS;
  printModeOptions = PRINT_MODE_OPTIONS;
  dpiOptions = DPI_OPTIONS;

  private subs: Subscription[] = [];

  constructor(
    private design: DesignService,
    private dtpweb: DtpwebService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.dtpweb.printerAvailable$.subscribe(v => this.printerAvailable = v),
      this.dtpweb.printers$.subscribe(p => this.printers = p),
      this.dtpweb.selectedPrinter$.subscribe(p => this.selectedPrinter = p),
      this.dtpweb.log$.subscribe(l => this.logMessages = l),
      this.dtpweb.previewImages$.subscribe(i => this.previewImages = i),
      this.design.labelWidth$.subscribe(v => this.labelWidth = v),
      this.design.labelHeight$.subscribe(v => this.labelHeight = v),
      this.design.elements$.subscribe(e => this.elements = e),

      this.design.printSettings$.subscribe(s => {
        if (Object.keys(s).length > 0) {
          this.settings = { ...this.settings, ...s };
        }
      })
    );
  }

  saveSettingsToDesign(): void {
    const { copies, jobName, ...coreSettings } = this.settings;
    this.design.setPrintSettings(coreSettings);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getPrinterDisplayName(p: PrinterInfo): string {
    return p.deviceName || p.name;
  }

  onPrinterChange(name: string): void {
    this.dtpweb.setSelectedPrinter(name);
  }

  openPrinter(): void {
    this.dtpweb.openPrinter();
  }

  closePrinter(): void {
    this.dtpweb.closePrinter();
  }

  isPrinterOpened(): void {
    const opened = this.dtpweb.isPrinterOpened();
    alert(opened ? 'Printer is opened' : 'Printer is not opened');
  }

  getPrinterName(): void {
    const name = this.dtpweb.getPrinterName();
    alert(name || 'No printer opened');
  }

  getPrinterDPI(): void {
    const dpi = this.dtpweb.getPrinterDPI();
    alert(dpi ? JSON.stringify(dpi) : 'No DPI info');
  }

  showProperty(): void {
    this.dtpweb.showProperty(true);
  }

  print(): void {
    if (!this.printerAvailable) {
      alert('No printer available. Please check printer connection.');
      return;
    }
    if (this.elements.length === 0) {
      alert('No elements to print. Add elements first.');
      return;
    }
    this.dtpweb.printLabel(
      this.labelWidth,
      this.labelHeight,
      0,
      this.elements,
      this.settings.gapType,
      this.settings.printSpeed,
      this.settings.printDarkness,
      0,
      this.settings.copies,
      this.settings.jobName
    );
  }

  preview(): void {
    if (!this.printerAvailable) {
      alert('No printer available. Please check printer connection.');
      return;
    }
    if (this.elements.length === 0) {
      alert('No elements to preview. Add elements first.');
      return;
    }
    this.dtpweb.printLabel(
      this.labelWidth,
      this.labelHeight,
      0,
      this.elements,
      this.settings.gapType,
      this.settings.printSpeed,
      this.settings.printDarkness,
      this.settings.printMode,
      this.settings.copies,
      this.settings.jobName
    );
  }

  clearLog(): void {
    this.dtpweb.clearLog();
  }

  clearPreview(): void {
    this.dtpweb.clearPreview();
  }

  toggleExpand(): void {
    this.expanded = !this.expanded;
  }
}
