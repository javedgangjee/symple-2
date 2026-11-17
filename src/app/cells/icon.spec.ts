import { TestBed } from '@angular/core/testing';
import { ICON_NAMES } from '../boards/board-data';
import { Icon } from './icon';

describe('Icon', () => {
  it('I1: every icon name has a drawing', async () => {
    for (const name of ICON_NAMES) {
      const fixture = TestBed.createComponent(Icon);
      fixture.componentRef.setInput('name', name);
      await fixture.whenStable();
      const svg: SVGElement | null = fixture.nativeElement.querySelector('svg');
      expect(svg?.querySelectorAll('path, rect, circle').length, name).toBeGreaterThan(0);
      fixture.destroy();
    }
  });
});
