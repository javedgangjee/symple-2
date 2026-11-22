import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { routes } from './app.routes';
import { AUTH_SOURCE, Auth } from './auth/auth';
import { FirebaseAuthSource } from './auth/firebase-auth-source';
import { Layout } from './layout/layout';
import { ScanSettings } from './scan/scan-settings';
import { ScreenTitle } from './shell/screen-title';
import { SystemVoiceSource } from './speech/system-voice-source';
import { VOICE_SOURCE } from './speech/voice-source';
import { CLOUD_STORE } from './sync/cloud-store';
import { FirestoreCloudStore } from './sync/firestore-cloud-store';
import { SettingsSync } from './sync/settings-sync';
import { Theme } from './theme/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // The board screen takes the board id from the route as an input.
      withComponentInputBinding(),
      // The first screen is chosen before the shell is drawn, so the header and the footer
      // never show for a moment around the sign in screen.
      withEnabledBlockingInitialNavigation(),
    ),
    // The route title goes to the header. The page title in the browser stays "Symple".
    { provide: TitleStrategy, useExisting: ScreenTitle },
    // Firebase Auth holds the caregiver accounts, and Firestore holds the cloud copy of the settings.
    { provide: AUTH_SOURCE, useClass: FirebaseAuthSource },
    { provide: CLOUD_STORE, useClass: FirestoreCloudStore },
    // The system voices speak the phrases and the message.
    { provide: VOICE_SOURCE, useClass: SystemVoiceSource },
    // The theme is applied before the first screen is drawn.
    provideAppInitializer(() => inject(Theme).load()),
    // The layout is read before the first screen is drawn.
    provideAppInitializer(() => inject(Layout).load()),
    // The scan settings are read before the first screen is drawn.
    provideAppInitializer(() => inject(ScanSettings).load()),
    // The stored sign in is read before the first screen is drawn.
    provideAppInitializer(() => inject(Auth).ready()),
    // The sync starts when the service is made.
    provideAppInitializer(() => void inject(SettingsSync)),
  ],
};
