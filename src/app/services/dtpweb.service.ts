import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PrinterInfo } from '../models/printer.model';

declare const dtpweb: any;

@Injectable({ providedIn: 'root' })
export class DtpwebService {
  private api: any = null;
  private _printerAvailable$ = new BehaviorSubject<boolean>(false);
  private _printers$ = new BehaviorSubject<PrinterInfo[]>([]);
  private _selectedPrinter$ = new BehaviorSubject<string>('');
  private _log$ = new BehaviorSubject<string[]>([]);
  private _previewImages$ = new BehaviorSubject<string[]>([]);
  private _printerOpened$ = new BehaviorSubject<boolean>(false);

  printerAvailable$ = this._printerAvailable$.asObservable();
  printers$ = this._printers$.asObservable();
  selectedPrinter$ = this._selectedPrinter$.asObservable();
  log$ = this._log$.asObservable();
  previewImages$ = this._previewImages$.asObservable();
  printerOpened$ = this._printerOpened$.asObservable();

  get printerAvailable(): boolean {
    return this._printerAvailable$.value;
  }

  get printers(): PrinterInfo[] {
    return this._printers$.value;
  }

  get selectedPrinter(): string {
    return this._selectedPrinter$.value;
  }

  get printerOpened(): boolean {
    return this._printerOpened$.value;
  }

  init(): void {
    if (typeof dtpweb === 'undefined') {
      this.addLog('dtpweb library not loaded');
      this._printerAvailable$.next(false);
      return;
    }
    this.api = dtpweb.getInstance();
    this.checkServer();
  }

  private checkServer(): void {
    if (!this.api) return;
    this.api.checkPlugin((resp: any) => {
      if (resp.statusCode === 0) {
        this.addLog('Print helper detected');
        this._printerAvailable$.next(true);
        this.loadPrinters();
      } else {
        this.addLog('Print helper not detected');
        this._printerAvailable$.next(false);
        alert('未检测到打印助手，请检查是否已安装！\nPrint helper not detected. Please install it first.');
      }
    });
  }

  private loadPrinters(): void {
    if (!this.api) return;
    try {
      const printers = this.api.getPrinters({ onlyLocal: false });
      if (printers instanceof Array && printers.length > 0) {
        this._printers$.next(printers);
        const first = printers[0];
        const name = first.deviceName || first.name;
        this._selectedPrinter$.next(name);
        this.addLog(`Found ${printers.length} printer(s): ${printers.map((p: any) => p.deviceName || p.name).join(', ')}`);
      } else {
        this._printers$.next([]);
        this._printerAvailable$.next(false);
        alert('未检测到打印机，请检查打印机连接！\nNo printer detected. Please check connection.');
        this.addLog('No printers found');
      }
    } catch (e) {
      this.addLog('Error loading printers: ' + e);
      this._printerAvailable$.next(false);
    }
  }

  setSelectedPrinter(name: string): void {
    this._selectedPrinter$.next(name);
  }

  openPrinter(callback?: (success: boolean) => void): void {
    if (!this.api || !this.selectedPrinter) {
      callback?.(false);
      return;
    }
    this.api.openPrinter(this.selectedPrinter, (success: boolean) => {
      this._printerOpened$.next(success);
      if (success) {
        this.addLog(`Printer opened: ${this.selectedPrinter}`);
      } else {
        this.addLog('Failed to open printer');
      }
      callback?.(success);
    });
  }

  closePrinter(): void {
    if (!this.api) return;
    this.api.closePrinter();
    this._printerOpened$.next(false);
    this.addLog('Printer closed');
  }

  isPrinterOpened(): boolean {
    if (!this.api) return false;
    return this.api.isPrinterOpened();
  }

  getPrinterName(): string {
    if (!this.api) return '';
    return this.api.getPrinterName();
  }

  getPrinterDPI(): any {
    if (!this.api) return null;
    return this.api.getPrinterDPI();
  }

  showProperty(showDocument: boolean): void {
    if (!this.api) return;
    this.api.showProperty({
      showDocument,
      printerName: this.selectedPrinter,
    });
  }

  printLabel(
    labelWidth: number,
    labelHeight: number,
    orientation: number,
    elements: any[],
    gapType: number,
    printSpeed: number,
    printDarkness: number,
    printMode: number,
    callback?: (result: any) => void
  ): void {
    if (!this.api) {
      this.addLog('Error: API not initialized');
      return;
    }

    if (!this.selectedPrinter) {
      this.addLog('Error: No printer selected');
      alert('No printer selected');
      return;
    }

    this.addLog(`Starting print job for: ${this.selectedPrinter}`);

    const action = this.getJobAction(printMode);
    this.addLog(`Job action: 0x${action.toString(16)}`);

    const startResult = this.api.startJob({
      width: labelWidth,
      height: labelHeight,
      orientation,
      jobName: 'Label Designer',
      action,
      gapType,
      printDarkness,
      printSpeed,
    });

    if (!startResult) {
      this.addLog('Failed to start job - trying to open printer first');
      this.api.openPrinter(this.selectedPrinter, (success: boolean) => {
        if (!success) {
          this.addLog('Failed to open printer');
          alert('Failed to open printer. Please check connection.');
          return;
        }
        this.addLog('Printer opened successfully');
        this._printerOpened$.next(true);
        this.executePrintJob(labelWidth, labelHeight, orientation, elements, gapType, printSpeed, printDarkness, printMode, action, callback);
      });
    } else {
      this.addLog('Job started successfully');
      this.executePrintJob(labelWidth, labelHeight, orientation, elements, gapType, printSpeed, printDarkness, printMode, action, callback);
    }
  }

