import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconName } from '../boards/board-data';

/**
 * Draws one line icon by name. The drawings live here and the data names one,
 * because an icon is a drawing and not board content.
 * Every drawing is copied from the Lucide icon set, version 1.77.0, used under the ISC License.
 * Each case names the Lucide icon it copies. The licence text ships in public/licenses/lucide.txt.
 * The icon is hidden from screen readers, because the cell carries the name.
 */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      @switch (name()) {
        @case ('board') {
          <!-- Lucide layout-grid. -->
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        }
        @case ('heart') {
          <!-- Lucide heart. -->
          <path
            d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"
          />
        }
        @case ('chat') {
          <!-- Lucide message-square-text. -->
          <path
            d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
          />
          <path d="M7 11h10" />
          <path d="M7 15h6" />
          <path d="M7 7h8" />
        }
        @case ('keyboard') {
          <!-- Lucide keyboard. -->
          <path d="M10 8h.01" />
          <path d="M12 12h.01" />
          <path d="M14 8h.01" />
          <path d="M16 12h.01" />
          <path d="M18 8h.01" />
          <path d="M6 8h.01" />
          <path d="M7 16h10" />
          <path d="M8 12h.01" />
          <rect width="20" height="16" x="2" y="4" rx="2" />
        }
        @case ('back') {
          <!-- Lucide arrow-left. -->
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        }
        @case ('backspace') {
          <!-- Lucide delete. -->
          <path
            d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"
          />
          <path d="m12 9 6 6" />
          <path d="m18 9-6 6" />
        }
        @case ('trash') {
          <!-- Lucide trash-2. -->
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        }
        @case ('check') {
          <!-- Lucide check. -->
          <path d="M20 6 9 17l-5-5" />
        }
        @case ('cross') {
          <!-- Lucide x. -->
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        }
        @case ('restaurant') {
          <!-- Lucide utensils. -->
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
          <path d="M7 2v20" />
          <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
        }
        @case ('cafe') {
          <!-- Lucide coffee. -->
          <path d="M10 2v2" />
          <path d="M14 2v2" />
          <path
            d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
          />
          <path d="M6 2v2" />
        }
        @case ('mood') {
          <!-- Lucide smile. -->
          <path d="M15 10V9" />
          <path d="M16.472 15a6 6 0 01-8.943 0" />
          <path d="M9 10V9" />
          <circle cx="12" cy="12" r="10" />
        }
        @case ('group') {
          <!-- Lucide users. -->
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <path d="M16 3.128a4 4 0 0 1 0 7.744" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <circle cx="9" cy="7" r="4" />
        }
        @case ('place') {
          <!-- Lucide map-pin. -->
          <path
            d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
          />
          <circle cx="12" cy="10" r="3" />
        }
        @case ('game') {
          <!-- Lucide gamepad-2. -->
          <line x1="6" x2="10" y1="11" y2="11" />
          <line x1="8" x2="8" y1="9" y2="13" />
          <line x1="15" x2="15.01" y1="12" y2="12" />
          <line x1="18" x2="18.01" y1="10" y2="10" />
          <path
            d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"
          />
        }
        @case ('thumbs') {
          <!-- Lucide thumbs-up. -->
          <path
            d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"
          />
          <path d="M7 10v12" />
        }
        @case ('apps') {
          <!-- Lucide grip. -->
          <circle cx="12" cy="5" r="1" />
          <circle cx="19" cy="5" r="1" />
          <circle cx="5" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
          <circle cx="19" cy="19" r="1" />
          <circle cx="5" cy="19" r="1" />
        }
        @case ('caps') {
          <!-- Lucide arrow-big-up. -->
          <path
            d="M9 19a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6a1 1 0 0 1 1-1h3.293a.707.707 0 0 0 .5-1.207l-7.086-7.086a1 1 0 0 0-1.414 0l-7.086 7.086a.707.707 0 0 0 .5 1.207H8a1 1 0 0 1 1 1z"
          />
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
