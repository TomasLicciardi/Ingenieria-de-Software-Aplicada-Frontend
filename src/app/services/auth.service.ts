import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;  
  private token: string | null = null;
  private currentUser: any = null;

  constructor(private http: HttpClient) {
    // Intenta recuperar el token del localStorage
    this.token = localStorage.getItem('authToken');
    
    // Intenta recuperar información del usuario
    const userInfo = localStorage.getItem('currentUser');
    if (userInfo) {
      this.currentUser = JSON.parse(userInfo);
    }
  }
  login(username: string, password: string): Observable<boolean> {
    return this.http.post<any>(`${this.apiUrl}/authenticate`, { username, password })
      .pipe(
        map(response => {
          // Login exitoso si hay un token jwt en la respuesta
          if (response && response.id_token) {
            // Almacena el token del usuario
            localStorage.setItem('authToken', response.id_token);
            this.token = response.id_token;
            
            // Después de autenticarse, obtenemos la información del usuario
            this.getCurrentUserInfo().subscribe({
              next: (userData) => {
                this.currentUser = userData;
                localStorage.setItem('currentUser', JSON.stringify(userData));
              },
              error: (error) => console.error('Error al obtener información del usuario:', error)
            });
            
            return true;
          }
          return false;
        })
      );
  }
  
  // Obtener información del usuario actual
  getCurrentUserInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/account`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }
  logout(): void {
    // Elimina el token del usuario del localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.token = null;
    this.currentUser = null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
  
  getToken(): string | null {
    return this.token;
  }
  
  getCurrentUser(): any {
    return this.currentUser;
  }
  
  getUserLogin(): string {
    return this.currentUser ? this.currentUser.login : '';
  }
}
