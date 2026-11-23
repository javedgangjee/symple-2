import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { BARE_SCREEN } from './app.routes';
import { SettingsPanel } from './settings/settings-panel';
import { Footer } from './shell/footer';
import { Header } from './shell/header';
import { ScreenTitle } from './shell/screen-title';

/**
 * The app shell. It lays out the header, the main area and the footer in three rows that fill the window.
 * A bare screen, such as the sign in screen, is drawn alone in the middle of the window.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, SettingsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: { '[class.bare]': 'bare()' },
})
export class App {
  private readonly router = inject(Router);

  protected readonly screenTitle = inject(ScreenTitle).title;

  /** Whether the screen on show is drawn with no header and no footer. The route says so in its data. */
  protected readonly bare = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.isBare()),
    ),
    { initialValue: this.isBare() },
  );

  private isBare(): boolean {
    return this.router.routerState.snapshot.root.firstChild?.data[BARE_SCREEN] === true;
  }
}
