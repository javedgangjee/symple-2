import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The shared footer. It is empty for now, and its height keeps room for caregiver buttons in later features. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<footer></footer>',
  styleUrl: './footer.css',
})
export class Footer {}
