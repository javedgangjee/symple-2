import { Injectable, signal } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Takes the title of the current route and keeps it for the header.
 * It replaces the router's default title strategy, so the page title in the browser stays "Symple".
 */
@Injectable({ providedIn: 'root' })
export class ScreenTitle extends TitleStrategy {
  private readonly current = signal('');

  /** The title of the current screen. It is empty when the route has no title. */
  readonly title = this.current.asReadonly();

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.current.set(this.buildTitle(snapshot) ?? '');
  }
}
