import { Injectable } from '@angular/core';
import { Platform, ToastController } from '@ionic/angular';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any;
  
  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private swPush: SwPush,
    private http: HttpClient
  ) {
    // Capturar el evento beforeinstallprompt para mostrar el prompt personalizado
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.promptEvent = e;
      this.showInstallPrompt();
    });
    
    // Escuchar cuando la instalación se completa
    window.addEventListener('appinstalled', () => {
      this.promptEvent = null;
      this.showInstalledToast();
    });
  }
  
  // Verificar si la app está instalada
  isPwaInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }
  
  // Verificar si se puede instalar la PWA
  canInstallPwa(): boolean {
    return !!this.promptEvent && !this.isPwaInstalled();
  }
  
  // Mostrar prompt de instalación automáticamente después de cierto tiempo
  showInstallPrompt(): void {
    if (this.canInstallPwa()) {
      setTimeout(async () => {
        const toast = await this.toastController.create({
          header: '¡Instala nuestra app!',
          message: 'Instala esta app en tu dispositivo para acceso rápido y funcionalidad offline.',
          position: 'bottom',
          buttons: [
            {
              text: 'Instalar',
              handler: () => {
                this.installPwa();
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
      }, 30000); // Mostrar después de 30 segundos de uso
    }
  }
  
  // Instalar la PWA
  installPwa(): void {
    if (this.promptEvent) {
      this.promptEvent.prompt();
      
      this.promptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó instalar la app');
        } else {
          console.log('El usuario rechazó instalar la app');
        }
        this.promptEvent = null;
      });
    }
  }
  
  // Mostrar toast cuando la app se ha instalado correctamente
  async showInstalledToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: '¡Aplicación instalada correctamente!',
      duration: 3000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }
    // Suscribirse a notificaciones push
  subscribeToPush(): Promise<PushSubscription> {
    if (!this.swPush.isEnabled) {
      return Promise.reject(new Error('Las notificaciones push no están disponibles en este navegador'));
    }
    
    // La clave pública VAPID debe configurarse en el entorno
    // Ejemplo: vapidPublicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
    const serverPublicKey = environment.vapidPublicKey || '';
    
    if (!serverPublicKey) {
      console.warn('La clave pública VAPID no está configurada');
      return Promise.reject(new Error('La clave pública VAPID no está configurada'));
    }
    
    return this.swPush.requestSubscription({
      serverPublicKey
    })
    .then(subscription => {
      // Enviar la suscripción al servidor
      // this.sendSubscriptionToServer(subscription);
      return subscription;
    });
  }
  
  // Enviar la suscripción al servidor
  private sendSubscriptionToServer(subscription: PushSubscription): Promise<any> {
    // Esta función debería implementarse cuando se tenga un endpoint
    // en el servidor para guardar las suscripciones
    const subscriptionObject = subscription.toJSON();
    
    // Ejemplo de envío al servidor
    // return this.http.post(`${environment.apiUrl}/push-subscriptions`, subscriptionObject).toPromise();
    
    // Por ahora, solo registramos en consola
    console.log('Suscripción a enviar al servidor:', subscriptionObject);
    return Promise.resolve();
  }
}
