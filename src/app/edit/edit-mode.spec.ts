import { TestBed } from '@angular/core/testing';
import { Scan } from '../scan/scan';
import { ScanSettings } from '../scan/scan-settings';
import { Switches } from '../scan/switches';
import { EditMode } from './edit-mode';

describe('EditMode', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('EM4: after edit mode turns off, Enter starts the scan at the first group', () => {
    TestBed.inject(ScanSettings).set({ selectionMode: 'step' });
    const edit = TestBed.inject(EditMode);
    const scan = TestBed.inject(Scan);
    const switches = TestBed.inject(Switches);
    const enter = () =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    scan.show([2, 2]);
    switches.start();
    try {
      edit.start();
      TestBed.tick();
      enter();
      expect(scan.state().phase).toBe('rest');

      edit.stop();
      TestBed.tick();
      expect(scan.state().phase).toBe('rest');
      enter();
      expect(scan.state()).toEqual({ phase: 'groups', group: 0, cell: null });
    } finally {
      switches.stop();
    }
  });

  it('EM5: edit mode that turns on again does not tell the last change of the session before', () => {
    const edit = TestBed.inject(EditMode);
    edit.start();
    edit.tell('Pain removed');
    edit.stop();
    edit.start();
    expect(edit.status().text).toBe('');
  });
});
