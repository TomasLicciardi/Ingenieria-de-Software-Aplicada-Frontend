import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { ServiceWorkerModule } from '@angular/service-worker';
import { ServiceWorkerUpdateService } from './services/service-worker-update.service';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule, ServiceWorkerModule.register('ngsw-worker.js', {
  enabled: !isDevMode(),
  // Aumentamos el tiempo para hacer el registro del ServiceWorker
  // para evitar actualizaciones demasiado frecuentes
  registrationStrategy: 'registerWhenStable:60000'
})],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    ServiceWorkerUpdateService
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
