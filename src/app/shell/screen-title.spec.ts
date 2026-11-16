import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TitleStrategy, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ScreenTitle } from './screen-title';

@Component({ template: '' })
class Blank {}

describe('ScreenTitle', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Blank, title: 'Home' },
          { path: 'untitled', component: Blank },
        ]),
        { provide: TitleStrategy, useExisting: ScreenTitle },
      ],
    });
  });

  it('S1: gives the route title "Home" as the screen title', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(ScreenTitle).title()).toBe('Home');
  });

  it('S2: gives an empty screen title when the route has no title', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/untitled');
    expect(TestBed.inject(ScreenTitle).title()).toBe('');
  });
});
