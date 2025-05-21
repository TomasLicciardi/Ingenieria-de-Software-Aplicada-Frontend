import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;  private token: string | null = null;

  constructor(private http: HttpClient) {
    // Intenta recuperar el token del localStorage
    this.token = localStorage.getItem('authToken');
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
            return true;
          }
          return false;
        })
      );
  }

  register(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  logout(): void {
    // Elimina el token del usuario del localStorage
    localStorage.removeItem('authToken');
    this.token = null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
  getToken(): string | null {
    return this.token;
  }
}
