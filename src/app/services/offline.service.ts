import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfflineService {
  
  private online$ = new BehaviorSubject<boolean>(navigator.onLine);
  private lastOfflineToastTime = 0; // Para evitar mostrar múltiples toasts
  private readonly TOAST_INTERVAL = 10000; // 10 segundos entre toasts
  
  constructor(
    private toastController: ToastController
  ) {
    // Detectar cambios en la conexión
    window.addEventListener('online', () => {
      console.log('[OfflineService] Conexión recuperada');
      this.online$.next(true);
    });
    
    window.addEventListener('offline', () => {
      console.log('[OfflineService] Conexión perdida');
      this.online$.next(false);
    });
    
    // Verificación periódica de conexión (ping al servidor)
    setInterval(() => this.checkServerConnection(), 30000);
  }

  /**
   * Verificar si realmente podemos conectarnos al servidor
   * (Estar online no garantiza acceso al servidor)
   */
  private async checkServerConnection(): Promise<void> {
    if (!navigator.onLine) {
      // Si el navegador ya sabe que estamos offline, no hacemos nada
      return;
    }
    
    try {
      // Hacer un ping al servidor
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok && this.online$.value === false) {
        // Estábamos offline pero ahora podemos conectar
        console.log('[OfflineService] Servidor disponible de nuevo');
        this.online$.next(true);
      }
    } catch (error) {
      console.log('[OfflineService] Error al verificar conexión al servidor:', error);
      
      if (this.online$.value === true) {
        // Estábamos online pero no podemos conectar al servidor
        this.online$.next(false);
      }
    }
  }

  /**
   * Obtiene un Observable que indica si la aplicación está online
   */
  public getOnlineStatus(): Observable<boolean> {
    return this.online$.asObservable();
  }

  /**
   * Verificar si hay conexión actualmente (valor actual)
   */
  public isOnline(): boolean {
    return this.online$.value;
  }

  /**
   * Mostrar un mensaje de estado offline al usuario
   */
  public async showOfflineWarning() {
    const now = Date.now();
    
    // Evitar mostrar múltiples toasts en un período corto
    if (now - this.lastOfflineToastTime < this.TOAST_INTERVAL) {
      return;
    }
    
    this.lastOfflineToastTime = now;
    
    const toast = await this.toastController.create({
      message: 'Estás en modo offline. Algunas funciones pueden estar limitadas.',
      duration: 3000,
      position: 'top',
      color: 'warning'
    });
    await toast.present();
  }

  /**
   * Mostrar un mensaje cuando se recupera la conexión
   */
  public async showOnlineWarning() {
    const toast = await this.toastController.create({
      message: 'Conexión recuperada. Sincronizando datos...',
      duration: 3000,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }
}
