import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The Symple app icon from the mockup. It is black and white in every theme, with a soft shadow. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="40 30 360 396" role="img" aria-label="Symple">
      <path
        d="M110 30H282Q300 30 313 42L384 108Q400 123 400 144V300A70 70 0 0 1 330 370H258L232 414Q220 432 208 414L182 370H110A70 70 0 0 1 40 300V100A70 70 0 0 1 110 30Z"
      />
      <text x="220" y="272" font-size="210" text-anchor="middle">S</text>
      <rect x="152" y="306.5" width="136" height="8" rx="4" />
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      height: 48px;
      width: auto;
      overflow: visible;
      filter: drop-shadow(0 1px 1px oklch(0 0 0 / 0.1)) drop-shadow(0 3px 5px oklch(0 0 0 / 0.14));
    }
    path {
      fill: #000;
    }
    text {
      fill: #fff;
      font-weight: 760;
    }
    rect {
      fill: #fff;
    }
  `,
})
export class Logo {}
