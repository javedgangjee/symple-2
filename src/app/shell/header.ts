import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { EditMode } from '../edit/edit-mode';
import { SETTINGS_SHORTCUT } from '../scan/switches';
import { SettingsOpen } from '../settings/settings-open';
import { Logo } from './logo';

/**
 * The shared header. It shows the Symple icon, the screen title and the settings button.
 * The settings button is a caregiver control. A press on it opens the settings panel.
 * The button is hidden in edit mode, which ends with Done in the footer.
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

  protected readonly settings = inject(SettingsOpen);
  protected readonly edit = inject(EditMode);

  /** The keys that open the settings panel, as `aria-keyshortcuts` writes them. */
  protected readonly shortcut = SETTINGS_SHORTCUT;
}
