import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class LoginPage implements OnInit {
  credentials = {
    username: '',
    password: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Si ya está autenticado, redirigir a la página principal
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/blogs']);
    }
  }
  login() {
    this.authService.login(this.credentials.username, this.credentials.password)
      .subscribe({
        next: success => {
          if (success) {
            this.router.navigate(['/blogs']);
          } else {
            this.presentToast('Credenciales incorrectas');
          }
        },
        error: error => {
          this.presentToast('Error de autenticación');
          console.error('Error al iniciar sesión:', error);
        }
      });
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'danger'
    });
    toast.present();
  }
}
