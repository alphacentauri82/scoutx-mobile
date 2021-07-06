import { Component, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Scout } from '../models';
import { AppState } from '../store/app.state';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { AppAction } from '../store/app.actions';

@Component({
  selector: 'settings',
  templateUrl: 'settings-page.component.html',
  styleUrls: ['settings-page.component.scss']
})
export class SettingsPage implements OnInit {

  settingsForm: FormGroup;

  get emergencyNumbers() {
    return this.settingsForm.get('emergencyNumbers') as FormArray;
  }

  constructor(private formBuilder: FormBuilder,
              private toastController: ToastController,
              private store: Store) {
  }

  ngOnInit() {
    const settings: Scout = this.store.selectSnapshot(AppState.scout);
    this.settingsForm = this.formBuilder.group({
      nightScoutURL: [settings?.nightScoutURL || '', Validators.required],
      phoneNumber: [settings?.phoneNumber || '', Validators.required],
      minBG: [settings?.minBG || '', Validators.required],
      maxBG: [settings?.maxBG || '', Validators.required],
      emergencyNumbers: new FormArray([], [Validators.required, Validators.minLength(1)])
    });

    if (settings?.emergencyNumbers && settings?.emergencyNumbers.length) {
      settings.emergencyNumbers.map((emergencyNumber: string) => {
        this.emergencyNumbers.push(this.formBuilder.control(emergencyNumber));
      })
    } else {
      this.emergencyNumbers.push(this.formBuilder.control(''));
    }
  }

  addContact() {
    this.emergencyNumbers.push(this.formBuilder.control(''));
  }

  removeContact(index) {
    this.emergencyNumbers.removeAt(index);
  }

  inValid(field: string): boolean {
    return this.settingsForm.get(field).invalid && this.settingsForm.get(field).touched;
  }

  async successMessage() {
    const toast = await this.toastController.create({
      message: 'Your settings have been saved.',
      duration: 4000
    });
    await toast.present();
  }

  async onSubmit() {
    this.settingsForm.markAllAsTouched();
    if (this.settingsForm.invalid) {
      return;
    }
    this.store.dispatch(new AppAction.UpdateScout(this.settingsForm.value));
    this.successMessage();
  }
}
