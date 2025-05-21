import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { OfflineService } from './services/offline.service';
import { BlogService } from './services/blog.service';
import { PostService } from './services/post.service';
import { CacheService } from './services/cache.service';
import { PwaService } from './services/pwa.service';
import { Subscription, forkJoin } from 'rxjs';
import { Platform, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private onlineStatusSubscription: Subscription | null = null;
  isOnline: boolean = navigator.onLine;
  isSyncing: boolean = false;
  canInstall: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private offlineService: OfflineService,
    private platform: Platform,
    private blogService: BlogService,
    private postService: PostService,
    private toastController: ToastController,
    private cacheService: CacheService,
    private pwaService: PwaService
  ) {}

  ngOnInit() {
    // Iniciar monitoreo de estado de conexión
    this.onlineStatusSubscription = this.offlineService.getOnlineStatus().subscribe(isOnline => {
      // Solo mostramos los mensajes cuando hay un cambio de estado
      if (this.isOnline !== isOnline) {
        this.isOnline = isOnline;
        
        if (isOnline) {
          this.offlineService.showOnlineWarning();
          this.sincronizarDatosPendientes();
        } else {
          this.offlineService.showOfflineWarning();
        }
      }
    });
    
    // Verificar si hay actualizaciones de PWA al iniciar
    this.platform.resume.subscribe(() => {
      // Cuando la app vuelve a primer plano, verificamos conexión
      if (navigator.onLine) {
        this.sincronizarDatosPendientes();
      }
    });
    
    // Verificar si podemos instalar la PWA
    this.canInstall = this.pwaService.canInstallPwa();
    
    // Verificar periódicamente si podemos instalar
    setInterval(() => {
      this.canInstall = this.pwaService.canInstallPwa();
    }, 30000);
  }

  ngOnDestroy() {
    // Limpiar las suscripciones
    if (this.onlineStatusSubscription) {
      this.onlineStatusSubscription.unsubscribe();
      this.onlineStatusSubscription = null;
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  // Método para sincronizar datos almacenados localmente cuando hay conexión
  sincronizarDatosPendientes() {
    if (!this.isOnline || this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    
    // Usar forkJoin para sincronizar blogs y posts en paralelo
    forkJoin({
      blogs: this.blogService.syncPendingBlogs(),
      posts: this.postService.syncPendingPosts()
    }).subscribe(
      async results => {
        const totalSynced = results.blogs.syncedCount + results.posts.syncedCount;
        const totalFailed = (results.blogs.failedCount || 0) + (results.posts.failedCount || 0);
        
        this.isSyncing = false;
        
        // Actualizar metadata de la caché
        this.cacheService.updateMetadata();
        
        // Si hubo sincronización, mostrar mensaje
        if (totalSynced > 0 || totalFailed > 0) {
          let message: string;
          let color: string;
          
          if (totalFailed === 0) {
            message = `Sincronización completada: ${totalSynced} elementos sincronizados.`;
            color = 'success';
          } else {
            message = `Sincronización parcial: ${totalSynced} elementos sincronizados, ${totalFailed} con errores.`;
            color = 'warning';
          }
          
          const toast = await this.toastController.create({
            message,
            duration: 3000,
            position: 'top',
            color
          });
          await toast.present();
        }
      },
      async error => {
        console.error('Error al sincronizar datos:', error);
        this.isSyncing = false;
        
        const toast = await this.toastController.create({
          message: 'Error al sincronizar datos. Intente nuevamente más tarde.',
          duration: 3000,
          position: 'top',
          color: 'danger'
        });
        await toast.present();
      }
    );
  }
  
  // Instalar la PWA
  instalarPwa() {
    this.pwaService.installPwa();
  }
  
  // Suscribir a notificaciones push
  async suscribirNotificaciones() {
    try {
      await this.pwaService.subscribeToPush();
      const toast = await this.toastController.create({
        message: 'Te has suscrito correctamente a las notificaciones',
        duration: 3000,
        position: 'top',
        color: 'success'
      });
      await toast.present();
    } catch (error) {
      console.error('Error al suscribirse a las notificaciones:', error);
      const toast = await this.toastController.create({
        message: 'No se pudo suscribir a las notificaciones. Verifica los permisos.',
        duration: 3000,
        position: 'top',
        color: 'danger'
      });
      await toast.present();
    }
  }
}
