import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The shared footer. It is empty and keeps its height. Feature 9 puts the buttons of board
 * editing here. The Sign out button moved to the settings panel.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<footer></footer>`,
  styleUrl: './footer.css',
})
export class Footer {}
