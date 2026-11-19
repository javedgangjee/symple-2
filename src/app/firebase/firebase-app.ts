import { InjectionToken } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { firebaseConfig } from './firebase-config';

/**
 * The Firebase app. It is started once, the first time a source asks for it,
 * and the auth source and the cloud store share it.
 */
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP', {
  providedIn: 'root',
  factory: () => initializeApp(firebaseConfig),
});
