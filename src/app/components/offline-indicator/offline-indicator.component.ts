import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-offline-indicator',
  template: `
    <div class="offline-container" [class.online]="isOnline" [class.offline]="!isOnline">
      <ion-chip *ngIf="!isOnline" color="warning" class="offline-chip">
        <ion-icon name="cloud-offline-outline"></ion-icon>
        <ion-label>Modo Offline</ion-label>
      </ion-chip>
      <ion-chip *ngIf="isOnline && showOnlineIndicator" color="success" class="online-chip">
        <ion-icon name="cloud-done-outline"></ion-icon>
        <ion-label>Conectado</ion-label>
      </ion-chip>
    </div>
  `,
  styles: [`
    .offline-container {
      margin: 10px auto;
      display: flex;
      justify-content: center;
    }
    
    .offline-chip {
      animation: pulse 2s infinite;
    }
    
    .online-chip {
      animation: fadeOut 3s forwards;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; display: none; }
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class OfflineIndicatorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOnline: boolean = true;
  showOnlineIndicator: boolean = false;
  private onlineIndicatorTimeout: any;

  constructor() {}

  ngOnInit() {}
  
  ngOnChanges() {
    // Cuando cambia a online, mostrar indicador durante unos segundos
    if (this.isOnline) {
      this.showOnlineIndicator = true;
      
      // Limpiar timeout anterior si existe
      if (this.onlineIndicatorTimeout) {
        clearTimeout(this.onlineIndicatorTimeout);
      }
      
      // Ocultar el indicador después de 5 segundos
      this.onlineIndicatorTimeout = setTimeout(() => {
        this.showOnlineIndicator = false;
      }, 5000);
    }
  }
  
  ngOnDestroy() {
    if (this.onlineIndicatorTimeout) {
      clearTimeout(this.onlineIndicatorTimeout);
    }
  }
}
