import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * A minus button, a value and a plus button. The settings panel sets each time and each amount
 * of the voice with one. The panel holds the value and says when it is at an end of its range.
 *
 * A button at the end of its range stays in the tab order, so the focus is not lost there.
 * It says it is disabled, and the panel ignores its press.
 */
@Component({
  selector: 'app-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stepper.html',
  styleUrl: './stepper.css',
  host: { role: 'group', '[attr.aria-labelledby]': 'labelledBy()' },
})
export class Stepper {
  /** The id of the element that names the value, such as the label of the row. */
  readonly labelledBy = input.required<string>();

  /** The name of the minus button, such as "Shorter scan time". */
  readonly less = input.required<string>();

  /** The name of the plus button, such as "Longer scan time". */
  readonly more = input.required<string>();

  /** Whether the value is at its lowest, so the minus button does nothing. */
  readonly atLowest = input.required<boolean>();

  /** Whether the value is at its highest, so the plus button does nothing. */
  readonly atHighest = input.required<boolean>();

  /** The value as it is drawn, such as "1.5 s". */
  readonly text = input.required<string>();

  /** The value as a screen reader hears it, such as "1.5 seconds", when that differs from the text. */
  readonly spoken = input<string>();

  /** A press on the minus button gives -1, and a press on the plus button gives 1. */
  readonly step = output<1 | -1>();
}
