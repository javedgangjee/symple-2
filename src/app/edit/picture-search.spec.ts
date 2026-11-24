import symbolsFile from '../../data/symbols.json';
import { searchPictures } from './picture-search';

/** Makes the items of a search from names. */
const named = (...names: string[]) => names.map((name) => ({ name }));

const NAMES = named('hot dog', 'dog', 'dog basket', 'cat');
const JUICE = named('apple juice', 'juice', 'apple');

/** The names of the matches, in order. */
const namesOf = (items: { name: string }[]) => items.map((item) => item.name);

describe('searchPictures', () => {
  it('PS1: puts the names that begin with the text first, then the rest in alphabetical order', () => {
    expect(namesOf(searchPictures(NAMES, 'dog'))).toEqual(['dog', 'dog basket', 'hot dog']);
  });

  it('PS2: ignores the case and the space around the text', () => {
    expect(namesOf(searchPictures(NAMES, ' DOG '))).toEqual(['dog', 'dog basket', 'hot dog']);
  });

  it('PS3: needs every word of the text in the name', () => {
    expect(namesOf(searchPictures(JUICE, 'juice apple'))).toEqual(['apple juice']);
  });

  it('PS4: lists every name in alphabetical order for an empty text', () => {
    expect(namesOf(searchPictures(JUICE, ''))).toEqual(['apple', 'apple juice', 'juice']);
  });

  it('PS5: gives nothing when no name matches', () => {
    expect(searchPictures(JUICE, 'zebra')).toEqual([]);
  });

  it('PS6: puts "Advent" first for "advent" in the 3,437 names of symbols.json', () => {
    expect(symbolsFile.length).toBe(3437);
    const found = namesOf(searchPictures(symbolsFile, 'advent'));
    expect(found[0]).toBe('Advent');
    expect(found).toContain('Advent calendar');
  });
});
