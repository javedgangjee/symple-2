import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Back } from './back';

@Component({ template: '' })
class Blank {}

describe('Back', () => {
  let router: Router;
  let back: Back;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank },
          { path: 'board/:id', component: Blank },
        ]),
      ],
    });
    router = TestBed.inject(Router);
    // The service is made before the first screen opens, as it is in the app.
    back = TestBed.inject(Back);
  });

  it('K3: goes back one screen at a time', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/board/my-boards');
    await router.navigateByUrl('/board/food');
    await back.back();
    expect(router.url).toBe('/board/my-boards');
    await back.back();
    expect(router.url).toBe('/');
  });

  it('K4: goes home when the board was the first screen of the session', async () => {
    await router.navigateByUrl('/board/food');
    await back.back();
    expect(router.url).toBe('/');
  });

  it('K5: opening a screen that is already in the list does not build a loop', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/board/keyboard');
    await router.navigateByUrl('/board/keyboard-numbers');
    await router.navigateByUrl('/board/keyboard');
    await back.back();
    expect(router.url).toBe('/');
  });

  it('K6: a second press of Back before the first has ended does not skip a screen', async () => {
    await router.navigateByUrl('/');
    await router.navigateByUrl('/board/my-boards');
    await router.navigateByUrl('/board/food');
    void back.back();
    await back.back();
    expect(router.url).toBe('/board/my-boards');
    await back.back();
    expect(router.url).toBe('/');
  });
});
