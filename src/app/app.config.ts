import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ScreenTitle } from './shell/screen-title';
import { Theme } from './theme/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // The route title goes to the header. The page title in the browser stays "Symple".
    { provide: TitleStrategy, useExisting: ScreenTitle },
    // The theme is applied before the first screen is drawn.
    provideAppInitializer(() => inject(Theme).load()),
  ],
};
