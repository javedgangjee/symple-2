import { TestBed } from '@angular/core/testing';
import { PICTURE_FILES, PictureList } from './picture-list';

describe('PictureList', () => {
  it('PL1: fetches each file once when the lists are asked for twice', async () => {
    const symbols = vi.fn(() => Promise.resolve([{ file: 'dog.svg', name: 'dog' }]));
    const icons = vi.fn(() => Promise.resolve([{ name: 'arrow-down' }]));
    TestBed.configureTestingModule({
      providers: [{ provide: PICTURE_FILES, useValue: { symbols, icons } }],
    });
    const list = TestBed.inject(PictureList);
    await list.symbols();
    await list.symbols();
    await list.icons();
    await list.icons();
    expect(symbols).toHaveBeenCalledTimes(1);
    expect(icons).toHaveBeenCalledTimes(1);
  });

  it('PL2: holds 2,098 icons, and arrow-down has the name "arrow down"', async () => {
    const icons = await TestBed.inject(PictureList).icons();
    expect(icons.length).toBe(2098);
    expect(icons).toContainEqual({ value: 'lucide:arrow-down', name: 'arrow down' });
  });
});
