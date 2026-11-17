import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { AUTH_SOURCE, READY_WAIT_MS, SIGNED_IN_STORAGE_KEY } from './auth';
import { FakeAuthSource } from './fake-auth-source';

describe('The sign in guards', () => {
  let source: FakeAuthSource;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    source = new FakeAuthSource();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AUTH_SOURCE, useValue: source }],
    });
    router = TestBed.inject(Router);
  });

  it('G1: with no account the home route goes to /sign-in', async () => {
    source.report(null);
    await router.navigateByUrl('/');
    expect(router.url).toBe('/sign-in');
  });

  it('G2: with no account board/needs goes to /sign-in', async () => {
    source.report(null);
    await router.navigateByUrl('/board/needs');
    expect(router.url).toBe('/sign-in');
  });

  it('G3: with an account the home route opens', async () => {
    source.report(FakeAuthSource.ACCOUNT);
    expect(await router.navigateByUrl('/')).toBe(true);
    expect(router.url).toBe('/');
  });

  it('G4: with an account /sign-in goes to the home route', async () => {
    source.report(FakeAuthSource.ACCOUNT);
    await router.navigateByUrl('/board/needs');
    await router.navigateByUrl('/sign-in');
    expect(router.url).toBe('/');
  });

  it('G5: with no account /sign-in opens', async () => {
    source.report(null);
    expect(await router.navigateByUrl('/sign-in')).toBe(true);
    expect(router.url).toBe('/sign-in');
  });

  it('G6: the guard gives no answer until the source has read the stored sign in', async () => {
    let answered = false;
    const navigation = router.navigateByUrl('/board/needs').then(() => (answered = true));
    // The guard gets time to answer. It must still be waiting after it.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(answered).toBe(false);
    source.report(FakeAuthSource.ACCOUNT);
    await navigation;
    expect(router.url).toBe('/board/needs');
  });

  describe('on a device that was signed in before, with no report from the source', () => {
    beforeEach(() => {
      localStorage.setItem(SIGNED_IN_STORAGE_KEY, '1');
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });

    afterEach(() => {
      vi.useRealTimers();
      localStorage.clear();
    });

    it('G7: the home route opens after the wait', async () => {
      let answered = false;
      const navigation = router.navigateByUrl('/').then(() => (answered = true));
      await vi.advanceTimersByTimeAsync(READY_WAIT_MS - 1);
      expect(answered).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await navigation;
      expect(router.url).toBe('/');
    });

    it('G8: /sign-in goes to the home route after the wait', async () => {
      const navigation = router.navigateByUrl('/sign-in');
      await vi.advanceTimersByTimeAsync(READY_WAIT_MS);
      await navigation;
      expect(router.url).toBe('/');
    });
  });
});
