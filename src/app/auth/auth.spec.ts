import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { AUTH_SOURCE, Auth, READY_WAIT_MS, SIGNED_IN_STORAGE_KEY } from './auth';
import { FakeAuthSource } from './fake-auth-source';

describe('Auth', () => {
  let source: FakeAuthSource;
  let auth: Auth;

  beforeEach(() => {
    localStorage.clear();
    source = new FakeAuthSource();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AUTH_SOURCE, useValue: source }],
    });
    auth = TestBed.inject(Auth);
  });

  it('U1: the account is empty when the source reports no account', () => {
    source.report(null);
    expect(auth.account()).toBeNull();
  });

  it('U2: gives the id and the email of the account that the source reports', () => {
    source.report({ id: 'uid-anna', email: 'anna@example.com' });
    expect(auth.account()).toEqual({ id: 'uid-anna', email: 'anna@example.com' });
  });

  it('U3: a sign out calls the source and empties the account', async () => {
    source.report(FakeAuthSource.ACCOUNT);
    await auth.signOut();
    expect(source.signOuts).toBe(1);
    expect(auth.account()).toBeNull();
  });

  it('U4: goes to /sign-in when the account goes away while the needs board is open', async () => {
    const router = TestBed.inject(Router);
    source.report(FakeAuthSource.ACCOUNT);
    await router.navigateByUrl('/board/needs');
    expect(router.url).toBe('/board/needs');
    source.report(null);
    await vi.waitFor(() => expect(router.url).toBe('/sign-in'));
  });

  it('U9: the flag is set by a report of an account and cleared by a report of none', () => {
    source.report(FakeAuthSource.ACCOUNT);
    const flag = localStorage.getItem(SIGNED_IN_STORAGE_KEY);
    expect(flag).not.toBeNull();
    expect(flag).not.toContain(FakeAuthSource.ACCOUNT.id);
    expect(flag).not.toContain(String(FakeAuthSource.ACCOUNT.email));
    source.report(null);
    expect(localStorage.getItem(SIGNED_IN_STORAGE_KEY)).toBeNull();
  });
});

describe('Auth at a start with no report from the source', () => {
  let source: FakeAuthSource;

  /** Starts the service and says whether `ready()` has resolved after the wait. */
  async function start(wasSignedIn: boolean): Promise<{ auth: Auth; ready: boolean }> {
    if (wasSignedIn) {
      localStorage.setItem(SIGNED_IN_STORAGE_KEY, '1');
    }
    const auth = TestBed.inject(Auth);
    let ready = false;
    void auth.ready().then(() => (ready = true));
    await vi.advanceTimersByTimeAsync(READY_WAIT_MS);
    return { auth, ready };
  }

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    source = new FakeAuthSource();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AUTH_SOURCE, useValue: source }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('U5: a device that was signed in is ready after the wait, with no account yet', async () => {
    const { auth, ready } = await start(true);
    expect(ready).toBe(true);
    expect(auth.signedIn()).toBe(true);
    expect(auth.account()).toBeNull();
  });

  it('U6: a late report of no account goes to /sign-in and clears the flag', async () => {
    const { auth } = await start(true);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/board/needs');
    expect(router.url).toBe('/board/needs');
    vi.useRealTimers();
    source.report(null);
    await vi.waitFor(() => expect(router.url).toBe('/sign-in'));
    expect(auth.signedIn()).toBe(false);
    expect(localStorage.getItem(SIGNED_IN_STORAGE_KEY)).toBeNull();
  });

  it('U7: a late report of an account gives the account and keeps the route', async () => {
    const { auth } = await start(true);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/board/needs');
    source.report(FakeAuthSource.ACCOUNT);
    expect(auth.account()).toEqual(FakeAuthSource.ACCOUNT);
    // A move to another route gets time to start. It must not start.
    await vi.advanceTimersByTimeAsync(20);
    expect(router.url).toBe('/board/needs');
  });

  it('U8: a device that was not signed in keeps waiting for the source', async () => {
    const { auth, ready } = await start(false);
    expect(ready).toBe(false);
    expect(auth.signedIn()).toBe(false);
  });
});
