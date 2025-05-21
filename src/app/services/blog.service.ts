import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private apiUrl = `${environment.apiUrl}/blogs`;

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

  // Obtener todos los blogs
  getBlogs(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  // Obtener un blog por ID
  getBlog(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Crear un nuevo blog
  createBlog(blog: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, blog, { headers: this.getHeaders() });
  }

  // Actualizar un blog existente
  updateBlog(blog: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${blog.id}`, blog, { headers: this.getHeaders() });
  }

  // Eliminar un blog
  deleteBlog(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
