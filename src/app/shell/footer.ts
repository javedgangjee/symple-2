import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditActions } from '../edit/edit-actions';
import { EditMode } from '../edit/edit-mode';

/**
 * The shared footer. It is empty and keeps its height, and in edit mode it holds the buttons
 * of board editing at its right edge.
 */
@Component({
  selector: 'app-footer',
  imports: [EditActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <!-- The code of the buttons is loaded when edit mode first turns on. -->
      @if (edit.isOn()) {
        @defer (on immediate) {
          <app-edit-actions />
        }
      }
    </footer>
  `,
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly edit = inject(EditMode);
}
