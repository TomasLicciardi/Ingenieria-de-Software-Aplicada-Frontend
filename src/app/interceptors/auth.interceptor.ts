import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { OfflineService } from '../services/offline.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService, 
    private router: Router,
    private offlineService: OfflineService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the token from the auth service
    const token = this.authService.getToken();
    
    // If token exists, clone the request and add the authorization header
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
      // Continue with the modified request
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si hay un error de red y estamos offline, mostrar el mensaje adecuado
        if (error.status === 0 && !navigator.onLine) {
          console.log('Request failed in offline mode', request.url);
          this.offlineService.showOfflineWarning();
          
          // Intentar obtener datos de la caché si es una petición GET
          if (request.method === 'GET') {
            // Se podría recuperar de la caché aquí o dejar que lo manejen los servicios
            return throwError(() => new Error('Estás en modo offline'));
          }
        }
        
        // Si recibimos un error 403 Forbidden en autenticación, proporcionar más detalles
        if (error.status === 403 && 
            (request.url.includes('/authenticate') || request.url.includes('/register'))) {
          console.error('Error de autenticación:', error);
          console.log('Cabeceras enviadas:', request.headers);
          return throwError(() => new Error('Error de permisos. Verifique sus credenciales o contacte al administrador.'));
        }
        
        // If we get a 401 Unauthorized response, redirect to login
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}
