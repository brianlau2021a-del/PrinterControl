import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { DesignerComponent } from './components/designer/designer.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ElementPanelComponent } from './components/element-panel/element-panel.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { PrintPanelComponent } from './components/print-panel/print-panel.component';

@NgModule({
  declarations: [
    AppComponent,
    DesignerComponent,
    ToolbarComponent,
    ElementPanelComponent,
    CanvasComponent,
    PropertiesPanelComponent,
    PrintPanelComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
