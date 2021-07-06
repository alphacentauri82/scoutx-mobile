import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LoginComponent } from './login/login.component';

const components = [HeaderComponent, LoginComponent];
@NgModule({
  declarations: components,
  imports: [ CommonModule, FormsModule, IonicModule],
  exports: components
})
export class ComponentsModule { }
