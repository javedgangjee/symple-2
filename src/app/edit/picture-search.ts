/** Anything the dialog can search by name, such as a symbol or an icon. */
export interface Named {
  readonly name: string;
}

/** Puts names in the order of the alphabet, without regard to case. */
const COLLATOR = new Intl.Collator('en', { sensitivity: 'base' });

/**
 * Finds the pictures whose name holds every word of the text, without regard to case. The text
 * is cut into words on white space. Names that begin with the trimmed text come first and the
 * rest follow. Each of the two parts is in the order of the alphabet. An empty text gives every
 * picture in the order of the alphabet. The list that goes in is not changed.
 */
export function searchPictures<T extends Named>(items: readonly T[], text: string): T[] {
  const phrase = text.trim().toLowerCase();
  const words = phrase.split(/\s+/).filter((word) => word !== '');
  const starts: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    if (!words.every((word) => name.includes(word))) {
      continue;
    }
    (name.startsWith(phrase) ? starts : rest).push(item);
  }
  const byName = (a: T, b: T) => COLLATOR.compare(a.name, b.name);
  return [...starts.sort(byName), ...rest.sort(byName)];
}
