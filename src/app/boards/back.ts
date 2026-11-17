import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Keeps the list of screens opened in this session and goes back one step.
 * The app keeps its own list, so Back never leaves the app the way the browser's history could.
 * The board screen injects this service, so it exists before the first screen has finished opening.
 */
@Injectable({ providedIn: 'root' })
export class Back {
  private readonly router = inject(Router);

  /** The addresses of the screens opened so far. The last one is the screen on show. */
  private readonly trail: string[] = [];

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        // A screen is in the list once. Opening one that is already there cuts the list back to it,
        // so going back or switching between two keyboards never builds a loop.
        const seen = this.trail.indexOf(url);
        if (seen === -1) {
          this.trail.push(url);
        } else {
          this.trail.length = seen + 1;
        }
      });
  }

  /** Goes to the previous screen, or to home when this is the first screen of the session. */
  back(): Promise<boolean> {
    // The list changes only when a navigation ends, so a second press that arrives
    // before then asks for the same screen and does not skip one.
    const previous = this.trail.at(-2);
    if (previous === undefined) {
      // No screen came before this one. The list starts again from home.
      this.trail.length = 0;
      return this.router.navigateByUrl('/');
    }
    return this.router.navigateByUrl(previous);
  }
}
