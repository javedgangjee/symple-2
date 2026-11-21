import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Auth } from '../auth/auth';

/**
 * The shared footer. It holds the caregiver buttons.
 * The Sign out button is here until feature 8 moves it into the settings panel.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer>
      <!-- A caregiver control is not in the tab order, so Tab never leaves the grid. -->
      <button
        class="sign-out"
        type="button"
        data-caregiver-control
        tabindex="-1"
        (click)="signOut()"
      >
        Sign out
      </button>
    </footer>
  `,
  styleUrl: './footer.css',
})
export class Footer {
  private readonly auth = inject(Auth);

  /** Signs the caregiver out. The auth service then opens the sign in screen. */
  protected signOut(): void {
    // A sign out only clears the sign in stored on this device, so there is no failure to show.
    void this.auth.signOut().catch(() => undefined);
  }
}
