import { Account, AuthFailure, AuthFailureKind, AuthSource } from './auth';

/** An auth source for the unit tests. It keeps the account in memory and records each call. */
export class FakeAuthSource implements AuthSource {
  private readonly listeners = new Set<(account: Account | null) => void>();

  /** The sign in calls made so far. */
  readonly signIns: { email: string; password: string }[] = [];
  /** The addresses that a reset email was asked for. */
  readonly resets: string[] = [];
  /** The number of sign out calls made so far. */
  signOuts = 0;

  /** The kind of failure that the next sign in or reset request ends with. */
  failWith: AuthFailureKind | null = null;
  /** When set, a sign in or reset request waits for this promise before it answers. */
  hold: Promise<void> | null = null;

  /** The account that a sign in that is accepted reports. */
  static readonly ACCOUNT: Account = { id: 'uid-anna', email: 'anna@example.com' };

  /** The last report. It is undefined until the stored sign in has been read. */
  private last: Account | null | undefined;

  /** Reports an account, or null, as Firebase does once it has read the stored sign in. */
  report(account: Account | null): void {
    this.last = account;
    for (const listener of this.listeners) {
      listener(account);
    }
  }

  /** A listener that starts after a report gets that report at once, as it does with Firebase. */
  watch(listener: (account: Account | null) => void): () => void {
    this.listeners.add(listener);
    if (this.last !== undefined) {
      listener(this.last);
    }
    return () => this.listeners.delete(listener);
  }

  async signIn(email: string, password: string): Promise<void> {
    this.signIns.push({ email, password });
    await this.answer();
    this.report({ id: FakeAuthSource.ACCOUNT.id, email });
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.resets.push(email);
    await this.answer();
  }

  async signOut(): Promise<void> {
    this.signOuts++;
    this.report(null);
  }

  private async answer(): Promise<void> {
    await this.hold;
    if (this.failWith) {
      throw new AuthFailure(this.failWith);
    }
  }
}
