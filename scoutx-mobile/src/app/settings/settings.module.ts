import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SettingsPage } from './settings-page.component';
import { SettingsPageRoutingModule } from './settings-routing.module';
import { ComponentsModule } from '../components/components.module';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ComponentsModule,
    SettingsPageRoutingModule,
    ReactiveFormsModule
  ],
  declarations: [SettingsPage]
})
export class SettingsModule {}
