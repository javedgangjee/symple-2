import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Tile } from '../boards/board-data';
import { Message } from '../keyboard/message';
import { Icon } from './icon';

/**
 * One cell of a board. It is a button that takes its colour, its hue and its style from its tile
 * and reports a press to its screen. The host is the box that the label and the icon are sized from.
 */
@Component({
  selector: 'app-cell',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cell.html',
  styleUrl: './cell.css',
})
export class Cell {
  protected readonly message = inject(Message);

  /** The tile that this cell shows. */
  readonly tile = input.required<Tile>();

  /** Tells the screen that the cell was pressed. */
  readonly press = output<Tile>();

  protected readonly label = computed(() => {
    const { label, action } = this.tile();
    return action?.type === 'type' && action.text === label ? this.message.cased(label) : label;
  });

  /** The name for screen readers. The message tile is named by the message once there is one. */
  protected readonly name = computed(() => {
    const tile = this.tile();
    if (tile.style === 'message') {
      return this.message.text() || tile.label;
    }
    return tile.name ?? this.label();
  });

  /** Only the Caps lock key says whether it is pressed. */
  protected readonly pressed = computed(() =>
    this.tile().action?.type === 'caps' ? this.message.caps() : null,
  );

  protected readonly classes = computed(() => {
    const tile = this.tile();
    // A key that carries a word takes a smaller label than a key that carries one sign.
    const word = tile.style === 'key' && [...tile.label].length > 1 ? 'word' : '';
    return `cell ${tile.colour} ${tile.hue ?? ''} ${tile.style} ${word}`
      .replace(/\s+/g, ' ')
      .trim();
  });
}
