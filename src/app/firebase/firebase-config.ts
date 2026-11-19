import type { FirebaseOptions } from 'firebase/app';

/**
 * The web config of the Firebase project `symple-2`.
 * It is not a secret. It only names the project, and every web app ships its config to the browser.
 * Firebase Auth and the access rules in `firestore.rules` protect the data.
 */
export const firebaseConfig: FirebaseOptions = {
  projectId: 'symple-2',
  appId: '1:255678554384:web:543b586765cd42bd734595',
  storageBucket: 'symple-2.firebasestorage.app',
  apiKey: 'AIzaSyDtSksujAq9TU3OwynWOcGQsvVLrwvoNV4',
  authDomain: 'symple-2.firebaseapp.com',
  messagingSenderId: '255678554384',
};
