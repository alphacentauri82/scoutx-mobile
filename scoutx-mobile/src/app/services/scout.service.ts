import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { Coordinates, Scout } from '../models';
import { Observable } from 'rxjs';
import firebase from 'firebase';
import DocumentSnapshot = firebase.firestore.DocumentSnapshot;

@Injectable({
  providedIn: 'root'
})
export class ScoutService {

  constructor(private firestore: AngularFirestore) {}

  updateScout(uid: string, settings: Scout): Promise<void> {
    const scoutxRef: AngularFirestoreDocument<Scout> = this.firestore.doc(`scoutx/${uid}`);
    return scoutxRef.set(settings, { merge: true });
  }

  getUserScout(uid: string): Observable<DocumentSnapshot<Scout>> {
    return this.firestore.doc<Scout>(`scoutx/${uid}`).get();
  }

  updateCoordinates(uid: string, coordinates: Coordinates): Promise<void> {
    const scoutxRef: AngularFirestoreDocument<Scout> = this.firestore.doc(`scoutx/${uid}`);
    return scoutxRef.update({ coordinates: coordinates });
  }

}
