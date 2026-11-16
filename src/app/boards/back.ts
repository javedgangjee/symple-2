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
        // Going back lands on the screen that is already last in the list, so it is not added twice.
        if (this.trail.at(-1) !== url) {
          this.trail.push(url);
        }
      });
  }

  /** Goes to the previous screen, or to home when this is the first screen of the session. */
  back(): Promise<boolean> {
    this.trail.pop();
    return this.router.navigateByUrl(this.trail.at(-1) ?? '/');
  }
}
