// Este helper nos ayudará a estabilizar el Service Worker
import { Injectable } from '@angular/core';
import { SwUpdate, VersionEvent, UnrecoverableStateEvent } from '@angular/service-worker';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerUpdateService {
  private updateAvailable = false;
  private lastUpdateTime = 0;
  private readonly UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutos en milisegundos

  constructor(
    private swUpdate: SwUpdate,
    private toastController: ToastController
  ) {
    if (this.swUpdate.isEnabled) {
      // Configurar los listeners para SW updates
      this.setupUpdateListeners();
    }
  }

  /**
   * Configura los listeners para actualizaciones del service worker
   */
  private setupUpdateListeners(): void {
    // Monitorear versiones disponibles
    this.swUpdate.versionUpdates.subscribe(event => {
      console.log('[ServiceWorkerUpdateService] Version update event:', event.type);
      
      if (event.type === 'VERSION_READY') {
        this.handleVersionReadyEvent(event);
      } 
      
      if (event.type === 'VERSION_DETECTED') {
        console.log('[ServiceWorkerUpdateService] Nueva versión detectada, pero aún no lista');
      }
    });

    // Monitorear eventos no recuperables
    this.swUpdate.unrecoverable.subscribe((event: UnrecoverableStateEvent) => {
      console.error('[ServiceWorkerUpdateService] Estado no recuperable:', event.reason);
      this.showUnrecoverableError();
    });
  }
  /**
   * Maneja el evento de versión lista para instalar
   */
  private async handleVersionReadyEvent(event: VersionEvent): Promise<void> {
    // Comprobar si ya mostramos una actualización recientemente
    const now = Date.now();
    if (this.updateAvailable && now - this.lastUpdateTime < this.UPDATE_INTERVAL) {
      console.log('[ServiceWorkerUpdateService] Actualización reciente, no mostrando otra', 
        Math.floor((now - this.lastUpdateTime) / 1000), 'segundos desde la última');
      return;
    }
    
    this.updateAvailable = true;
    this.lastUpdateTime = now;
    
    console.log('[ServiceWorkerUpdateService] Nueva versión lista para instalar', {
      type: event.type
    });
    
    // Mostrar un toast con opción para actualizar
    await this.showUpdateToast();
  }

  /**
   * Muestra un toast con la opción de actualizar
   */
  private async showUpdateToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: 'Hay una nueva versión disponible. ¿Quieres actualizar?',
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'Actualizar',
          handler: () => {
            this.activateUpdate();
          }
        },
        {
          text: 'Ahora no',
          role: 'cancel'
        }
      ],
      duration: 10000
    });
    
    await toast.present();
  }

  /**
   * Activa la actualización y recarga la aplicación
   */
  private activateUpdate(): void {
    console.log('[ServiceWorkerUpdateService] Activando actualización...');
    
    this.swUpdate.activateUpdate().then(() => {
      console.log('[ServiceWorkerUpdateService] Actualización activada, recargando...');
      document.location.reload();
    }).catch(err => {
      console.error('[ServiceWorkerUpdateService] Error al activar actualización:', err);
    });
  }

  /**
   * Muestra un mensaje cuando el service worker está en un estado no recuperable
   */
  private async showUnrecoverableError(): Promise<void> {
    const toast = await this.toastController.create({
      header: 'Error de actualización',
      message: 'Ocurrió un problema con la aplicación. Por favor, recarga la página.',
      position: 'middle',
      color: 'danger',
      buttons: [
        {
          text: 'Recargar',
          handler: () => {
            window.location.reload();
          }
        }
      ]
    });
    
    await toast.present();
  }
}
