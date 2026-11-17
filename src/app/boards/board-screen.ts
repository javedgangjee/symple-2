import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Cell as CellButton } from '../cells/cell';
import { Message } from '../keyboard/message';
import { Layout } from '../layout/layout';
import { Back } from './back';
import { BoardData, Cell, Group, HOME_BOARD_ID, NAMED_SIZES, Tile } from './board-data';

/**
 * Draws one board: one element for each group and one cell for each entry, in the order of the data.
 * The home screen is this screen with the `home` board.
 */
@Component({
  selector: 'app-board-screen',
  imports: [CellButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board-screen.html',
  styleUrl: './board-screen.css',
})
export class BoardScreen {
  private readonly data = inject(BoardData);
  private readonly router = inject(Router);
  private readonly back = inject(Back);
  private readonly message = inject(Message);
  protected readonly layout = inject(Layout);

  /** The id of the board to draw. The router sets it from the address. */
  readonly id = input(HOME_BOARD_ID);

  protected readonly board = computed(() => this.data.board(this.id()));

  /**
   * The text that screen readers hear after a press: the phrase of a cell, or the message.
   * Each press gets a new number, so the page changes even when the text is the same as before.
   */
  protected readonly status = signal({ text: '', press: 0 });

  private say(text: string): void {
    this.status.update((said) => ({ text, press: said.press + 1 }));
  }

  /**
   * The share of its group that a cell takes. A size given as a number is that many parts, and
   * the named sizes are on the same scale. A cell with no size counts as medium when another cell
   * of its group has a size. When no cell of the group has one, they all share it equally.
   */
  protected share(group: Group, cell: Cell): number {
    if (typeof cell.size === 'number') {
      return cell.size;
    }
    if (cell.size !== undefined) {
      return NAMED_SIZES[cell.size];
    }
    return group.cells.some((other) => other.size !== undefined) ? NAMED_SIZES.medium : 1;
  }

  protected onPress(tile: Tile): void {
    const action = tile.action;
    switch (action?.type) {
      case 'open':
        this.say('');
        void this.router.navigate(['/board', action.board]);
        break;
      case 'back':
        this.say('');
        void this.back.back();
        break;
      case 'speak':
        // Feature 5 adds the speech. Until then only screen readers get the phrase.
        this.say(action.phrase);
        break;
      case 'type':
        this.message.type(action.text);
        this.say(this.message.text());
        break;
      case 'backspace':
        this.message.backspace();
        this.say(this.message.text());
        break;
      case 'clear':
        this.message.clear();
        this.say(this.message.text());
        break;
      case 'caps':
        this.message.toggleCaps();
        break;
      default:
        // A tile with no action does nothing. The message tile is one until feature 5.
        break;
    }
  }
}
