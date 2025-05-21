import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class RegisterPage implements OnInit {
  user = {
    login: '',
    email: '',
    password: '',
    langKey: 'es'
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
  register() {
    this.authService.register(this.user)
      .subscribe({
        next: () => {
          this.presentToast('Registro exitoso', 'success');
          // Redirigir al login después de un registro exitoso
          this.router.navigate(['/login']);
        },
        error: error => {
          this.presentToast('Error en el registro', 'danger');
          console.error('Error al registrarse:', error);
        }
      });
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}
