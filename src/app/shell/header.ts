import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Logo } from './logo';

/**
 * The shared header. It shows the Symple icon, the screen title and the settings button.
 * The settings button is a caregiver control. It stays disabled until feature 7 adds the settings panel.
 */
@Component({
  selector: 'app-header',
  imports: [Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  /** The title of the current screen. */
  readonly title = input('');
}
