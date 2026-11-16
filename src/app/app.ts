import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shell/footer';
import { Header } from './shell/header';
import { ScreenTitle } from './shell/screen-title';

/** The app shell. It lays out the header, the main area and the footer in three rows that fill the window. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly screenTitle = inject(ScreenTitle).title;
}
