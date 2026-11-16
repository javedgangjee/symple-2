import { Routes } from '@angular/router';
import { Home } from './home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'Home' },
  // Any unknown path opens the home screen.
  { path: '**', redirectTo: '' },
];
