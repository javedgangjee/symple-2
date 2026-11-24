import { Injectable, InjectionToken, inject } from '@angular/core';

/** A symbol of the list: the name of its file and the name the caregiver sees. */
export interface SymbolItem {
  readonly file: string;
  readonly name: string;
}

/** An icon of the list: the value a tile stores, such as `lucide:arrow-down`, and its name. */
export interface IconItem {
  readonly value: string;
  readonly name: string;
}

/** The two files of names, each behind a function that loads it. */
export interface PictureFiles {
  readonly symbols: () => Promise<readonly SymbolItem[]>;
  readonly icons: () => Promise<readonly { readonly name: string }[]>;
}

/**
 * Where the lists come from. A dynamic `import()` puts each file in a chunk of its own, so
 * neither file is in the first download. The tests replace this to count the loads.
 */
export const PICTURE_FILES = new InjectionToken<PictureFiles>('PICTURE_FILES', {
  providedIn: 'root',
  factory: () => ({
    symbols: () => import('../../data/symbols.json').then((module) => module.default),
    icons: () => import('../../data/lucide.json').then((module) => module.default),
  }),
});

/** The prefix of the value a tile stores for a Lucide icon. */
const ICON_PREFIX = 'lucide:';

/**
 * Gives the dialog the names of the symbols and of the icons. Each file is loaded the first
 * time it is asked for, and once only.
 */
@Injectable({ providedIn: 'root' })
export class PictureList {
  private readonly files = inject(PICTURE_FILES);
  private symbolsLoad?: Promise<readonly SymbolItem[]>;
  private iconsLoad?: Promise<readonly IconItem[]>;

  /** Every symbol, with the name of its file and its name. */
  symbols(): Promise<readonly SymbolItem[]> {
    this.symbolsLoad ??= this.files.symbols();
    return this.symbolsLoad;
  }

  /** Every Lucide icon, with its stored value and its name, the hyphens turned into spaces. */
  icons(): Promise<readonly IconItem[]> {
    this.iconsLoad ??= this.files.icons().then((icons) =>
      icons.map((icon) => ({
        value: ICON_PREFIX + icon.name,
        name: icon.name.replaceAll('-', ' '),
      })),
    );
    return this.iconsLoad;
  }
}
