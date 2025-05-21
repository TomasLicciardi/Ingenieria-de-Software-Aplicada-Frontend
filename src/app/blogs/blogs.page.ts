import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { BlogService } from '../services/blog.service';
import { OfflineService } from '../services/offline.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OfflineIndicatorComponent } from '../components/offline-indicator/offline-indicator.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-blogs',
  templateUrl: './blogs.page.html',
  styleUrls: ['./blogs.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, OfflineIndicatorComponent]
})
export class BlogsPage implements OnInit, OnDestroy {
  blogs: any[] = [];
  showModal = false;
  isOnline: boolean = navigator.onLine;
  private onlineStatusSubscription: Subscription | null = null;
  
  newBlog = {
    name: '',
    handle: ''
  };
  constructor(
    private blogService: BlogService,
    private authService: AuthService,
    private offlineService: OfflineService,
    private router: Router,
    private toastController: ToastController
  ) { }
  ngOnInit() {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }
    
    // Suscribirse al estado de conexión
    this.onlineStatusSubscription = this.offlineService.getOnlineStatus().subscribe(isOnline => {
      this.isOnline = isOnline;
    });
    
    this.loadBlogs();
  }
  
  ngOnDestroy() {
    if (this.onlineStatusSubscription) {
      this.onlineStatusSubscription.unsubscribe();
      this.onlineStatusSubscription = null;
    }
  }

  ionViewWillEnter() {
    this.loadBlogs();
  }
  loadBlogs() {
    this.blogService.getBlogs().subscribe({
      next: (data) => {
        this.blogs = data;
      },
      error: (error) => {
        console.error('Error al cargar blogs:', error);
        // Si hay un error 401 (no autorizado), redirigir al login
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.presentToast('Error al cargar blogs', 'danger');
      }
    });
  }

  goToPosts(blogId: number) {
    this.router.navigate(['/posts'], { queryParams: { blogId } });
  }
  showAddBlogModal() {
    const userLogin = this.authService.getUserLogin();
    // Inicializar con el nombre de usuario para asociar blogs al usuario actual
    this.newBlog = { 
      name: '', 
      handle: userLogin ? userLogin.toLowerCase() + '-' : ''
    };
    this.showModal = true;
  }
  createBlog() {
    if (this.newBlog.name.length < 3) {
      this.presentToast('El nombre debe tener al menos 3 caracteres', 'warning');
      return;
    }
    if (this.newBlog.handle.length < 2) {
      this.presentToast('El handle debe tener al menos 2 caracteres', 'warning');
      return;
    }

    this.blogService.createBlog(this.newBlog).subscribe({
      next: () => {
        this.presentToast('Blog creado con éxito', 'success');
        this.showModal = false;
        this.loadBlogs();
      },
      error: (error) => {
        console.error('Error al crear blog:', error);
        this.presentToast('Error al crear blog', 'danger');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }
}
