import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../boards/board-data';

/**
 * Draws one line icon by name. The drawings live here and the data names one,
 * because an icon is a drawing and not board content.
 * Board, heart, chat and keyboard are copied from context/design/home.html.
 * Backspace and caps are copied from the keyboard mockup. Back is drawn new in the same style.
 * The icon is hidden from screen readers, because the cell carries the name.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      @switch (name()) {
        @case ('board') {
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        }
        @case ('heart') {
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          />
        }
        @case ('chat') {
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 8h8M8 12h5" />
        }
        @case ('keyboard') {
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path
            d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"
          />
        }
        @case ('back') {
          <path d="M19 12H5M12 19l-7-7 7-7" />
        }
        @case ('backspace') {
          <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2ZM18 9l-6 6M12 9l6 6" />
        }
        @case ('caps') {
          <path d="M9 18v-6H5l7-7 7 7h-4v6H9z" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    /* The cell sets the size, the colour and the line width on the host. */
    svg {
      display: block;
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class Icon {
  /** The name of the icon to draw. */
  readonly name = input.required<IconName>();
}
