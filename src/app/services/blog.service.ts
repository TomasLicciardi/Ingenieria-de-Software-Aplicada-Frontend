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
export class BlogService {
  private apiUrl = `${environment.apiUrl}/blogs`;
  
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
  
  // Obtener todos los blogs ordenados por fecha de creación (más reciente primero)
  // y filtrados para mostrar solo los blogs del usuario actual
  getBlogs(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?sort=createdDate,desc`, { headers: this.getHeaders() })
      .pipe(
        map(blogs => {
          const userLogin = this.authService.getUserLogin();
          // Si tenemos userLogin, filtramos los blogs que pertenecen al usuario actual
          if (userLogin) {
            const userHandle = userLogin.toLowerCase();
            const filteredBlogs = blogs.filter(blog => blog.handle.includes(userHandle));
            
            // Guardamos en caché para acceso offline
            this.cacheService.saveData('blogs', filteredBlogs);
            
            return filteredBlogs;
          }
          return blogs;
        }),
        catchError(error => {
          // Si hay un error de conexión, mostramos mensaje offline
          this.offlineService.showOfflineWarning();
          
          // Intentamos obtener blogs del cache
          const cachedBlogs = this.cacheService.getData<any[]>('blogs');
          
          // También recuperamos los blogs pendientes de sincronización
          const pendingBlogs = this.cacheService.getPendingItems<any>('blogs');
          
          if (cachedBlogs) {
            // Combinamos los blogs en caché con los pendientes
            return of([...pendingBlogs, ...cachedBlogs]);
          }
          
          // Si no hay caché pero hay pendientes, devolvemos solo los pendientes
          if (pendingBlogs.length > 0) {
            return of(pendingBlogs);
          }
          
          return of([]);
        })
      );
  }

  // Obtener un blog por ID
  getBlog(id: number | string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        map(blog => {
          // Guardamos en caché para acceso offline
          this.cacheService.saveData(`blog-${id}`, blog);
          return blog;
        }),
        catchError(error => {
          // Si hay un error de conexión, mostramos mensaje offline
          this.offlineService.showOfflineWarning();
          
          // Intentamos obtener el blog de la caché
          const cachedBlog = this.cacheService.getData<any>(`blog-${id}`);
          if (cachedBlog) {
            return of(cachedBlog);
          }
          
          // Si el ID es un ID temporal, buscamos en los pendientes
          if (typeof id === 'string' && id.startsWith('temp-')) {
            const pendingBlogs = this.cacheService.getPendingItems<any>('blogs');
            const pendingBlog = pendingBlogs.find(blog => blog.id === id);
            if (pendingBlog) {
              return of(pendingBlog);
            }
          }
          
          return of(null);
        })
      );
  }
  
  // Crear un nuevo blog
  createBlog(blog: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, blog, { headers: this.getHeaders() })
      .pipe(
        map(newBlog => {
          // Al crear un nuevo blog, actualizamos la caché
          const cachedBlogs = this.cacheService.getData<any[]>('blogs') || [];
          cachedBlogs.push(newBlog);
          this.cacheService.saveData('blogs', cachedBlogs);
          
          return newBlog;
        }),
        catchError(error => {
          // Si hay un error de conexión, guardamos el blog para sincronizar después
          this.offlineService.showOfflineWarning();
          
          // Añadir a pendientes
          const pendingBlog = this.cacheService.addPendingItem('blogs', blog);
          
          return of(pendingBlog);
        })
      );
  }

  // Actualizar un blog existente
  updateBlog(blog: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${blog.id}`, blog, { headers: this.getHeaders() })
      .pipe(
        map(updatedBlog => {
          // Actualizar en caché
          const cachedBlogs = this.cacheService.getData<any[]>('blogs') || [];
          const index = cachedBlogs.findIndex(b => b.id === updatedBlog.id);
          
          if (index !== -1) {
            cachedBlogs[index] = updatedBlog;
            this.cacheService.saveData('blogs', cachedBlogs);
          }
          
          // Actualizar versión individual
          this.cacheService.saveData(`blog-${updatedBlog.id}`, updatedBlog);
          
          return updatedBlog;
        }),
        catchError(error => {
          // Si hay un error de conexión, guardamos para sincronizar después
          this.offlineService.showOfflineWarning();
          
          if (typeof blog.id === 'string' && blog.id.startsWith('temp-')) {
            // Si es un blog pendiente, actualizamos en la lista de pendientes
            const pendingBlogs = this.cacheService.getPendingItems<any>('blogs');
            const index = pendingBlogs.findIndex(b => b.id === blog.id);
            
            if (index !== -1) {
              pendingBlogs[index] = { ...blog, pendingSync: true };
              this.cacheService.saveData('pending-blogs', pendingBlogs);
            }
          } else {
            // Si es un blog existente, lo añadimos a pendientes de actualización
            // con un ID temporal para no confundirlo con el original
            const tempId = `temp-update-${blog.id}-${Date.now()}`;
            const tempBlog = { ...blog, originalId: blog.id, id: tempId, pendingSync: true, updateOperation: true };
            
            const pendingBlogs = this.cacheService.getPendingItems<any>('blogs');
            pendingBlogs.push(tempBlog);
            this.cacheService.saveData('pending-blogs', pendingBlogs);
          }
          
          return of(blog);
        })
      );
  }
  
  // Sincronizar blogs pendientes
  syncPendingBlogs(): Observable<any> {
    const pendingBlogs = this.cacheService.getPendingItems<any>('blogs');
    
    if (pendingBlogs.length === 0) {
      return of({ success: true, syncedCount: 0 });
    }
    
    // Aquí crearemos una promesa que resolverá cuando todos los blogs se hayan sincronizado
    return from(new Promise<any>(async (resolve) => {
      let syncedCount = 0;
      let failedCount = 0;
      
      for (const blog of pendingBlogs) {
        try {
          // Eliminar props de control
          const blogToSync = { ...blog };
          delete blogToSync.pendingSync;
          
          // Si es una operación de actualización
          if (blogToSync.updateOperation) {
            delete blogToSync.updateOperation;
            const originalId = blogToSync.originalId;
            delete blogToSync.originalId;
            
            // Restaurar ID original
            blogToSync.id = originalId;
            
            await this.http.put<any>(`${this.apiUrl}/${originalId}`, blogToSync, { headers: this.getHeaders() }).toPromise();
          } 
          // Si es una creación nueva (ID temporal)
          else if (typeof blogToSync.id === 'string' && blogToSync.id.startsWith('temp-')) {
            delete blogToSync.id; // El servidor asignará un nuevo ID
            await this.http.post<any>(this.apiUrl, blogToSync, { headers: this.getHeaders() }).toPromise();
          }
          
          syncedCount++;
        } catch (error) {
          console.error('Error al sincronizar blog:', error);
          failedCount++;
        }
      }
      
      // Si todos se sincronizaron, limpiar pendientes
      if (failedCount === 0) {
        this.cacheService.clearPendingItems('blogs');
      } else {
        // TODO: Gestionar los que fallaron (reintento, notificación, etc.)
      }
      
      resolve({ success: failedCount === 0, syncedCount, failedCount });
    }));
  }
}
