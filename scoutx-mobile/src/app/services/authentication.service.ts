import firebase from 'firebase';

import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { StateClear } from 'ngxs-reset-plugin';
import { AppAction } from '../store/app.actions';
import { User } from '../models';
import { tap } from 'rxjs/operators';
import { Platform } from '@ionic/angular';
import { GooglePlus } from '@ionic-native/google-plus/ngx';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  constructor(

    private ngFireAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router,
    private store: Store,
    private platform: Platform,
    private gplus: GooglePlus
  ) {
  }

  async googleAuth() {
    let credential;
    if (this.platform.is('cordova')) {
      credential = await this.nativeGoogleLogin();
    } else {
      const provider = new firebase.auth.GoogleAuthProvider();
      credential = await this.ngFireAuth.signInWithPopup(provider);
    }

    const user: User = {
      uid: credential.user.uid,
      displayName: credential.user.displayName,
      email: credential.user.email,
      photoURL: credential.user.photoURL
    };

    return this.store
      .dispatch(new AppAction.SetUser(user))
      .pipe(tap(() => this.router.navigate(['/app'])))
      .subscribe();
  }

  async nativeGoogleLogin(): Promise<any> {
    console.log('TRYING NATIVE LOGIN 🔑');
    const options = {
      'webClientId': '194134917824-2k4co8fgpci2t1pkv4k7473i72uv2stk.apps.googleusercontent.com',
      'offline': true,
      'scopes': 'profile email'
    }
    const gplusUser = await this.gplus.login(options)
    return await this.ngFireAuth.signInWithCredential(
      firebase.auth.GoogleAuthProvider.credential(gplusUser.idToken)
    );
  }

  async signOut() {
    await this.ngFireAuth.signOut();
    await this.store.dispatch(new StateClear());
    return this.router.navigate(['/']);
  }

}
