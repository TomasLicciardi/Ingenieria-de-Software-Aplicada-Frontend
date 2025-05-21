import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/posts`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
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

  // Obtener todos los posts
  getPosts(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtener un post por ID
  getPost(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crear un nuevo post
  createPost(post: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, post, { headers: this.getHeaders() });
  }

  // Actualizar un post existente
  updatePost(post: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${post.id}`, post, { headers: this.getHeaders() });
  }

  // Eliminar un post
  deletePost(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Obtener posts de un blog específico
  getPostsByBlog(blogId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?blogId.equals=${blogId}`, { headers: this.getHeaders() });
  }
}