  private executePrintJob(
    labelWidth: number,
    labelHeight: number,
    orientation: number,
    elements: any[],
    gapType: number,
    printSpeed: number,
    printDarkness: number,
    printMode: number,
    action: number,
    callback?: (result: any) => void
  ): void {
    if (!this.api) return;

    const startResult = this.api.startJob({
      width: labelWidth,
      height: labelHeight,
      orientation,
      jobName: 'Label Designer',
      action,
      gapType,
      printDarkness,
      printSpeed,
    });

    if (!startResult) {
      this.addLog('Failed to start print job');
      alert('Failed to start print job');
      return;
    }

    this.addLog(`Drawing ${elements.length} element(s)`);

    for (const el of elements) {
      try {
        this.drawElement(el);
      } catch (e) {
        this.addLog(`Error drawing element ${el.type}: ${e}`);
      }
    }

    this.addLog('Committing job...');

    this.api.commitJob((res: any) => {
      this.addLog('Job committed');
      if (res) {
        if (res.previewData) {
          this._previewImages$.next(res.previewData);
          this.addLog(`Preview: ${res.previewData.length} page(s)`);
        }
        if (res.printData) {
          this.addLog('Print data generated');
        }
      }

      if (printMode === 0) {
        this.addLog('Closing printer after print');
        this.api.closePrinter();
        this._printerOpened$.next(false);
      }

      callback?.(res);
    });
  }

  private drawElement(el: any): void {
    if (!this.api) return;
    const base = {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      orientation: el.orientation || 0,
    };

    switch (el.type) {
      case 'text':
        this.api.drawText({
          ...base,
          text: el.text || 'Text',
          fontName: el.fontName || 'Arial',
          fontHeight: el.fontHeight || 4,
          fontStyle: el.fontStyle || 0,
          horizontalAlignment: el.horizontalAlignment || 0,
          verticalAlignment: el.verticalAlignment || 0,
          autoReturn: el.autoReturn || 1,
          charSpace: el.charSpace || 0,
          lineSpace: el.lineSpace || 1,
        });
        break;
      case 'qrcode':
        this.api.draw2DQRCode({
          ...base,
          text: el.text || '',
          eccLevel: el.eccLevel || 0,
          qrcPixels: el.qrcPixels || 2,
        });
        break;
      case 'barcode':
        this.api.draw1DBarcode({
          ...base,
          text: el.text || '1234567890',
          type: el.barcodeType || 0,
          textHeight: el.textHeight || 5,
          barPixels: el.barPixels || 2,
        });
        break;
      case 'image':
        if (el.imageFile) {
          this.api.drawImage({
            ...base,
            imageFile: el.imageFile,
            threshold: el.threshold || 192,
          });
        }
        break;
      case 'rectangle':
        if (el.cornerWidth > 0 || el.cornerHeight > 0) {
          this.api.drawRoundRectangle({
            ...base,
            lineWidth: el.lineWidth || 0.4,
            fill: el.fill || false,
            cornerWidth: el.cornerWidth || 0,
            cornerHeight: el.cornerHeight || 0,
          });
        } else {
          this.api.drawRectangle({
            ...base,
            lineWidth: el.lineWidth || 0.4,
            fill: el.fill || false,
          });
        }
        break;
      case 'ellipse':
        this.api.drawEllipse({
          ...base,
          lineWidth: el.lineWidth || 0.4,
          fill: el.fill || false,
        });
        break;
      case 'circle':
        this.api.drawCircle({
          x: el.x + (el.radius || el.width / 2),
          y: el.y + (el.radius || el.height / 2),
          radius: el.radius || el.width / 2,
          lineWidth: el.lineWidth || 0.4,
          fill: el.fill || false,
        });
        break;
      case 'line':
        this.api.drawLine({
          x1: el.x1 ?? el.x,
          y1: el.y1 ?? el.y,
          x2: el.x2 ?? el.x + el.width,
          y2: el.y2 ?? el.y,
          lineWidth: el.lineWidth || 0.4,
          dashLens: el.dashLens,
        });
        break;
    }
  }

  private getJobAction(printMode: number): number {
    if (printMode === 1) return 0x02;
    if (printMode === 2) return 0x82;
    if (printMode === 3) return 0x01;
    return 0x1000;
  }

  addLog(msg: string): void {
    const ts = new Date().toLocaleTimeString();
    this._log$.next([`[${ts}] ${msg}`, ...this._log$.value].slice(0, 100));
  }

  clearLog(): void {
    this._log$.next([]);
  }

  clearPreview(): void {
    this._previewImages$.next([]);
  }
}
