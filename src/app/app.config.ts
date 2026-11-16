import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { Layout } from './layout/layout';
import { ScreenTitle } from './shell/screen-title';
import { Theme } from './theme/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The board screen takes the board id from the route as an input.
    provideRouter(routes, withComponentInputBinding()),
    // The route title goes to the header. The page title in the browser stays "Symple".
    { provide: TitleStrategy, useExisting: ScreenTitle },
    // The theme is applied before the first screen is drawn.
    provideAppInitializer(() => inject(Theme).load()),
    // The layout is read before the first screen is drawn.
    provideAppInitializer(() => inject(Layout).load()),
  ],
};
