import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The home screen. It is empty for now. Feature 2 fills it with cells from boards.json and tiles.json. */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class Home {}
