import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BlogsPageRoutingModule } from './blogs-routing.module';

import { BlogsPage } from './blogs.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BlogsPageRoutingModule,
    BlogsPage // importar en lugar de declarar
  ],
  declarations: [] // Sin declaraciones
})
export class BlogsPageModule {}
