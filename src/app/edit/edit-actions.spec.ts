import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardData } from '../boards/board-data';
import { EditActions } from './edit-actions';
import { EditMode } from './edit-mode';
import { Room } from './room';

describe('EditActions', () => {
  let fixture: ComponentFixture<EditActions>;
  let element: HTMLElement;
  let edit: EditMode;
  let data: BoardData;

  /** Draws the buttons in edit mode over the board Needs of the built-in set. */
  async function draw(): Promise<void> {
    edit = TestBed.inject(EditMode);
    data = TestBed.inject(BoardData);
    edit.show('needs');
    edit.start();
    fixture = TestBed.createComponent(EditActions);
    await fixture.whenStable();
    element = fixture.nativeElement;
  }

  function button(name: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === name,
    );
    if (!found) {
      throw new Error(`There is no button named "${name}".`);
    }
    return found;
  }

  async function press(name: string): Promise<void> {
    button(name).click();
    await fixture.whenStable();
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('EA3: Done turns edit mode off', async () => {
    await draw();
    await press('Done');
    expect(edit.isOn()).toBe(false);
  });

  it('EA4: Add column gives the board one more group', async () => {
    await draw();
    expect(data.board('needs')?.groups.length).toBe(3);
    await press('Add column');
    expect(data.board('needs')?.groups.map((group) => group.cells.length)).toEqual([5, 4, 4, 0]);
    expect(edit.status().text).toBe('Column 4 added');
  });

  it('EA5: with no room for a cell, Add tile and Add board say they are disabled and why, and do nothing', async () => {
    await draw();
    TestBed.inject(Room).set({ cells: [false, false, false], group: true });
    await fixture.whenStable();
    const before = data.set();
    for (const name of ['Add tile', 'Add board']) {
      const add = button(name);
      expect(add.getAttribute('aria-disabled'), name).toBe('true');
      const line = element.querySelector(`#${add.getAttribute('aria-describedby')}`);
      expect(line?.textContent, name).toContain('Every column is full');
      await press(name);
      expect(edit.dialog(), name).toBeNull();
    }
    expect(data.set()).toBe(before);
    expect(button('Add column').getAttribute('aria-disabled')).toBe('false');
  });
});
