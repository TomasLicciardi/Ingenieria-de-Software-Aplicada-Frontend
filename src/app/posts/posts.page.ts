import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastController, IonicModule } from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-posts',
  templateUrl: './posts.page.html',
  styleUrls: ['./posts.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class PostsPage implements OnInit {
  posts: any[] = [];
  blogId: number = 0;
  showModal = false;newPost = {
    title: '',
    content: '',
    date: new Date().toISOString(),
    blog: {
      id: 0
    }
  };

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController
  ) { }
  ngOnInit() {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Obtener el ID del blog de los parámetros de la URL
    this.route.queryParams.subscribe({
      next: (params) => {
        this.blogId = +params['blogId'];
        if (!this.blogId) {
          this.router.navigate(['/blogs']);
          return;
        }
        this.loadPosts();
      }
    });
  }
  loadPosts() {
    this.postService.getPostsByBlog(this.blogId).subscribe({
      next: (data) => {
        this.posts = data;
      },
      error: (error) => {
        console.error('Error al cargar posts:', error);
        // Si hay un error 401 (no autorizado), redirigir al login
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.presentToast('Error al cargar posts', 'danger');
      }
    });
  }
  showAddPostModal() {
    this.newPost = {
      title: '',
      content: '',
      date: new Date().toISOString(),
      blog: {
        id: this.blogId || 0
      }
    };
    this.showModal = true;
  }
  createPost() {
    if (!this.newPost.title) {
      this.presentToast('El título es requerido', 'warning');
      return;
    }
    if (!this.newPost.content) {
      this.presentToast('El contenido es requerido', 'warning');
      return;
    }

    this.postService.createPost(this.newPost).subscribe({
      next: () => {
        this.presentToast('Post creado con éxito', 'success');
        this.showModal = false;
        this.loadPosts();
      },
      error: (error) => {
        console.error('Error al crear post:', error);
        this.presentToast('Error al crear post', 'danger');
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
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
