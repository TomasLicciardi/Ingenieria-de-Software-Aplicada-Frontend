import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, catchError, from } from 'rxjs';
import { AuthService } from './auth.service';
import { OfflineService } from './offline.service';
import { CacheService } from './cache.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/posts`;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private offlineService: OfflineService,
    private cacheService: CacheService
  ) {}
  
  // Obtener encabezados con token
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers: {[key: string]: string} = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headers);
  }
  
  // Obtener todos los posts ordenados por fecha (más reciente primero)
  getPosts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?sort=date,desc`, { headers: this.getHeaders() })
      .pipe(
        map(posts => {
          // Guardar en caché para acceso offline
          this.cacheService.saveData('posts', posts);
          return posts;
        }),
        catchError(error => {
          // Si hay un error de conexión, mostramos mensaje offline
          this.offlineService.showOfflineWarning();
          
          // Intentamos obtener posts del cache
          const cachedPosts = this.cacheService.getData<any[]>('posts');
          
          // También recuperamos los posts pendientes de sincronización
          const pendingPosts = this.cacheService.getPendingItems<any>('posts');
          
          if (cachedPosts) {
            // Combinamos los posts en caché con los pendientes
            return of([...pendingPosts, ...cachedPosts]);
          }
          
          // Si no hay caché pero hay pendientes, devolvemos solo los pendientes
          if (pendingPosts.length > 0) {
            return of(pendingPosts);
          }
          
          return of([]);
        })
      );
  }

  // Obtener un post por ID
  getPost(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(post => {
          // Guardar en caché para acceso offline
          this.cacheService.saveData(`post-${id}`, post);
          return post;
        }),
        catchError(error => {
          // Si hay un error de conexión, mostramos mensaje offline
          this.offlineService.showOfflineWarning();
          
          // Intentamos obtener el post de la caché
          const cachedPost = this.cacheService.getData<any>(`post-${id}`);
          if (cachedPost) {
            return of(cachedPost);
          }
          
          // Si el ID es un ID temporal, buscamos en los pendientes
          if (typeof id === 'string' && id.startsWith('temp-')) {
            const pendingPosts = this.cacheService.getPendingItems<any>('posts');
            const pendingPost = pendingPosts.find(post => post.id === id);
            if (pendingPost) {
              return of(pendingPost);
            }
          }
          
          return of(null);
        })
      );
  }
  
  // Crear un nuevo post
  createPost(post: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, post, { headers: this.getHeaders() })
      .pipe(
        map(newPost => {
          // Al crear un nuevo post, actualizamos la caché
          const blogId = post.blog.id;
          
          // Actualizar cache de posts por blog
          const cachedBlogPosts = this.cacheService.getData<any[]>(`posts-blog-${blogId}`) || [];
          cachedBlogPosts.unshift(newPost); // Añadir al principio para mantener orden por fecha
          this.cacheService.saveData(`posts-blog-${blogId}`, cachedBlogPosts);
          
          // Actualizar cache general de posts
          const cachedPosts = this.cacheService.getData<any[]>('posts') || [];
          cachedPosts.unshift(newPost);
          this.cacheService.saveData('posts', cachedPosts);
          
          return newPost;
        }),
        catchError(error => {
          // Si hay un error de conexión, guardamos el post para sincronizar después
          this.offlineService.showOfflineWarning();
          
          // Añadir a pendientes
          const pendingPost = this.cacheService.addPendingItem('posts', post);
          
          // También actualizar cache local para que aparezca en la UI inmediatamente
          const blogId = post.blog.id;
          const cachedBlogPosts = this.cacheService.getData<any[]>(`posts-blog-${blogId}`) || [];
          cachedBlogPosts.unshift(pendingPost);
          this.cacheService.saveData(`posts-blog-${blogId}`, cachedBlogPosts);
          
          return of(pendingPost);
        })
      );
  }

  // Actualizar un post existente
  updatePost(post: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${post.id}`, post, { headers: this.getHeaders() })
      .pipe(
        map(updatedPost => {
          // Actualizar en caché
          const blogId = post.blog.id;
          
          // Actualizar cache de posts por blog
          const cachedBlogPosts = this.cacheService.getData<any[]>(`posts-blog-${blogId}`) || [];
          const blogPostIndex = cachedBlogPosts.findIndex(p => p.id === updatedPost.id);
          
          if (blogPostIndex !== -1) {
            cachedBlogPosts[blogPostIndex] = updatedPost;
            this.cacheService.saveData(`posts-blog-${blogId}`, cachedBlogPosts);
          }
          
          // Actualizar cache general de posts
          const cachedPosts = this.cacheService.getData<any[]>('posts') || [];
          const postIndex = cachedPosts.findIndex(p => p.id === updatedPost.id);
          
          if (postIndex !== -1) {
            cachedPosts[postIndex] = updatedPost;
            this.cacheService.saveData('posts', cachedPosts);
          }
          
          // Actualizar versión individual
          this.cacheService.saveData(`post-${updatedPost.id}`, updatedPost);
          
          return updatedPost;
        }),
        catchError(error => {
          // Si hay un error de conexión, guardamos para sincronizar después
          this.offlineService.showOfflineWarning();
          
          if (typeof post.id === 'string' && post.id.startsWith('temp-')) {
            // Si es un post pendiente, actualizamos en la lista de pendientes
            const pendingPosts = this.cacheService.getPendingItems<any>('posts');
            const index = pendingPosts.findIndex(p => p.id === post.id);
            
            if (index !== -1) {
              pendingPosts[index] = { ...post, pendingSync: true };
              this.cacheService.saveData('pending-posts', pendingPosts);
            }
          } else {
            // Si es un post existente, lo añadimos a pendientes de actualización
            const tempId = `temp-update-${post.id}-${Date.now()}`;
            const tempPost = { ...post, originalId: post.id, id: tempId, pendingSync: true, updateOperation: true };
            
            const pendingPosts = this.cacheService.getPendingItems<any>('posts');
            pendingPosts.push(tempPost);
            this.cacheService.saveData('pending-posts', pendingPosts);
          }
          
          return of(post);
        })
      );
  }

  // Eliminar un post
  deletePost(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(response => {
          // Actualizar caché eliminando el post
          const cachedPosts = this.cacheService.getData<any[]>('posts') || [];
          const updatedPosts = cachedPosts.filter(post => post.id !== id);
          this.cacheService.saveData('posts', updatedPosts);
          
          // También intentar eliminar de la caché específica de blog si existe
          // Aquí necesitaríamos saber el blogId, pero como no lo tenemos,
          // podríamos buscar en todas las cachés de blog
          const cacheKeys = Object.keys(localStorage);
          cacheKeys.forEach(key => {
            if (key.startsWith('posts-blog-')) {
              const posts = JSON.parse(localStorage.getItem(key) || '[]');
              const updatedPosts = posts.filter((post: any) => post.id !== id);
              localStorage.setItem(key, JSON.stringify(updatedPosts));
            }
          });
          
          // Eliminar la caché específica del post
          localStorage.removeItem(`post-${id}`);
          
          return response;
        }),
        catchError(error => {
          this.offlineService.showOfflineWarning();
          return of({ success: false, error: 'No es posible eliminar en modo offline' });
        })
      );
  }
  
  // Obtener posts de un blog específico ordenados por fecha (más reciente primero)
  getPostsByBlog(blogId: number | string): Observable<any[]> {
    // Usamos el parámetro blog.id.equals para filtrar específicamente por ese blog ID
    return this.http.get<any[]>(`${this.apiUrl}?blog.id.equals=${blogId}&sort=date,desc`, { headers: this.getHeaders() })
      .pipe(
        map(posts => {
          // Guardar en caché para acceso offline
          this.cacheService.saveData(`posts-blog-${blogId}`, posts);
          return posts;
        }),
        catchError(error => {
          // Si hay un error de conexión, mostramos mensaje offline
          this.offlineService.showOfflineWarning();
          
          // Intentamos obtener posts del cache
          const cachedBlogPosts = this.cacheService.getData<any[]>(`posts-blog-${blogId}`);
          
          // También recuperamos los posts pendientes de este blog
          const pendingPosts = this.cacheService.getPendingItems<any>('posts')
            .filter(post => post.blog && (post.blog.id === blogId || post.blog.id.toString() === blogId.toString()));
          
          if (cachedBlogPosts) {
            // Combinamos los posts en caché con los pendientes
            return of([...pendingPosts, ...cachedBlogPosts]);
          }
          
          // Si no hay caché pero hay pendientes, devolvemos solo los pendientes
          if (pendingPosts.length > 0) {
            return of(pendingPosts);
          }
          
          return of([]);
        })
      );
  }
  
  // Sincronizar posts pendientes
  syncPendingPosts(): Observable<any> {
    const pendingPosts = this.cacheService.getPendingItems<any>('posts');
    
    if (pendingPosts.length === 0) {
      return of({ success: true, syncedCount: 0 });
    }
    
    // Aquí crearemos una promesa que resolverá cuando todos los posts se hayan sincronizado
    return from(new Promise<any>(async (resolve) => {
      let syncedCount = 0;
      let failedCount = 0;
      
      for (const post of pendingPosts) {
        try {
          // Eliminar props de control
          const postToSync = { ...post };
          delete postToSync.pendingSync;
          
          // Si es una operación de actualización
          if (postToSync.updateOperation) {
            delete postToSync.updateOperation;
            const originalId = postToSync.originalId;
            delete postToSync.originalId;
            
            // Restaurar ID original
            postToSync.id = originalId;
            
            await this.http.put<any>(`${this.apiUrl}/${originalId}`, postToSync, { headers: this.getHeaders() }).toPromise();
          } 
          // Si es una creación nueva (ID temporal)
          else if (typeof postToSync.id === 'string' && postToSync.id.startsWith('temp-')) {
            delete postToSync.id; // El servidor asignará un nuevo ID
            await this.http.post<any>(this.apiUrl, postToSync, { headers: this.getHeaders() }).toPromise();
          }
          
          syncedCount++;
        } catch (error) {
          console.error('Error al sincronizar post:', error);
          failedCount++;
        }
      }
      
      // Si todos se sincronizaron, limpiar pendientes
      if (failedCount === 0) {
        this.cacheService.clearPendingItems('posts');
      } else {
        // TODO: Gestionar los que fallaron (reintento, notificación, etc.)
      }
      
      resolve({ success: failedCount === 0, syncedCount, failedCount });
    }));
  }
}
